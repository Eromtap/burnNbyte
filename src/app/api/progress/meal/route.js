import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) || {};
    const mealId = typeof body?.mealId === "string" ? body.mealId : String(body?.mealId || "");
    const completed = Boolean(body?.completed);
    if (!mealId) {
      return NextResponse.json({ error: "Missing mealId" }, { status: 400 });
    }

    const meal = await prisma.meal.findFirst({
      where: { id: mealId, mealPlan: { userId: session.user.id } },
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

    return NextResponse.json({ ok: true, meal: updated });
  } catch (err) {
    console.error("progress meal toggle failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
