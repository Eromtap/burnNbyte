import { NextResponse } from "next/server";
import { requireAppApiSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req) {
  try {
    if (typeof prisma.mealFeedback?.create !== "function") {
      return NextResponse.json({ error: "Meal feedback client not initialized yet. Restart the dev server once." }, { status: 503 });
    }

    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = (await req.json().catch(() => ({}))) || {};
    const mealId = typeof body?.mealId === "string" ? body.mealId : String(body?.mealId || "");
    const feedback = typeof body?.feedback === "string" ? body.feedback.trim().toLowerCase() : "";
    if (!mealId) {
      return NextResponse.json({ error: "Missing mealId" }, { status: 400 });
    }
    if (!["like", "dislike"].includes(feedback)) {
      return NextResponse.json({ error: "Feedback must be like or dislike" }, { status: 400 });
    }

    const meal = await prisma.meal.findFirst({
      where: { id: mealId, mealPlan: { userId: session.user.id } },
      select: {
        id: true,
        name: true,
        type: true,
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
        ingredients: true,
      },
    });
    if (!meal) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    const saved = await prisma.mealFeedback.create({
      data: {
        userId: session.user.id,
        mealName: meal.name,
        mealType: meal.type,
        feedback,
        ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
      },
    });

    return NextResponse.json({ ok: true, feedback: saved });
  } catch (err) {
    console.error("meal feedback save failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
