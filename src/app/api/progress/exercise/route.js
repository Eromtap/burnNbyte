import { NextResponse } from "next/server";
import { requireAppApiSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export async function POST(req) {
  try {
    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = await req.json();
    const exerciseName = typeof body?.exerciseName === "string" ? body.exerciseName.trim() : "";
    const type = typeof body?.type === "string" ? body.type.trim().toLowerCase() : "";
    const workoutId = typeof body?.workoutId === "string" ? body.workoutId : null;

    if (!exerciseName) {
      return NextResponse.json({ error: "Exercise name is required" }, { status: 400 });
    }
    if (!type || !["weighted", "cardio", "other"].includes(type)) {
      return NextResponse.json({ error: "Type must be weighted, cardio, or other" }, { status: 400 });
    }

    if (workoutId) {
      const workout = await prisma.workout.findFirst({
        where: { id: workoutId, userId: session.user.id },
        select: { id: true },
      });
      if (!workout) {
        return NextResponse.json({ error: "Workout not found" }, { status: 404 });
      }
    }

    const weight = toNumberOrNull(body?.weight);
    const reps = toNumberOrNull(body?.reps);
    const sets = toNumberOrNull(body?.sets);
    const distance = toNumberOrNull(body?.distance);
    const pace = toNumberOrNull(body?.pace);

    if (type === "weighted" && weight === null) {
      return NextResponse.json({ error: "Weight is required for weighted exercises" }, { status: 400 });
    }
    if (type === "cardio" && distance === null && pace === null) {
      return NextResponse.json({ error: "Distance or pace is required for cardio" }, { status: 400 });
    }

    const log = await prisma.exerciseLog.create({
      data: {
        userId: session.user.id,
        workoutId,
        exerciseName,
        type,
        weight,
        reps: reps !== null ? Math.round(reps) : null,
        sets: sets !== null ? Math.round(sets) : null,
        distance,
        pace,
      },
    });

    return NextResponse.json({ ok: true, log });
  } catch (error) {
    console.error("exercise log create failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
