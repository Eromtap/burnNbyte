import { NextResponse } from "next/server";
import { requireAppApiSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  ensureMealPlanForDate,
  refreshMealPlanCalories,
  sanitizeMealPayload,
} from "@/lib/mealPlanUtils";

function normalizeLibraryKind(value) {
  const kind = String(value || "").toUpperCase();
  return kind === "FOOD" || kind === "MEAL" ? kind : null;
}

export async function POST(req) {
  try {
    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = await req.json();
    const dateISO = String(body?.date || "").slice(0, 10);
    if (!dateISO) {
      return NextResponse.json({ error: "Choose a date before saving." }, { status: 400 });
    }

    let mealData;
    try {
      mealData = sanitizeMealPayload(body?.meal || {});
    } catch (err) {
      return NextResponse.json({ error: err.message || "Invalid meal entry." }, { status: 400 });
    }

    const saveToLibrary = Boolean(body?.saveToLibrary);
    const libraryKind = normalizeLibraryKind(body?.libraryKind);
    const libraryDescription = String(body?.libraryDescription || "").trim();
    const completed = body?.completed !== false;

    if (saveToLibrary && !libraryKind) {
      return NextResponse.json({ error: "Choose whether to save this as a food or a meal." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const mealPlan = await ensureMealPlanForDate(tx, {
        userId: session.user.id,
        dateISO,
      });

      const createdMeal = await tx.meal.create({
        data: {
          mealPlanId: mealPlan.id,
          ...mealData,
          isCompleted: completed,
          completedAt: completed ? new Date() : null,
        },
      });

      await refreshMealPlanCalories(tx, mealPlan.id);

      let libraryItem = null;
      if (saveToLibrary && libraryKind) {
        libraryItem = await tx.mealLibraryItem.create({
          data: {
            userId: session.user.id,
            kind: libraryKind,
            name: mealData.name,
            defaultMealType: mealData.type,
            description: libraryDescription || null,
            calories: mealData.calories,
            costPerServing: mealData.costPerServing,
            protein: mealData.protein,
            carbs: mealData.carbs,
            fat: mealData.fat,
            ingredients: mealData.ingredients,
            recipe: mealData.recipe || null,
          },
        });
      }

      return { meal: createdMeal, libraryItem };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("mealPlans/entries POST failed", err);
    return NextResponse.json({ error: "Failed to save meal entry." }, { status: 500 });
  }
}
