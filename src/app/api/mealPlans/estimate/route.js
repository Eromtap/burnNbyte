import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAppApiSession } from "@/lib/auth";

export const runtime = "nodejs";

function toBase64(buf) {
  return Buffer.from(buf).toString("base64");
}

const ESTIMATE_SCHEMA = {
  name: "tracked_meal_estimate",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "name",
      "calories",
      "costPerServing",
      "protein",
      "carbs",
      "fat",
      "ingredients",
      "recipe",
      "notes",
    ],
    properties: {
      name: { type: "string" },
      calories: { anyOf: [{ type: "integer" }, { type: "number" }] },
      costPerServing: { anyOf: [{ type: "integer" }, { type: "number" }] },
      protein: { anyOf: [{ type: "integer" }, { type: "number" }] },
      carbs: { anyOf: [{ type: "integer" }, { type: "number" }] },
      fat: { anyOf: [{ type: "integer" }, { type: "number" }] },
      ingredients: { type: "array", items: { type: "string" } },
      recipe: { type: "string" },
      notes: { type: "string" },
    },
  },
};

export async function POST(req) {
  try {
    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const form = await req.formData();
    const description = String(form.get("description") || "").trim();
    const portionNote = String(form.get("portionNote") || "").trim();
    const mealType = String(form.get("type") || "snack").trim().toLowerCase();
    const photo = form.get("photo");
    const hasPhoto = photo && typeof photo !== "string";

    if (!description && !hasPhoto) {
      return NextResponse.json({ error: "Add a description, a photo, or both." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 90000, maxRetries: 0 });
    if (!openai.apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY server env var" }, { status: 500 });
    }

    const content = [
      {
        type: "text",
        text: [
          "You are a nutrition assistant helping a user log a meal or snack.",
          "Estimate calories, protein, carbs, fat, ingredients, and a realistic U.S. grocery cost for the consumed portion only.",
          "The result should be usable as a meal tracker entry, not a generated meal plan.",
          "If the user provides a description, trust it over visual ambiguity.",
          `Meal category hint: ${mealType}.`,
          description ? `User description: ${description}` : "",
          portionNote ? `Optional portion note: ${portionNote}` : "",
          "Return a short meal name.",
          "List 2-12 likely ingredients.",
          "Use recipe as a brief preparation or composition note only if it is obvious; otherwise return an empty string.",
          "Use notes to explain any key assumption, especially portion size uncertainty.",
          "Respond only with JSON matching the schema.",
        ].filter(Boolean).join("\n"),
      },
    ];

    if (hasPhoto) {
      const arrayBuffer = await photo.arrayBuffer();
      const dataUrl = `data:${photo.type || "image/jpeg"};base64,${toBase64(arrayBuffer)}`;

      const moderation = await openai.moderations.create({
        model: "omni-moderation-latest",
        input: [{ type: "image_url", image_url: { url: dataUrl } }],
      });
      const result = moderation?.results?.[0] || {};
      const categories = result?.categories || {};
      const flagged = result?.flagged
        || categories?.sexual
        || categories?.["sexual/minors"]
        || categories?.nudity
        || categories?.["nudity/sexual"];

      if (flagged) {
        return NextResponse.json(
          { error: "Image blocked by content safety checks. Please upload a food photo.", code: "moderation_blocked" },
          { status: 400 }
        );
      }

      content.push({ type: "image_url", image_url: { url: dataUrl } });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [{ role: "user", content }],
      response_format: { type: "json_schema", json_schema: ESTIMATE_SCHEMA },
      temperature: 0.2,
    });

    let raw = completion.choices?.[0]?.message?.content ?? "";
    if (raw.trim().startsWith("```")) {
      raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    }

    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("mealPlans/estimate POST failed", err);
    const timedOut = err?.name === "APIConnectionTimeoutError";
    return NextResponse.json(
      { error: timedOut ? "Meal estimation took too long. Please try again." : "Failed to estimate meal." },
      { status: timedOut ? 504 : 500 }
    );
  }
}
