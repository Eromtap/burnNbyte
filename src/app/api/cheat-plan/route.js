import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAppApiSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MAX_DAILY_MEAL_REDUCTION = 250;
const MAX_EXTRA_WORKOUT_MINUTES = 10;
const DEFAULT_MIN_DAILY_CALORIES = 1400;

const CHEAT_SCHEMA = {
  name: 'cheat_estimate',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['summary', 'calories', 'protein', 'carbs', 'fat'],
    properties: {
      summary: { type: 'string' },
      calories: { anyOf: [{ type: 'integer' }, { type: 'number' }] },
      protein: { anyOf: [{ type: 'integer' }, { type: 'number' }] },
      carbs: { anyOf: [{ type: 'integer' }, { type: 'number' }] },
      fat: { anyOf: [{ type: 'integer' }, { type: 'number' }] },
    },
  },
};

function toUTCDateFromLocalYMD(ymd) {
  const [y, m, d] = String(ymd || '').split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function toISO(value) {
  const dt = new Date(value);
  dt.setUTCHours(0, 0, 0, 0);
  return dt.toISOString().slice(0, 10);
}

function roundToStep(value, step = 5) {
  return Math.max(0, Math.round(Number(value || 0) / step) * step);
}

function scaleMealValue(value, ratio) {
  if (value == null) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.round(numeric * ratio));
}

function minDailyCaloriesForProfile(gender) {
  const normalized = String(gender || '').toLowerCase();
  if (normalized.includes('male') || normalized.includes('man')) return 1500;
  if (normalized.includes('female') || normalized.includes('woman')) return 1200;
  return DEFAULT_MIN_DAILY_CALORIES;
}

