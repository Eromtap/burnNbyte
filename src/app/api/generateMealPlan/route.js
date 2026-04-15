import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { describeDietaryPreferences } from "@/constants/dietaryPreferences";
import { describeFitnessGoals, normalizeFitnessGoals } from "@/constants/fitnessGoals";
import { summarizeMealFeedbackForPrompt } from "@/lib/mealFeedback";
import { deriveNutritionTargets } from "@/lib/nutritionTargets";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MEALPLAN_SCHEMA = {
  name: "meal_plans",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["mealPlans"],
    properties: {
      mealPlans: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["date", "title", "description", "totalCalories", "meals"],
          properties: {
            date: { type: "string" }, // yyyy-mm-dd
            title: { type: "string" },
            description: { type: "string" },
            totalCalories: { anyOf: [{ type: "integer" }, { type: "number" }] },
            meals: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                additionalProperties: false,
                required: [
                  "name",
                  "type",
                  "calories",
                  "costPerServing",
                  "protein",
                  "carbs",
                  "fat",
                  "ingredients",
                  "recipe"
                ],
                properties: {
                  name: { type: "string" },
                  type: { enum: ["breakfast", "lunch", "dinner", "snack"] },
                  calories: { anyOf: [{ type: "integer" }, { type: "number" }] },
                  costPerServing: { anyOf: [{ type: "integer" }, { type: "number" }] },
                  protein: { anyOf: [{ type: "integer" }, { type: "number" }] },
                  carbs:   { anyOf: [{ type: "integer" }, { type: "number" }] },
                  fat:     { anyOf: [{ type: "integer" }, { type: "number" }] },
                  ingredients: { type: "array", items: { type: "string" } },
                  recipe: { type: "string" }
                }
              }
            }
          }
        }
      }
    }
  }
};

function toISO(d) {
  const x = new Date(d);
  x.setUTCHours(0,0,0,0);
  return x.toISOString().slice(0,10);
}
function normalizeDate(d) {
  const x = new Date(d ?? Date.now());
  x.setUTCHours(0,0,0,0);
  return x;
}
function datesInclusive({ startDate, endDate, numDays }) {
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setUTCHours(0,0,0,0);
    end.setUTCHours(0,0,0,0);
    const out = [];
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate()+1)) {
      out.push(toISO(d));
    }
    return out;
  }
  // fallback: numDays from today
  const days = Math.max(1, Math.min(31, Number(numDays || 7)));
  const base = new Date();
  base.setUTCHours(0,0,0,0);
  const out = [];
  for (let i=0;i<days;i++){
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate()+i);
    out.push(toISO(d));
  }
  return out;
}

