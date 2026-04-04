import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";



export async function POST(req) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
