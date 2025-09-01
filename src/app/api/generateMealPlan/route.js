
// app/api/generateMealPlan/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  const session = await requireAuth();

  try {
    const body = await req.json();
    const { gender, heightFt, heightIn, weight, fitnessGoal, dietaryPreferences = [], mealsPerDay, allergies } = body;

    // Calculate this week's dates (Sunday → Saturday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek);
    sunday.setHours(0, 0, 0, 0);

    const datesThisWeek = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      datesThisWeek.push(d.toISOString().split("T")[0]);
    }

    const mealPlans = [];

    for (const date of datesThisWeek) {
      // Fetch the most recent meal plans from previous days to provide context
      const recentPlans = await prisma.mealPlan.findMany({
        where: {
          userId: session.user.id,
          date: { lt: new Date(date) }, // only previous days
        },
        orderBy: { createdAt: 'desc' },
        take: 7, // look back up to 7 previous plans
        include: { meals: true },
      });

      const previousMealsSummary = recentPlans.map(plan =>
        plan.meals.map(m => `${m.type}: ${m.name}`).join(", ")
      ).join(" | ");

      const prompt = {
        role: "user",
        content: `
      Generate a meal plan for the day (${date}) for a person with these attributes:
      - Gender: ${gender}
      - Height: ${heightFt}ft ${heightIn}in
      - Weight: ${weight} lbs
      - Fitness Goal: ${fitnessGoal}
      - Dietary Preferences: ${dietaryPreferences.join(", ")}
      - Meals per day: ${mealsPerDay}
      - allergies (avoid completely): ${allergies}

      IMPORTANT:
      - NEVER include any foods or ingredients listed in the allergies/dietary preferences.
      - Try your hardest to give foods in the dietary preferences
      - Reference previous meals to avoid repetition and increase variety:
      ${previousMealsSummary || "none"}

      Provide detailed instructions for each recipe and ensure all meals are safe, goal-appropriate, and varied.

      Return ONLY a JSON object with these fields (no commentary, no code fences):
      {
        "title": "string",
        "description": "string",
        "totalCalories": integer,
        "meals": [
          {
            "name": "string",
            "type": "breakfast|lunch|dinner|snack",
            "calories": integer,
            "protein": number,
            "carbs": number,
            "fat": number,
            "ingredients": ["string", ...],
            "recipe": "string"
          }
        ]
      }
      `
      };

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [prompt],
        temperature: 0.8,
      });

      let content = completion.choices?.[0]?.message?.content ?? "{}";
      try { content = JSON.parse(content); } catch { content = {}; }

      // Save to database
      const created = await prisma.mealPlan.create({
        data: {
          userId: session.user.id,
          title: content.title || `Meal Plan ${date}`,
          description: content.description || "",
          totalCalories: content.totalCalories || null,
          date: new Date(date),
          meals: {
            create: (content.meals || []).map(m => ({
              name: m.name,
              type: m.type,
              calories: m.calories,
              protein: m.protein,
              carbs: m.carbs,
              fat: m.fat,
              ingredients: m.ingredients || [],
              recipe: m.recipe || "",
            })),
          },
        },
      });

      mealPlans.push(created);
    }

    return NextResponse.json(mealPlans, { status: 200 });
  } catch (err) {
    console.error("Failed to generate meal plans", err);
    return NextResponse.json({ error: "Failed to generate meal plans" }, { status: 500 });
  }
}
