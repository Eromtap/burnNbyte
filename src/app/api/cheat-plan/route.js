import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAppApiSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { deriveNutritionTargets } from '@/lib/nutritionTargets';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 90000, maxRetries: 0 });
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

function portionMultiplierFor(meal) {
  const multiplier = Number(meal?.portionMultiplier);
  return Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
}

function effectiveMealCalories(meal) {
  return (Number(meal?.calories) || 0) * portionMultiplierFor(meal);
}

function formatPortionNote(multiplier) {
  const percent = Math.round(multiplier * 100);
  const servings = Math.round(multiplier * 20) / 20;
  return `Cheat-plan portion: eat about ${percent}% of the planned serving (${servings} serving).`;
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

    const profile = await prisma.userProfile.findUnique({ where: { userId: String(session.user.id) } });

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
          isCompleted: false,
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
    // Even without a meal plan, give the user a concrete upcoming target to
    // follow instead of making the offset disappear until they generate meals.
    if (!mealPlanDates.length) {
      for (let offset = 0; offset < 7; offset += 1) {
        const date = new Date(currentDate);
        date.setUTCDate(date.getUTCDate() + offset);
        dates.add(toISO(date));
      }
    }
    const remainingDays = dates.size;
    const mealDayCount = mealPlanDates.length;
    const workoutDayCount = workoutDates.length;

    const minDailyCalories = minDailyCaloriesForProfile(profile?.gender);
    const dailyMealReduction = Math.min(
      MAX_DAILY_MEAL_REDUCTION,
      roundToStep((normalizedEstimate.calories * 0.6) / remainingDays, 10)
    );
    const dailyWorkoutMinutes = workoutDayCount
      ? Math.min(
          MAX_EXTRA_WORKOUT_MINUTES,
          Math.max(6, roundToStep((normalizedEstimate.calories * 0.4) / workoutDayCount / 8, 1))
        )
      : 0;

    const adjustmentNote = `Cheat offset plan for ${normalizedEstimate.summary}.`;
    const portionAdjustments = [];

    const adjustmentDates = [...dates].sort();
    const existingOverrides = await prisma.nutritionTargetOverride.findMany({
      where: {
        userId: session.user.id,
        date: { in: adjustmentDates.map(toUTCDateFromLocalYMD) },
      },
    });
    const overridesByDate = new Map(existingOverrides.map((item) => [toISO(item.date), item]));
    const baselineTargets = deriveNutritionTargets(profile || {});
    const targetDaysUpdated = await prisma.$transaction(async (tx) => {
      for (const dateISO of adjustmentDates) {
        const currentTarget = overridesByDate.get(dateISO) || baselineTargets;
        const currentCalories = Number(currentTarget.calories) || baselineTargets.calories;
        const nextCalories = Math.max(minDailyCalories, Math.round(currentCalories - dailyMealReduction));
        const targetRatio = currentCalories > 0 ? nextCalories / currentCalories : 1;
        await tx.nutritionTargetOverride.upsert({
          where: { userId_date: { userId: session.user.id, date: toUTCDateFromLocalYMD(dateISO) } },
          create: {
            userId: session.user.id,
            date: toUTCDateFromLocalYMD(dateISO),
            calories: nextCalories,
            protein: Math.round((Number(currentTarget.protein) || 0) * targetRatio * 10) / 10,
            carbs: Math.round((Number(currentTarget.carbs) || 0) * targetRatio * 10) / 10,
            fat: Math.round((Number(currentTarget.fat) || 0) * targetRatio * 10) / 10,
            reason: adjustmentNote,
          },
          update: {
            calories: nextCalories,
            protein: Math.round((Number(currentTarget.protein) || 0) * targetRatio * 10) / 10,
            carbs: Math.round((Number(currentTarget.carbs) || 0) * targetRatio * 10) / 10,
            fat: Math.round((Number(currentTarget.fat) || 0) * targetRatio * 10) / 10,
            reason: adjustmentNote,
          },
        });
      }
      return adjustmentDates.length;
    });

    const mealPlansUpdated = await prisma.$transaction(async (tx) => {
      let updatedPlans = 0;

      for (const plan of adjustableMealPlans) {
        const lockedMeals = (plan.meals || []).filter((meal) => meal.isCompleted);
        const adjustableMeals = (plan.meals || []).filter((meal) => !meal.isCompleted);
        const lockedCalories = lockedMeals.reduce((sum, meal) => sum + effectiveMealCalories(meal), 0);
        const adjustableCalories = adjustableMeals.reduce((sum, meal) => sum + effectiveMealCalories(meal), 0);
        const currentTotalCalories = lockedCalories + adjustableCalories;
        const floorProtectedTotal = Math.max(currentTotalCalories - dailyMealReduction, minDailyCalories);
        const targetAdjustableCalories = Math.max(0, floorProtectedTotal - lockedCalories);
        const ratio = adjustableCalories > 0 ? Math.max(0.72, Math.min(1, targetAdjustableCalories / adjustableCalories)) : 1;
        let nextTotalCalories = lockedCalories;

        for (const meal of adjustableMeals) {
          const nextMultiplier = Math.max(0.5, Math.round(portionMultiplierFor(meal) * ratio * 20) / 20);
          const nextCalories = (Number(meal.calories) || 0) * nextMultiplier;
          nextTotalCalories += nextCalories;
          const portionAdjustmentNote = formatPortionNote(nextMultiplier);
          await tx.meal.update({
            where: { id: meal.id },
            data: {
              portionMultiplier: nextMultiplier,
              portionAdjustmentNote,
            },
          });
          portionAdjustments.push({
            date: toISO(plan.date),
            mealName: meal.name,
            portionPercent: Math.round(nextMultiplier * 100),
            servings: nextMultiplier,
          });
        }

        await tx.mealPlan.update({
          where: { id: plan.id },
          data: { totalCalories: Math.round(nextTotalCalories) || null },
        });

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
        targetDaysUpdated,
        adjustedDailyTarget: Math.max(minDailyCalories, Math.round((Number(baselineTargets.calories) || 0) - dailyMealReduction)),
        portionAdjustments,
        scopeLabel: mealDayCount
          ? `Recipes and grocery ingredients were not changed. Only meals you have not marked as eaten received a visible portion adjustment, and no day was pushed below ${minDailyCalories} kcal.`
          : `No unfinished meal plans were available, so only future workouts were adjusted. Extra cardio was capped at ${MAX_EXTRA_WORKOUT_MINUTES} minutes per workout.`,
      },
    });
  } catch (error) {
    console.error('cheat plan failed', error);
    const timedOut = error?.name === 'APIConnectionTimeoutError';
    return NextResponse.json(
      { error: timedOut ? 'Planning took too long. Please try again.' : (error?.message || 'Server error') },
      { status: timedOut ? 504 : 500 }
    );
  }
}
