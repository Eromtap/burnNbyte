import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import OpenAI from "openai";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { describeDietaryPreferences } from "@/constants/dietaryPreferences";
import { describeFitnessGoals, normalizeFitnessGoals } from "@/constants/fitnessGoals";
import { summarizeMealFeedbackForPrompt } from "@/lib/mealFeedback";
import { deriveNutritionTargets } from "@/lib/nutritionTargets";

export const runtime = "nodejs";

function toBase64(buf) {
  return Buffer.from(buf).toString("base64");
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const mealType = String(form.get("type") || "dinner").toLowerCase();
    const unitSystem = String(form.get("unitSystem") || "imperial");

    let photos = form.getAll("photos").filter(Boolean);
    const legacy = form.get("photo");
    if ((!photos || photos.length === 0) && legacy) photos = [legacy];
    photos = (photos || []).filter((file) => typeof file !== "string").slice(0, 3);
    if (!photos.length) {
      return NextResponse.json({ error: "No images provided. Include 1-3 pantry photos." }, { status: 400 });
    }

    const profile = await prisma.userProfile.findUnique({ where: { userId: String(session.user.id) } });
    const dietaryPreferences = Array.isArray(profile?.dietaryPreferences) ? profile.dietaryPreferences : [];
    const dislikedFoods = Array.isArray(profile?.dislikedFoods) ? profile.dislikedFoods : [];
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

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    if (!openai.apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY server env var" }, { status: 500 });
    }

    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: dataUrls.map((url) => ({ type: "image_url", image_url: { url } })),
    });
    const results = Array.isArray(moderation?.results) ? moderation.results : [];
    const blocked = results.some((result) => {
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

    const SCHEMA = {
      name: "pantry_single_meal",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["ingredients", "meal"],
        properties: {
          ingredients: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "estimatedQuantity"],
              properties: {
                name: { type: "string" },
                estimatedQuantity: { type: "string" },
              },
            },
          },
          meal: {
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
    };

    const prompt = {
      role: "user",
      content: [
        {
          type: "text",
          text: [
            "You are a nutrition assistant.",
            `Analyze these pantry or fridge photos and identify recognizable edible items.`,
            `Then create exactly one ${mealType} meal that primarily uses what is visible.`,
            `Respect these constraints:`,
            `- fitnessGoals: ${JSON.stringify(goalForPrompt)}`,
            `- calorieTarget: ${JSON.stringify(macroTargets.calories)}`,
            `- macroTargetsInGrams: ${JSON.stringify({ protein: macroTargets.protein, carbs: macroTargets.carbs, fat: macroTargets.fat })}`,
            `- dietaryPreferences (soft): ${JSON.stringify(dietaryPrefFriendly.length ? dietaryPrefFriendly : dietaryPreferences)}`,
            `- dislikedFoods (soft avoid): ${JSON.stringify(dislikedFoods)}`,
            `- allergies (HARD AVOID): ${JSON.stringify(allergies)}`,
            `- dislikedMeals from explicit feedback (strong soft avoid): ${JSON.stringify(dislikedMeals)}`,
            `- likedMeals older than 14 days: ${JSON.stringify(likedMeals)}`,
            `- recentLikedMeals to avoid repeating unless necessary: ${JSON.stringify(recentLikedMeals)}`,
            `- units: ${unitSystem}`,
            `- include a realistic AI-estimated costPerServing in USD`,
            `- recipe instructions: provide a single string of 3-6 numbered steps`,
            `- set the meal type exactly to ${mealType}`,
            "Respond ONLY with JSON matching the schema; no prose.",
          ].join("\n"),
        },
        ...dataUrls.map((url) => ({ type: "image_url", image_url: { url } })),
      ],
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [prompt],
      response_format: { type: "json_schema", json_schema: SCHEMA },
      temperature: 0.4,
    });

    let content = completion.choices?.[0]?.message?.content ?? "";
    if (content.trim().startsWith("```")) {
      content = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    }

    let out;
    try {
      out = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
    }

    return NextResponse.json({ unitSystem, ...out });
  } catch (err) {
    console.error("pantry/meal POST failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
