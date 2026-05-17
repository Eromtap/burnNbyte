import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { refreshMealPlanCalories } from "@/lib/mealPlanUtils";

export async function DELETE(_req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      },
    });

    if (!meal) {
      return NextResponse.json({ error: "Meal not found." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.meal.delete({ where: { id: meal.id } });
      await refreshMealPlanCalories(tx, meal.mealPlanId);
    });

    return NextResponse.json({ ok: true, mealId });
  } catch (err) {
    console.error("mealPlans/entries/[mealId] DELETE failed", err);
    return NextResponse.json({ error: "Failed to delete meal entry." }, { status: 500 });
  }
}
