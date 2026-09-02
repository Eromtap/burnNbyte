import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAppApiSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { describeDietaryPreferences } from "@/constants/dietaryPreferences";
import { describeFitnessGoals, normalizeFitnessGoals } from "@/constants/fitnessGoals";
import { summarizeMealFeedbackForPrompt } from "@/lib/mealFeedback";
import { deriveNutritionTargets } from "@/lib/nutritionTargets";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 90000,
  maxRetries: 0,
});

const MEALPLAN_SCHEMA = {
  name: "pantry_meal_plans",
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
            date: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            totalCalories: { anyOf: [{ type: "integer" }, { type: "number" }] },
            meals: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["name", "type", "calories", "costPerServing", "protein", "carbs", "fat", "ingredients", "recipe"],
                properties: {
                  name: { type: "string" },
                  type: { enum: ["breakfast", "lunch", "dinner", "snack"] },
                  calories: { anyOf: [{ type: "integer" }, { type: "number" }] },
                  costPerServing: { anyOf: [{ type: "integer" }, { type: "number" }] },
                  protein: { anyOf: [{ type: "integer" }, { type: "number" }] },
                  carbs: { anyOf: [{ type: "integer" }, { type: "number" }] },
                  fat: { anyOf: [{ type: "integer" }, { type: "number" }] },
                  ingredients: { type: "array", items: { type: "string" } },
                  recipe: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
};

function toBase64(buf) {
  return Buffer.from(buf).toString("base64");
}

function toISO(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

function normalizeDate(d) {
  const x = new Date(d ?? Date.now());
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function normalizeTargetDates(input) {
  const raw = Array.isArray(input)
    ? input
    : (typeof input === "string" && input ? [input] : []);
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const date = String(item || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (seen.has(date)) continue;
    seen.add(date);
    out.push(date);
  }
  return out.sort();
}

function datesInclusive({ startDate, endDate }) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);
  const out = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(toISO(d));
  }
  return out;
}

