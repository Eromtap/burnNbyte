import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import OpenAI from "openai";

export const runtime = "nodejs";

function toUTCDateFromLocalYMD(ymd) {
  const [y, m, d] = String(ymd || "").split("-").map(Number);
  return new Date(Date.UTC(y || 0, (m || 1) - 1, d || 1));
}

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
    const photo = form.get("photo");
    if (!photo || typeof photo === "string") {
      return NextResponse.json({ error: "No image provided. Include a file named 'photo'." }, { status: 400 });
    }

    const type = (form.get("type") || "dinner").toString().toLowerCase();
    const dateIso = (form.get("date") || "").toString().slice(0, 10);
    const baseUtc = toUTCDateFromLocalYMD(dateIso);
    const portion = (form.get("portion") || "medium").toString().toLowerCase();
    const portionNote = (form.get("portionNote") || "").toString();
    const portionHint = (() => {
      if (portion === "small") return "Portion size hint: small / light portion (~0.6x standard).";
      if (portion === "large") return "Portion size hint: large portion (~1.5-2x standard).";
      if (portionNote) return `Portion size hint: ${portionNote}`;
      return "Portion size hint: medium / standard portion unless the photo shows otherwise.";
    })();

    const arrayBuffer = await photo.arrayBuffer();
    const b64 = toBase64(arrayBuffer);
    const dataUrl = `data:${photo.type || "image/jpeg"};base64,${b64}`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    if (!openai.apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY server env var" }, { status: 500 });
    }

    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: [{ type: "image_url", image_url: { url: dataUrl } }]
    });
    const flagged = moderation?.results?.[0]?.flagged;
    if (flagged) {
      return NextResponse.json({ error: "Image failed content safety checks." }, { status: 400 });
    }

    const MEAL_SCHEMA = {
      name: "meal_macros",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["name", "calories", "protein", "carbs", "fat", "ingredients", "notes"],
        properties: {
          name: { type: "string" },
          calories: { anyOf: [{ type: "integer" }, { type: "number" }] },
          protein: { anyOf: [{ type: "integer" }, { type: "number" }] },
          carbs: { anyOf: [{ type: "integer" }, { type: "number" }] },
          fat: { anyOf: [{ type: "integer" }, { type: "number" }] },
          ingredients: { type: "array", items: { type: "string" } },
          notes: { type: "string" }
        }
      }
    };

    const prompt = {
      role: "user",
      content: [
        {
          type: "text",
          text: [
            "You are a nutrition assistant.",
            "Analyze the meal photo and estimate macros for the photographed portion only: calories, protein, carbs, fat (grams).",
            "Infer portion size from visual cues (plate size, utensils, hands, container) and DO NOT assume a default serving; scale strictly to the amount visible.",
            "Base calories on estimated portion mass/volume. When uncertain, pick a mid-point estimate and avoid extreme under-counts.",
            "Return a short meal name, key ingredients (2-6), and a brief note that states the portion assumption (e.g., '~320g total (~1.3 cups)').",
            portionHint,
            portionNote ? `User description: ${portionNote}` : "",
            "Respond ONLY with JSON that matches the schema."
          ].join("\n")
        },
        { type: "image_url", image_url: { url: dataUrl } }
      ]
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [prompt],
      response_format: { type: "json_schema", json_schema: MEAL_SCHEMA },
      temperature: 0.3
    });

    let content = completion.choices?.[0]?.message?.content ?? "";
    if (content.trim().startsWith("```")) {
      content = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
    }

    // Persist: find or create meal plan, replace meals of the same type
    const result = await prisma.$transaction(async (tx) => {
      let plan = await tx.mealPlan.findFirst({
        where: { userId: session.user.id, date: baseUtc },
        include: { meals: true }
      });

      if (!plan) {
        plan = await tx.mealPlan.create({
          data: {
            userId: session.user.id,
            title: `Meal Plan ${dateIso || ""}`.trim(),
            date: baseUtc
          }
        });
      }

      await tx.meal.deleteMany({
        where: {
          mealPlanId: plan.id,
          type
        }
      });

      const created = await tx.meal.create({
        data: {
          mealPlanId: plan.id,
          name: parsed.name,
          type,
          calories: Number(parsed.calories) || null,
          protein: Number(parsed.protein) || null,
          carbs: Number(parsed.carbs) || null,
          fat: Number(parsed.fat) || null,
          ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients.slice(0, 12) : [],
          recipe: parsed.notes || ""
        }
      });

      const totalCalories = await tx.meal.aggregate({
        where: { mealPlanId: plan.id },
        _sum: { calories: true }
      });

      await tx.mealPlan.update({
        where: { id: plan.id },
        data: { totalCalories: totalCalories?._sum?.calories || null }
      });

      return { planId: plan.id, meal: created, date: plan.date };
    });

    return NextResponse.json({ ...parsed, type, date: baseUtc, mealId: result.meal.id });
  } catch (err) {
    console.error("mealPlans/photo POST failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