function normalizeOptionalTarget(value, { integer = false } = {}) {
  const parsed = integer ? parseInt(value, 10) : parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return integer ? Math.round(parsed) : parsed;
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      // user meta
      gender,
      heightFt,
      heightIn,
      weight,
      activityLevel,
      fitnessGoal,
      fitnessGoals,
      mealsPerDay = 3,
      macroTargetMode,
      calorieTarget,
      proteinTarget,
      carbsTarget,
      fatTarget,
      proteinPctTarget,
      carbsPctTarget,
      fatPctTarget,
      dietaryPreferences = [],
      dislikedFoods = [],
      mealPrepMode = false,
      allergies = [],
      // range controls: pass either (startDate+endDate) or numDays
      startDate,         // "yyyy-mm-dd" optional
      endDate,           // "yyyy-mm-dd" optional
      numDays            // number of consecutive days starting today
    } = body;

    // Normalize preferences that may arrive as comma-separated strings
    const normArray = (v) => Array.isArray(v)
      ? v
      : (typeof v === 'string' ? v.split(',').map(s=>s.trim()).filter(Boolean) : []);
    const prefsDiet = normArray(dietaryPreferences);
    const prefsDietFriendly = describeDietaryPreferences(prefsDiet);
    const prefsDislikes = normArray(dislikedFoods);
    const prefsAllergies = normArray(allergies);
    const goalList = normalizeFitnessGoals(fitnessGoals ?? fitnessGoal);
    const macroTargets = deriveNutritionTargets({
      weight,
      activityLevel,
      fitnessGoal,
      fitnessGoals: goalList,
      macroTargetMode,
      calorieTarget: normalizeOptionalTarget(calorieTarget, { integer: true }),
      proteinTarget: normalizeOptionalTarget(proteinTarget),
      carbsTarget: normalizeOptionalTarget(carbsTarget),
      fatTarget: normalizeOptionalTarget(fatTarget),
      proteinPctTarget: normalizeOptionalTarget(proteinPctTarget),
      carbsPctTarget: normalizeOptionalTarget(carbsPctTarget),
      fatPctTarget: normalizeOptionalTarget(fatPctTarget),
    });
    const primaryGoal = goalList[0] || (typeof fitnessGoal === "string" ? fitnessGoal : "");
    const goalFriendly = describeFitnessGoals(goalList);
    const mealFeedback = typeof prisma.mealFeedback?.findMany === "function"
      ? await prisma.mealFeedback.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          take: 200,
        })
      : [];
    const {
      dislikedMeals,
      likedMeals,
      recentLikedMeals,
    } = summarizeMealFeedbackForPrompt(mealFeedback);

    if (!primaryGoal) {
      return NextResponse.json({ error: "Missing required field: fitnessGoal" }, { status: 400 });
    }

    const targetDates = datesInclusive({ startDate, endDate, numDays });
    if (!targetDates.length) {
      return NextResponse.json({ error: "No dates to generate" }, { status: 400 });
    }

    const prompt = {
      role: "user",
      content: `
You are a nutrition planner. Generate daily meal plans for ALL of these calendar dates (one plan per date):
${JSON.stringify(targetDates)}

User:
- gender: ${JSON.stringify(gender ?? null)}
- heightFt: ${JSON.stringify(heightFt ?? null)}
- heightIn: ${JSON.stringify(heightIn ?? null)}
- weight: ${JSON.stringify(weight ?? null)}
- fitnessGoals: ${JSON.stringify(goalFriendly.length ? goalFriendly : goalList.length ? goalList : [primaryGoal])}
- mealsPerDay: ${mealsPerDay}
- macroTargetMode: ${JSON.stringify(macroTargetMode || macroTargets.mode || 'grams')}
- dailyCalorieTarget: ${JSON.stringify(macroTargets.calories)}
- dailyMacroTargetsInGrams: ${JSON.stringify({
  protein: macroTargets.protein,
  carbs: macroTargets.carbs,
  fat: macroTargets.fat,
})}
- dailyMacroTargetsPercent: ${JSON.stringify({
  protein: macroTargets.proteinPct,
  carbs: macroTargets.carbsPct,
  fat: macroTargets.fatPct,
})}
- mealPrepMode: ${JSON.stringify(Boolean(mealPrepMode))}
- dietaryPreferences (soft, emphasize these foods/cuisines): ${JSON.stringify(prefsDietFriendly.length ? prefsDietFriendly : prefsDiet)}
- dislikedFoods (soft avoid): ${JSON.stringify(prefsDislikes)}
- allergies/exclusions (HARD AVOID): ${JSON.stringify(prefsAllergies)}
- dislikedMeals from direct user feedback (soft avoid strongly): ${JSON.stringify(dislikedMeals)}
- likedMeals older than 14 days (good candidates to bring back selectively): ${JSON.stringify(likedMeals)}
- likedMeals from the last 14 days (avoid exact repeats unless mealPrepMode is true): ${JSON.stringify(recentLikedMeals)}

Rules:
- For EVERY listed date, return EXACTLY ${mealsPerDay} meals.
- Treat dailyCalorieTarget and dailyMacroTargetsInGrams as planning goals, not exact hard requirements.
- If dailyCalorieTarget is provided, keep each day's totalCalories close to that goal, usually within about 5-10%.
- If any daily macro targets are provided, keep the day's summed protein/carbs/fat close to those goals while still making realistic meals.
- If no explicit calorie or macro target is provided, infer a sensible distribution from the user's goals.
- Absolutely avoid any allergens. NEVER include any of: ${prefsAllergies.join(', ')}.
- Prefer dietaryPreferences without violating allergies and try to spotlight at least one of them in each day's plan.
- Soft-avoid any dislikedFoods while still meeting the other constraints.
- If the user has a cost-conscious preference, bias toward budget-friendly ingredients like oats, rice, beans, eggs, potatoes, yogurt, frozen vegetables, canned tuna, and economical proteins when they fit the rest of the goals.
- Include a realistic AI-estimated "costPerServing" in USD for every meal.
- Strongly avoid meals the user explicitly disliked unless a close variant is necessary to satisfy hard constraints.
- If mealPrepMode is false, do not repeat the exact same recently liked meals from the last 14 days.
- If mealPrepMode is true, prefer batch-cook, fridge-friendly, reheat-friendly meals that can be eaten repeatedly through the work week.
- If mealPrepMode is true, it is acceptable for lunches and dinners to repeat across multiple weekdays when that improves meal prep practicality.
- If mealPrepMode is false, you may reuse older liked meals selectively, but keep the plan feeling varied.
- Each recipe must be a single string of 3-6 numbered steps (e.g., "1. Preheat skillet...") separated by line breaks so a beginner can follow prep through serving.
- Dates MUST match the provided list and use ISO yyyy-mm-dd.
- Respond ONLY with JSON that matches the provided schema (no prose, no fences).

Output shape:
{
  "mealPlans": [
    {
      "date": "yyyy-mm-dd",
      "title": "string",
      "description": "string",
      "totalCalories": 0,
      "meals": [
        {
          "name": "string",
          "type": "breakfast|lunch|dinner|snack",
          "calories": 0,
          "costPerServing": 0,
          "protein": 0,
          "carbs": 0,
          "fat": 0,
          "ingredients": ["item (qty, unit)", "..."],
          "recipe": "1. Preheat oven to 400 F.\\n2. Toss veggies with olive oil and roast 18 min.\\n3. Plate with quinoa and drizzle yogurt sauce."
        }
      ]
    }
  ]
}
`.trim()
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [prompt],
      response_format: { type: "json_schema", json_schema: MEALPLAN_SCHEMA },
      temperature: 0.6
    });

    let content = completion.choices?.[0]?.message?.content ?? "";
    if (!content) return NextResponse.json({ error: "Empty model response" }, { status: 502 });
    if (content.trim().startsWith("```")) {
      content = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    }

    let ai;
    try {
      ai = JSON.parse(content);
    } catch (e) {
      console.error("❌ Failed to parse AI JSON:", content);
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // sanity: ensure we got 1 plan per requested date
    if (!Array.isArray(ai.mealPlans) || ai.mealPlans.length !== targetDates.length) {
      return NextResponse.json({ error: "Model returned unexpected number of days" }, { status: 502 });
    }

    const userId = session.user.id;

    // ✅ Interactive transaction without compound upsert (for older Prisma clients)
    const saved = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const p of ai.mealPlans) {
        const date = normalizeDate(p.date);
        const existing = await tx.mealPlan.findFirst({ where: { userId, date } });
        let plan;
        if (existing) {
          plan = await tx.mealPlan.update({
            where: { id: existing.id },
            data: {
              title: p.title || `Meal Plan ${p.date}`,
              description: p.description || "",
              totalCalories: Number(p.totalCalories) || null
            }
          });
          await tx.meal.deleteMany({ where: { mealPlanId: existing.id } });
        } else {
          plan = await tx.mealPlan.create({
            data: {
              userId,
              date,
              title: p.title || `Meal Plan ${p.date}`,
              description: p.description || "",
              totalCalories: Number(p.totalCalories) || null
            }
          });
        }

        const mealData = (p.meals || []).map((m) => ({
          mealPlanId: plan.id,
          name: m.name,
          type: m.type,
          calories: Number(m.calories) || null,
          costPerServing: Number(m.costPerServing) || null,
          protein: Number(m.protein) || null,
          carbs: Number(m.carbs) || null,
          fat: Number(m.fat) || null,
          ingredients: Array.isArray(m.ingredients) ? m.ingredients : [],
          recipe: m.recipe || ""
        }));

        if (mealData.length) {
          await tx.meal.createMany({ data: mealData });
        }
        results.push(plan);
      }
      return results;
    });

    return NextResponse.json({ ok: true, count: saved.length, dates: targetDates }, { status: 200 });
  } catch (error) {
    console.error("💥 generateMealPlan error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
