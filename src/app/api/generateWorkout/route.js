// src/app/api/generateWorkout/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from "@/lib/prisma";



const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      gender,
      heightFt,
      heightIn,
      weight,
      fitnessGoal, 
      fitnessLevel = "beginner", 
      workoutPreference = "mixed",
      workoutDuration = "60",
      workoutFrequency
    } = body;

    if (!fitnessGoal) {
      return NextResponse.json({ error: "Missing required field: goal" }, { status: 400 });
    }

    const prompt = {
      role: "user",
      content:
        `Create a workout plan for each day in the date range given:
      - gender: "${gender}"
      - heightFt: "${heightFt}" feet
      - heightIn: "${heightIn}" inches
      - weight: "${weight}" pounds
      - fitnessGoal: "${fitnessGoal}"
      - fitness level: "${fitnessLevel}"
      - workoutPreference: "${workoutPreference}"
      - workoutDuration: ${workoutDuration} minutes
      - workoutFrequency: "${workoutFrequency}" days per week
      - dateRange: "2025-08-30 - 2025-09-05"

      Return ONLY a JSON object with these fields (no commentary, no code fences):
      {
        "name": "string",
        "description": "string",
        "difficulty": "beginner" | "intermediate" | "advanced",
        "duration": "string or number (minutes)",
        "equipment": ["string", ...],
        "instructions": ["string step", ...],
        "muscleGroup": "string"
        "date" "date"
      }`
    };

    // Use JSON mode for safer parsing
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [prompt],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    let content = completion.choices?.[0]?.message?.content ?? "";
    console.log(content);
    // Fallback: strip accidental ```json fences if the model ever includes them
    if (content.trim().startsWith("```")) {
      content = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    }

    let ai;
    try {
      ai = JSON.parse(content);
    } catch (err) {
      console.error("❌ Failed to parse AI JSON:", content);
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // --- sanitize & map to your Prisma schema ---
    const toNumber = (v) => {
      if (typeof v === "number") return v;
      const m = String(v ?? "").match(/\d+/);
      return m ? Number(m[0]) : 0;
    };
    const toArray = (v) =>
      Array.isArray(v) ? v.filter(Boolean) :
      typeof v === "string" ? v.split(/,\s*/).filter(Boolean) : [];

    const created = await prisma.$transaction(
      ai.workouts.map((workout) =>
        prisma.workout.create({
          data: {
            userId: session.user.id,
            name: workout.name || "Untitled Workout",
            description: workout.description || "",
            difficulty: String(workout.difficulty || "beginner").toLowerCase(),
            duration: Number(workout.duration) || 60,
            isCompleted: false,
            date: workout.date ? new Date(workout.date) : new Date(),
            equipment: Array.isArray(workout.equipment) ? workout.equipment : [],
            instructions: Array.isArray(workout.instructions) ? workout.instructions : [],
            muscleGroup: workout.muscleGroup || null,
          },
        })
      )
    ); 

    // Return the saved record (so your UI can show it right away)
    return NextResponse.json(created, { status: 200 });
  } catch (error) {
    console.error("💥 generateWorkout error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}



// TODO: pull in all preferences relative to workouts
// TODO: Delete existing workout for a day if present then recreate.
// currently it just adds another workout

// TODO: Date range needs to be passed to this, not hardcoded
// also, workouts per week probly needs to be a day of the week selector