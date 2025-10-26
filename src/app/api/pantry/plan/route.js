import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import OpenAI from "openai";

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
    const unitSystem = (form.get("unitSystem") || "imperial").toString();
    const days = Math.min(7, Math.max(1, Number(form.get("days") || 3)));

    // Support up to 3 images. Prefer 'photos' (multi) but allow legacy 'photo'.
    let photos = form.getAll("photos").filter(Boolean);
    const legacy = form.get("photo");
    if ((!photos || photos.length === 0) && legacy) photos = [legacy];
    photos = (photos || []).filter((f) => typeof f !== "string");
    if (!photos.length) {
      return NextResponse.json({ error: "No images provided. Include 1-3 files named 'photos'." }, { status: 400 });
    }
    if (photos.length > 3) photos = photos.slice(0, 3);

    // Pull preferences
    const profile = await prisma.userProfile.findUnique({ where: { userId: String(session.user.id) } });
    const dietaryPreferences = Array.isArray(profile?.dietaryPreferences) ? profile.dietaryPreferences : [];
    // allergies stored as string in schema; split to array defensively
    const allergies = typeof profile?.allergies === "string"
      ? profile.allergies.split(",").map(s=>s.trim()).filter(Boolean)
      : Array.isArray(profile?.allergies) ? profile.allergies : [];
    const fitnessGoal = profile?.fitnessGoal || null;

    // Convert images to data URLs
    const dataUrls = [];
    for (const file of photos) {
      const arrayBuffer = await file.arrayBuffer();
      const b64 = toBase64(arrayBuffer);
      dataUrls.push(`data:${file.type || "image/jpeg"};base64,${b64}`);
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const PLAN_SCHEMA = {
      name: "pantry_meals",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["ingredients", "meals"],
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
                estimatedQuantity: { type: "string" }
              }
            }
          },
          meals: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              // Strict schema: required must include every key in properties
              required: ["name", "type", "calories", "protein", "carbs", "fat", "ingredients", "recipe"],
              properties: {
                name: { type: "string" },
                type: { enum: ["breakfast", "lunch", "dinner", "snack"] },
                calories: { anyOf: [{ type: "integer" }, { type: "number" }] },
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
    };

    const prompt = {
      role: "user",
      content: [
        { type: "text", text: [
          "You are a nutrition assistant.",
          `Analyze the pantry photo and list recognizable edible items (ingredients).`,
          `Then propose ${days} meals that primarily use those items and respect these constraints:`,
          `- fitnessGoal: ${JSON.stringify(fitnessGoal)}`,
          `- dietaryPreferences (soft): ${JSON.stringify(dietaryPreferences)}`,
          `- allergies (HARD AVOID): ${JSON.stringify(allergies)}`,
          `- units: ${unitSystem}`,
          "Respond ONLY with JSON that matches the provided schema; no prose."
        ].join("\n") },
        ...dataUrls.map((u) => ({ type: "image_url", image_url: { url: u } }))
      ]
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [prompt],
      response_format: { type: "json_schema", json_schema: PLAN_SCHEMA },
      temperature: 0.4
    });

    let content = completion.choices?.[0]?.message?.content ?? "";
    if (content.trim().startsWith("```")) {
      content = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    }
    let out;
    try { out = JSON.parse(content); }
    catch { return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 }); }

    return NextResponse.json({ unitSystem, days, ...out });
  } catch (err) {
    console.error("pantry/plan POST failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
