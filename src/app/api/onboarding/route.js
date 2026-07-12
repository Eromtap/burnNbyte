import { NextResponse } from "next/server";
import { requireAppApiSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getMinimumSafeCalories } from "@/lib/nutritionTargets";



export async function POST(req) {
  const auth = await requireAppApiSession();
  if (auth.response) return auth.response;
  const { session } = auth;

  try {
    const data = await req.json();

    const userId = session.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "User ID missing from session" }, { status: 400 });
    }

    // Find user by ID in Prisma
    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
    });

    const birthdayDate = data.birthday ? new Date(data.birthday) : null;

    // Helpers to coerce numeric fields safely
    const toFloatOrNull = (v) => {
      const n = typeof v === 'string' && v.trim() === '' ? NaN : parseFloat(v);
      return Number.isFinite(n) ? n : null;
    };
    const toIntOrNull = (v) => {
      const n = typeof v === 'string' && v.trim() === '' ? NaN : parseInt(v);
      return Number.isFinite(n) ? n : null;
    };
    const toPositiveIntOrNull = (v) => {
      const n = toIntOrNull(v);
      return n != null && n >= 0 ? n : null;
    };
    const toPositiveFloatOrNull = (v) => {
      const n = toFloatOrNull(v);
      return n != null && n >= 0 ? n : null;
    };
    const validateMacroTargets = (payload) => {
      const minimumCalories = getMinimumSafeCalories(payload.gender);
      const mode = String(payload.macroTargetMode || 'grams');
      const calorieTarget = toPositiveIntOrNull(payload.calorieTarget);
      const proteinTarget = toPositiveFloatOrNull(payload.proteinTarget);
      const carbsTarget = toPositiveFloatOrNull(payload.carbsTarget);
      const fatTarget = toPositiveFloatOrNull(payload.fatTarget);
      const proteinPctTarget = toPositiveFloatOrNull(payload.proteinPctTarget);
      const carbsPctTarget = toPositiveFloatOrNull(payload.carbsPctTarget);
      const fatPctTarget = toPositiveFloatOrNull(payload.fatPctTarget);
      const hasAnyMacro = [proteinTarget, carbsTarget, fatTarget].some((value) => value != null);
      const hasAnyPct = [proteinPctTarget, carbsPctTarget, fatPctTarget].some((value) => value != null);

      if (!hasAnyMacro && !hasAnyPct && calorieTarget == null) return null;
      if (calorieTarget == null) {
        return `Add a calorie target when setting ${mode === 'percentages' ? 'macro percentages' : 'protein, carbs, and fat targets'}.`;
      }
      if (calorieTarget < minimumCalories) {
        return `Calorie targets cannot go below ${minimumCalories}.`;
      }
      if (mode === 'percentages') {
        if ([proteinPctTarget, carbsPctTarget, fatPctTarget].some((value) => value == null)) {
          return "Protein, carbs, and fat percentages all need values when using percentage targets.";
        }
        const totalPct = proteinPctTarget + carbsPctTarget + fatPctTarget;
        if (totalPct !== 100) {
          return `Protein, carbs, and fat percentages currently add up to ${totalPct}%. They need to equal 100%.`;
        }
        return null;
      }
      if ([proteinTarget, carbsTarget, fatTarget].some((value) => value == null)) {
        return "Protein, carbs, and fat all need values when you set calorie and macro targets.";
      }

      const macroCalories = proteinTarget * 4 + carbsTarget * 4 + fatTarget * 9;
      const allowedDelta = calorieTarget * 0.05;
      if (Math.abs(macroCalories - calorieTarget) > allowedDelta) {
        return `Protein, carbs, and fat currently add up to ${macroCalories} calories. That needs to land within 5% of the calorie target (${calorieTarget}).`;
      }

      return null;
    };

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const macroValidationError = validateMacroTargets(data);
    if (macroValidationError) {
      return NextResponse.json({ error: macroValidationError }, { status: 400 });
    }

    // Upsert UserProfile with onboarding data
    // await prisma.userProfile.upsert({
    //   where: { userId: user.id },
    //   update: {
    //     firstName: data.firstName,
    //     lastName: data.lastName,
    //     birthday: birthdayDate,
    //     gender: data.gender,
    //     heightFt: parseFloat(data.heightFt),
    //     heightIn: parseFloat(data.heightIn),
    //     weight: parseFloat(data.weight),
    //     activityLevel: data.activityLevel,
    //     fitnessGoal: data.fitnessGoal,
    //     dietaryPreferences: data.dietaryPreferences,
    //     workoutPreference: data.workoutPreference,
    //     workoutDuration: parseInt(data.workoutDuration),
    //     workoutFrequency: parseInt(data.workoutsPerWeek),
    //     allergies: data.allergies,
    //     mealsPerDay: parseInt(data.mealsPerDay),
    //     // add other fields as needed
    //   },
    //   create: {
    //     userId: user.id,
    //     firstName: data.firstName,
    //     lastName: data.lastName,
    //     birthday: birthdayDate,
    //     gender: data.gender,
    //     heightFt: data.heightFt ? parseFloat(data.heightFt) : null,
    //     heightIn: data.heightIn ? parseFloat(data.heightIn) : null,
    //     weight: parseFloat(data.weight),
    //     activityLevel: data.activityLevel,
    //     fitnessGoal: data.fitnessGoal,
    //     dietaryPreferences: data.dietaryPreferences,
    //     workoutPreference: data.workoutPreference,
    //     workoutDuration: parseInt(data.workoutDuration),
    //     workoutFrequency: parseInt(data.workoutsPerWeek),
    //     allergies: data.allergies,
    //     mealsPerDay: parseInt(data.mealsPerDay),
    //     // add other fields as needed
    //   },
    // });
    // normalize & validate the array (defensive)
    const ALLOWED = new Set(["SUN","MON","TUE","WED","THU","FRI","SAT"]);
    const workoutDays = Array.isArray(data.workoutDays)
      ? data.workoutDays.filter(d => ALLOWED.has(d))
      : [];

    // Normalize dietaryPreferences to an array of strings
    const normalizeList = (val) => {
      if (Array.isArray(val)) return val.map((v) => v?.toString().trim()).filter(Boolean);
      if (typeof val === 'string') return val.split(',').map((s) => s.trim()).filter(Boolean);
      return [];
    };

    const dietaryPreferences = normalizeList(data.dietaryPreferences);
    const fitnessGoals = normalizeList(data.fitnessGoals);
    const equipmentAccess = normalizeList(data.equipmentAccess);

    // Normalize dislikedFoods to an array of strings
    const dislikedFoods = normalizeList(data.dislikedFoods);

    // Normalize allergies to a single string column (comma-separated) per schema
    const allergies = Array.isArray(data.allergies)
      ? data.allergies.join(', ')
      : (typeof data.allergies === 'string' ? data.allergies : null);

    // Build update payload; omit required strings if not provided (Profile edits)
    const updateData = {
      birthday: birthdayDate,
      gender: data.gender,
      heightFt: toFloatOrNull(data.heightFt),
      heightIn: toFloatOrNull(data.heightIn),
      weight: toFloatOrNull(data.weight),
      goalWeight: toFloatOrNull(data.goalWeight),
      activityLevel: data.activityLevel,
      fitnessGoal: data.fitnessGoal || fitnessGoals[0] || null,
      fitnessGoals,
      dietaryPreferences,
      dislikedFoods,
      mealPrepMode: Boolean(data.mealPrepMode),
      macroTargetMode: data.macroTargetMode || 'grams',
      calorieTarget: toPositiveIntOrNull(data.calorieTarget),
      proteinTarget: toPositiveFloatOrNull(data.proteinTarget),
      carbsTarget: toPositiveFloatOrNull(data.carbsTarget),
      fatTarget: toPositiveFloatOrNull(data.fatTarget),
      proteinPctTarget: toPositiveFloatOrNull(data.proteinPctTarget),
      carbsPctTarget: toPositiveFloatOrNull(data.carbsPctTarget),
      fatPctTarget: toPositiveFloatOrNull(data.fatPctTarget),
      workoutPreference: data.workoutPreference,
      workoutDuration: toIntOrNull(data.workoutDuration),
      workoutDays,
      equipmentAccess,
      // workoutFrequency: undefined,
      allergies,
      mealsPerDay: toIntOrNull(data.mealsPerDay),
    };
    if (typeof data.firstName === 'string' && data.firstName.trim() !== '') {
      updateData.firstName = data.firstName.trim();
    }
    if (typeof data.lastName === 'string' && data.lastName.trim() !== '') {
      updateData.lastName = data.lastName.trim();
    }

    // Build create payload; require first/last name on initial onboarding
    if (!data.firstName || !data.lastName) {
      // If creating a new profile, enforce presence; updates can omit
    }
    const createData = {
      userId: user.id,
      firstName: (data.firstName ?? '').toString().trim(),
      lastName: (data.lastName ?? '').toString().trim(),
      birthday: birthdayDate,
      gender: data.gender,
      heightFt: toFloatOrNull(data.heightFt),
      heightIn: toFloatOrNull(data.heightIn),
      weight: toFloatOrNull(data.weight),
      goalWeight: toFloatOrNull(data.goalWeight),
      activityLevel: data.activityLevel,
      fitnessGoal: data.fitnessGoal || fitnessGoals[0] || null,
      fitnessGoals,
      dietaryPreferences,
      dislikedFoods,
      mealPrepMode: Boolean(data.mealPrepMode),
      macroTargetMode: data.macroTargetMode || 'grams',
      calorieTarget: toPositiveIntOrNull(data.calorieTarget),
      proteinTarget: toPositiveFloatOrNull(data.proteinTarget),
      carbsTarget: toPositiveFloatOrNull(data.carbsTarget),
      fatTarget: toPositiveFloatOrNull(data.fatTarget),
      proteinPctTarget: toPositiveFloatOrNull(data.proteinPctTarget),
      carbsPctTarget: toPositiveFloatOrNull(data.carbsPctTarget),
      fatPctTarget: toPositiveFloatOrNull(data.fatPctTarget),
      workoutPreference: data.workoutPreference,
      workoutDuration: toIntOrNull(data.workoutDuration),
      workoutDays,
      equipmentAccess,
      // workoutFrequency: undefined,
      allergies,
      mealsPerDay: toIntOrNull(data.mealsPerDay),
    };
    if (!createData.firstName || !createData.lastName) {
      // If this upsert results in a create (no existing profile), Prisma will require these.
      // To avoid 500, proactively return 400 for incomplete onboarding payloads.
      const existing = await prisma.userProfile.findUnique({ where: { userId: user.id } });
      if (!existing) {
        return NextResponse.json({ error: 'firstName and lastName are required for onboarding' }, { status: 400 });
      }
    }

    const saved = await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: updateData,
      create: createData,
    });

    return NextResponse.json({ success: true, profile: saved });
  } catch (error) {
    // console.error("Error saving onboarding data:", error);
    console.error("Error saving onboarding data:", error, error?.meta);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