export async function POST(req) {
  try {
    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = await req.json().catch(() => ({}));
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    const adjustWeek = Boolean(body?.adjustWeek);
    const currentDateISO = typeof body?.currentDateISO === 'string' ? body.currentDateISO.slice(0, 10) : toISO(new Date());

    if (!description) {
      return NextResponse.json({ error: 'Missing cheat description' }, { status: 400 });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: String(session.user.id) },
      select: { gender: true },
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            'Estimate the nutrition for this planned indulgence.',
            'Be realistic, not optimistic. If the description is ambiguous, use a mid-to-high estimate.',
            'Return only JSON matching the schema.',
            `Description: ${description}`,
          ].join('\n'),
        },
      ],
      response_format: { type: 'json_schema', json_schema: CHEAT_SCHEMA },
      temperature: 0.2,
    });

    let content = completion.choices?.[0]?.message?.content ?? '';
    if (content.trim().startsWith('```')) {
      content = content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    }

    let estimate;
    try {
      estimate = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: 'Failed to parse cheat estimate' }, { status: 502 });
    }

    const normalizedEstimate = {
      summary: estimate?.summary || description,
      calories: Math.max(0, Math.round(Number(estimate?.calories) || 0)),
      protein: Math.max(0, Math.round(Number(estimate?.protein) || 0)),
      carbs: Math.max(0, Math.round(Number(estimate?.carbs) || 0)),
      fat: Math.max(0, Math.round(Number(estimate?.fat) || 0)),
    };

    if (!adjustWeek) {
      return NextResponse.json({ ok: true, estimate: normalizedEstimate, adjustment: null });
    }

    const currentDate = toUTCDateFromLocalYMD(currentDateISO);

    const [mealPlans, workouts] = await Promise.all([
      prisma.mealPlan.findMany({
        where: {
          userId: session.user.id,
          date: { gte: currentDate },
        },
        include: { meals: true },
        orderBy: { date: 'asc' },
      }),
      prisma.workout.findMany({
        where: {
          userId: session.user.id,
          date: { gte: currentDate },
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    const adjustableMealPlans = mealPlans.filter((plan) => (
      Array.isArray(plan.meals) && plan.meals.some((meal) => !meal.isCompleted)
    ));
    const mealPlanDates = adjustableMealPlans
      .map((plan) => toISO(plan.date));
    const workoutDates = workouts.map((workout) => toISO(workout.date));
    const dates = new Set([
      ...mealPlanDates,
      ...workoutDates,
    ]);
    const remainingDays = dates.size;
    const mealDayCount = mealPlanDates.length;
    const workoutDayCount = workoutDates.length;

    if (!remainingDays) {
      return NextResponse.json({
        ok: true,
        estimate: normalizedEstimate,
        adjustment: {
          remainingDays: 0,
          dailyMealReduction: 0,
          dailyWorkoutMinutes: 0,
          mealPlansUpdated: 0,
          workoutsUpdated: 0,
          scopeLabel: 'No upcoming unfinished meal plans or future workouts were available to adjust.',
        },
      });
    }

    const minDailyCalories = minDailyCaloriesForProfile(profile?.gender);
    const dailyMealReduction = mealDayCount
      ? Math.min(
          MAX_DAILY_MEAL_REDUCTION,
          roundToStep((normalizedEstimate.calories * 0.6) / mealDayCount, 10)
        )
      : 0;
    const dailyWorkoutMinutes = workoutDayCount
      ? Math.min(
          MAX_EXTRA_WORKOUT_MINUTES,
          Math.max(6, roundToStep((normalizedEstimate.calories * 0.4) / workoutDayCount / 8, 1))
        )
      : 0;

    const adjustmentNote = `Cheat offset plan: trim about ${dailyMealReduction} kcal from unfinished meals without taking the day below ${minDailyCalories} kcal, and add ${dailyWorkoutMinutes} minutes of easy cardio on each upcoming planned workout day to absorb the extra intake from ${normalizedEstimate.summary}.`;

    const mealPlansUpdated = await prisma.$transaction(async (tx) => {
      let updatedPlans = 0;

      for (const plan of adjustableMealPlans) {
        const lockedMeals = (plan.meals || []).filter((meal) => meal.isCompleted);
        const adjustableMeals = (plan.meals || []).filter((meal) => !meal.isCompleted);
        const lockedCalories = lockedMeals.reduce((sum, meal) => sum + (Number(meal.calories) || 0), 0);
        const adjustableCalories = adjustableMeals.reduce((sum, meal) => sum + (Number(meal.calories) || 0), 0);
        const currentTotalCalories = lockedCalories + adjustableCalories;
        const floorProtectedTotal = Math.max(currentTotalCalories - dailyMealReduction, minDailyCalories);
        const targetAdjustableCalories = Math.max(0, floorProtectedTotal - lockedCalories);
        const ratio = adjustableCalories > 0 ? Math.max(0.72, Math.min(1, targetAdjustableCalories / adjustableCalories)) : 1;
        const nextTotalCalories = lockedCalories + targetAdjustableCalories;

        await tx.mealPlan.update({
          where: { id: plan.id },
          data: {
            totalCalories: nextTotalCalories || null,
            description: [plan.description, adjustmentNote].filter(Boolean).join(' ').slice(0, 1200),
          },
        });

        for (const meal of adjustableMeals) {
          await tx.meal.update({
            where: { id: meal.id },
            data: {
              calories: scaleMealValue(meal.calories, ratio),
              protein: scaleMealValue(meal.protein, ratio),
              carbs: scaleMealValue(meal.carbs, ratio),
              fat: scaleMealValue(meal.fat, ratio),
            },
          });
        }

        updatedPlans += 1;
      }

      return updatedPlans;
    });

    const workoutsUpdated = await prisma.$transaction(async (tx) => {
      let updatedCount = 0;
      for (const workout of workouts) {
        const note = `Offset add-on: finish with ${dailyWorkoutMinutes} min zone-2 cardio.`;
        const nextInstructions = Array.isArray(workout.instructions) ? [...workout.instructions] : [];
        if (!nextInstructions.includes(note)) {
          nextInstructions.push(note);
        }
        await tx.workout.update({
          where: { id: workout.id },
          data: {
            duration: Number(workout.duration || 0) + Math.min(dailyWorkoutMinutes, MAX_EXTRA_WORKOUT_MINUTES),
            description: [workout.description, adjustmentNote].filter(Boolean).join(' ').slice(0, 1200),
            instructions: nextInstructions,
          },
        });
        updatedCount += 1;
      }
      return updatedCount;
    });

    return NextResponse.json({
      ok: true,
      estimate: normalizedEstimate,
      adjustment: {
        remainingDays,
        dailyMealReduction,
        dailyWorkoutMinutes,
        mealPlansUpdated,
        workoutsUpdated,
        scopeLabel: mealDayCount
          ? `Only meals you have not marked as eaten were adjusted, and no day was pushed below ${minDailyCalories} kcal.`
          : `No unfinished meal plans were available, so only future workouts were adjusted. Extra cardio was capped at ${MAX_EXTRA_WORKOUT_MINUTES} minutes per workout.`,
      },
    });
  } catch (error) {
    console.error('cheat plan failed', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
