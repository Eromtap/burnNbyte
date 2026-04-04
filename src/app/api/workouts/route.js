// app/api/workouts/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from "@/lib/prisma";

function toUTCDateFromLocalYMD(ymd) {
  const [y, m, d] = String(ymd || '').split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function extractExerciseSuggestions(instructions) {
  if (!Array.isArray(instructions)) return [];
  const candidates = instructions
    .map((step) => {
      if (typeof step !== 'string') return null;
      let cleaned = step.replace(/\s+/g, ' ').trim();
      if (!cleaned) return null;
      cleaned = cleaned.replace(/^\d+[\.\)]\s*/, '').trim();
      cleaned = cleaned.split(':')[0].trim();
      cleaned = cleaned.replace(/\s+-\s+\d.*$/i, '').trim();
      cleaned = cleaned.replace(/\b\d+\s*(x|×)\s*\d+\b.*$/i, '').trim();
      cleaned = cleaned.replace(/\b\d+\s*(reps?|sets?|secs?|seconds?|mins?|minutes?)\b.*$/i, '').trim();
      if (cleaned.length < 2 || cleaned.length > 80) return null;
      return cleaned;
    })
    .filter(Boolean);
  return Array.from(new Set(candidates));
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');

  if (date) {
    const baseUtc = toUTCDateFromLocalYMD(date);
    const workout = await prisma.workout.findFirst({
      where: { userId, date: baseUtc },
    });
    const exerciseLogs = workout
      ? await prisma.exerciseLog.findMany({
          where: { workoutId: workout.id, userId },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    return NextResponse.json({
      workout,
      exerciseLogs,
      exerciseSuggestions: workout ? extractExerciseSuggestions(workout.instructions) : [],
    });
  }

  const workouts = await prisma.workout.findMany({
    where: {
      userId: userId
    }
  });

  return NextResponse.json(workouts);
}