export async function POST(req) {
  try {
    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const form = await req.formData();
    const startDate = String(form.get("startDate") || "").slice(0, 10);
    const endDate = String(form.get("endDate") || "").slice(0, 10);
    const explicitTargetDates = normalizeTargetDates(form.getAll("targetDates"));
    const unitSystem = String(form.get("unitSystem") || "imperial");
    const sourcingMode = String(form.get("sourcingMode") || "pantry_plus_groceries");

    if (!explicitTargetDates.length && (!startDate || !endDate)) {
      return NextResponse.json({ error: "Missing date range." }, { status: 400 });
    }

    let photos = form.getAll("photos").filter(Boolean);
    const legacy = form.get("photo");
    if ((!photos || photos.length === 0) && legacy) photos = [legacy];
    photos = (photos || []).filter((file) => typeof file !== "string").slice(0, 3);
    if (!photos.length) {
      return NextResponse.json({ error: "No images provided. Include 1-3 pantry or fridge photos." }, { status: 400 });
    }

    const requestedTargetDates = explicitTargetDates.length
      ? explicitTargetDates
      : datesInclusive({ startDate, endDate });
    const todayISO = toISO(new Date());
    const targetDates = requestedTargetDates.filter((date) => date >= todayISO);
    if (!targetDates.length) {
      return NextResponse.json({ error: "Choose today or a future date to generate a meal plan." }, { status: 400 });
    }

    const profile = await prisma.userProfile.findUnique({ where: { userId: String(session.user.id) } });
    const dietaryPreferences = Array.isArray(profile?.dietaryPreferences) ? profile.dietaryPreferences : [];
    const dislikedFoods = Array.isArray(profile?.dislikedFoods) ? profile.dislikedFoods : [];
    const mealPrepMode = Boolean(profile?.mealPrepMode);
    const dietaryPrefFriendly = describeDietaryPreferences(dietaryPreferences);
    const allergies = typeof profile?.allergies === "string"
      ? profile.allergies.split(",").map((item) => item.trim()).filter(Boolean)
      : Array.isArray(profile?.allergies) ? profile.allergies : [];
    const fitnessGoal = profile?.fitnessGoal || null;
    const fitnessGoals = Array.isArray(profile?.fitnessGoals) ? profile.fitnessGoals : [];
    const goalList = normalizeFitnessGoals(fitnessGoals.length ? fitnessGoals : fitnessGoal);
    const goalFriendly = describeFitnessGoals(goalList);
    const goalForPrompt = goalFriendly.length ? goalFriendly : (goalList.length ? goalList : (fitnessGoal ? [fitnessGoal] : []));
    const macroTargets = deriveNutritionTargets(profile || {});
    const mealFeedback = typeof prisma.mealFeedback?.findMany === "function"
      ? await prisma.mealFeedback.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          take: 200,
        })
      : [];
    const { dislikedMeals, likedMeals, recentLikedMeals } = summarizeMealFeedbackForPrompt(mealFeedback);

    const dataUrls = [];
    for (const photo of photos) {
      const arrayBuffer = await photo.arrayBuffer();
      dataUrls.push(`data:${photo.type || "image/jpeg"};base64,${toBase64(arrayBuffer)}`);
    }

    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: dataUrls.map((url) => ({ type: "image_url", image_url: { url } })),
    });
    const blocked = (Array.isArray(moderation?.results) ? moderation.results : []).some((result) => {
      const categories = result?.categories || {};
      return result?.flagged
        || categories?.sexual
        || categories?.["sexual/minors"]
        || categories?.nudity
        || categories?.["nudity/sexual"];
    });
    if (blocked) {
      return NextResponse.json(
        { error: "Image blocked by content safety checks. Please upload a food photo.", code: "moderation_blocked" },
        { status: 400 }
      );
    }

    const mealsPerDay = Number(profile?.mealsPerDay || 3);

    const prompt = {
      role: "user",
      content: [
        {
          type: "text",
          text: [
            "You are a nutrition planner.",
            `Analyze these pantry or fridge photos and identify recognizable edible items.`,
            `Generate daily meal plans for ALL of these calendar dates (one plan per date): ${JSON.stringify(targetDates)}`,
            sourcingMode === "pantry_only"
              ? `Use only the visible items plus basic staples only when absolutely necessary (salt, pepper, water, common oil). Do not assume a grocery trip.`
              : `Primarily use the visible items, but you may add a small number of realistic grocery items when needed to complete meals.`,
            `- mealsPerDay: ${mealsPerDay}`,
            `- fitnessGoals: ${JSON.stringify(goalForPrompt)}`,
            `- dailyCalorieTarget: ${JSON.stringify(macroTargets.calories)}`,
            `- dailyMacroTargetsInGrams: ${JSON.stringify({ protein: macroTargets.protein, carbs: macroTargets.carbs, fat: macroTargets.fat })}`,
            `- dietaryPreferences (soft): ${JSON.stringify(dietaryPrefFriendly.length ? dietaryPrefFriendly : dietaryPreferences)}`,
            `- dislikedFoods (soft avoid): ${JSON.stringify(dislikedFoods)}`,
            `- allergies (HARD AVOID): ${JSON.stringify(allergies)}`,
            `- mealPrepMode: ${JSON.stringify(mealPrepMode)}`,
            `- dislikedMeals from explicit feedback (strong soft avoid): ${JSON.stringify(dislikedMeals)}`,
            `- likedMeals older than 14 days: ${JSON.stringify(likedMeals)}`,
            `- recentLikedMeals to avoid repeating unless mealPrepMode is true: ${JSON.stringify(recentLikedMeals)}`,
            `- units: ${unitSystem}`,
            `- sourcingMode: ${sourcingMode}`,
            mealPrepMode
              ? `- if mealPrepMode is true, prefer batch-cook, storage-friendly meals that can be repeated for several weekday servings`
              : `- if mealPrepMode is false, keep the plan varied`,
            `- include a realistic AI-estimated costPerServing in USD for every meal`,
            `- recipe instructions: provide a single string of 3-6 numbered steps`,
            `- if a calorie target is provided, keep each day reasonably close to it`,
            `- if macro targets are provided, keep each day reasonably close while staying realistic`,
            "Respond ONLY with JSON that matches the provided schema; no prose.",
          ].join("\n"),
        },
        ...dataUrls.map((url) => ({ type: "image_url", image_url: { url } })),
      ],
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [prompt],
      response_format: { type: "json_schema", json_schema: MEALPLAN_SCHEMA },
      temperature: 0.4,
    });

    let content = completion.choices?.[0]?.message?.content ?? "";
    if (content.trim().startsWith("```")) {
      content = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    }

    let ai;
    try {
      ai = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
    }

    if (!Array.isArray(ai?.mealPlans) || ai.mealPlans.length !== targetDates.length) {
      return NextResponse.json({ error: "Model returned unexpected number of days" }, { status: 502 });
    }

    const userId = session.user.id;
    const saved = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const planData of ai.mealPlans) {
        const date = normalizeDate(planData.date);
        const existing = await tx.mealPlan.findFirst({ where: { userId, date } });
        let plan;
        if (existing) {
          plan = await tx.mealPlan.update({
            where: { id: existing.id },
            data: {
              title: planData.title || `Meal Plan ${planData.date}`,
              description: planData.description || "",
              totalCalories: Number(planData.totalCalories) || null,
            },
          });
          await tx.meal.deleteMany({ where: { mealPlanId: existing.id } });
        } else {
          plan = await tx.mealPlan.create({
            data: {
              userId,
              date,
              title: planData.title || `Meal Plan ${planData.date}`,
              description: planData.description || "",
              totalCalories: Number(planData.totalCalories) || null,
            },
          });
        }

        const meals = (planData.meals || []).map((meal) => ({
          mealPlanId: plan.id,
          name: meal.name,
          type: meal.type,
          calories: Number(meal.calories) || null,
          costPerServing: Number(meal.costPerServing) || null,
          protein: Number(meal.protein) || null,
          carbs: Number(meal.carbs) || null,
          fat: Number(meal.fat) || null,
          ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
          recipe: meal.recipe || "",
        }));
        if (meals.length) {
          await tx.meal.createMany({ data: meals });
        }
        results.push(plan);
      }
      return results;
    });

    return NextResponse.json({ ok: true, count: saved.length, dates: targetDates, sourcingMode });
  } catch (error) {
    console.error("pantry/generateMealPlan error:", error);
    const timedOut = error?.name === 'APIConnectionTimeoutError';
    return NextResponse.json(
      { error: timedOut ? "Pantry meal generation timed out. Please try again." : (error.message || "Server error") },
      { status: timedOut ? 504 : 500 }
    );
  }
}
