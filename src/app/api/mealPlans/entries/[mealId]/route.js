import { after, NextResponse } from "next/server";
import { requireAppApiSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { refreshMealPlanCalories } from "@/lib/mealPlanUtils";
import { refreshStoreSummariesForDates } from '@/lib/grocerySummary';

export async function DELETE(_req, { params }) {
  try {
    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const resolvedParams = await params;
    const mealId = String(resolvedParams?.mealId || "");
    if (!mealId) {
      return NextResponse.json({ error: "Missing mealId." }, { status: 400 });
    }

    const meal = await prisma.meal.findFirst({
      where: {
        id: mealId,
        mealPlan: { userId: session.user.id },
      },
      select: {
        id: true,
        mealPlanId: true,
        includeInGroceries: true,
        mealPlan: { select: { date: true } },
      },
    });

    if (!meal) {
      return NextResponse.json({ error: "Meal not found." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.meal.delete({ where: { id: meal.id } });
      await refreshMealPlanCalories(tx, meal.mealPlanId);
    });

    if (meal.includeInGroceries) {
      after(async () => {
        try {
          await refreshStoreSummariesForDates({
            userId: session.user.id,
            dates: [meal.mealPlan.date.toISOString().slice(0, 10)],
          });
        } catch (groceryError) {
          console.error('Automatic grocery summary refresh failed', groceryError);
        }
      });
    }

    return NextResponse.json({ ok: true, mealId });
  } catch (err) {
    console.error("mealPlans/entries/[mealId] DELETE failed", err);
    return NextResponse.json({ error: "Failed to delete meal entry." }, { status: 500 });
  }
}
