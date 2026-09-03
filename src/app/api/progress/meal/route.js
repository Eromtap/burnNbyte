import { after, NextResponse } from "next/server";
import { requireAppApiSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { refreshStoreSummariesForDates } from '@/lib/grocerySummary';

export async function POST(req) {
  try {
    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = (await req.json().catch(() => ({}))) || {};
    const mealId = typeof body?.mealId === "string" ? body.mealId : String(body?.mealId || "");
    const completed = Boolean(body?.completed);
    if (!mealId) {
      return NextResponse.json({ error: "Missing mealId" }, { status: 400 });
    }

    const meal = await prisma.meal.findFirst({
      where: { id: mealId, mealPlan: { userId: session.user.id } },
      include: { mealPlan: { select: { date: true } } },
    });
    if (!meal) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    const updated = await prisma.meal.update({
      where: { id: mealId },
      data: {
        isCompleted: completed,
        completedAt: completed ? new Date() : null,
      },
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

    return NextResponse.json({ ok: true, meal: updated });
  } catch (err) {
    console.error("progress meal toggle failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
