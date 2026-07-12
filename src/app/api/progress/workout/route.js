import { NextResponse } from "next/server";
import { requireAppApiSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function estimateCalories({ weightLbs, durationMin, difficulty }) {
  const weightKg = weightLbs ? weightLbs * 0.453592 : null;
  const diff = String(difficulty || "beginner").toLowerCase();
  const met = diff === "advanced" ? 8 : diff === "intermediate" ? 6.5 : 5.0;
  const hours = (Number(durationMin) || 0) / 60;
  return weightKg ? Math.max(0, Math.round(met * weightKg * hours)) : null;
}

export async function POST(req) {
  try {
    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = (await req.json().catch(() => ({}))) || {};
    const workoutId = typeof body?.workoutId === "string" ? body.workoutId : String(body?.workoutId || "");
    const completed = Boolean(body?.completed);
    if (!workoutId) {
      return NextResponse.json({ error: "Missing workoutId" }, { status: 400 });
    }

    const workout = await prisma.workout.findFirst({
      where: { id: workoutId, userId: session.user.id },
    });
    if (!workout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    const profile = await prisma.userProfile.findUnique({ where: { userId: String(session.user.id) } });
    const caloriesBurned = completed
      ? estimateCalories({ weightLbs: profile?.weight, durationMin: workout.duration, difficulty: workout.difficulty })
      : null;

    const updated = await prisma.workout.update({
      where: { id: workoutId },
      data: {
        isCompleted: completed,
        completedAt: completed ? new Date() : null,
      },
    });

    return NextResponse.json({ ok: true, workout: updated, caloriesBurned });
  } catch (err) {
    console.error("progress workout toggle failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
