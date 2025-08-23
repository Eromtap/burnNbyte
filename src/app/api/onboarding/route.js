import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
// import { PrismaClient } from '@prisma/client';
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";


// const prisma = new PrismaClient();

export async function POST(req) {
  const session = await getServerSession(authOptions);
  //console.log("Session in onboarding API:", session);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();

    // Find user by email in Prisma
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    const birthdayDate = data.birthday ? new Date(data.birthday) : null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Upsert UserProfile with onboarding data
    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        birthday: birthdayDate,
        gender: data.gender,
        heightFt: parseFloat(data.heightFt),
        heightIn: parseFloat(data.heightIn),
        weight: parseFloat(data.weight),
        activityLevel: data.activityLevel,
        fitnessGoal: data.fitnessGoal,
        dietaryPreferences: data.dietaryPreferences,
        workoutPreference: data.workoutPreference,
        workoutDuration: parseInt(data.workoutDuration),
        workoutFrequency: parseInt(data.workoutsPerWeek),
        allergies: data.allergies,
        mealsPerDay: parseInt(data.mealsPerDay),
        // add other fields as needed
      },
      create: {
        userId: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        birthday: birthdayDate,
        gender: data.gender,
        heightFt: data.heightFt ? parseFloat(data.heightFt) : null,
        heightIn: data.heightIn ? parseFloat(data.heightIn) : null,
        weight: parseFloat(data.weight),
        activityLevel: data.activityLevel,
        fitnessGoal: data.fitnessGoal,
        dietaryPreferences: data.dietaryPreferences,
        workoutPreference: data.workoutPreference,
        workoutDuration: parseInt(data.workoutDuration),
        workoutFrequency: parseInt(data.workoutsPerWeek),
        allergies: data.allergies,
        mealsPerDay: parseInt(data.mealsPerDay),
        // add other fields as needed
      },
    });


    return NextResponse.json({ success: true });
  } catch (error) {
    // console.error("Error saving onboarding data:", error);
    console.error("Error saving onboarding data:", error, error?.meta);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}