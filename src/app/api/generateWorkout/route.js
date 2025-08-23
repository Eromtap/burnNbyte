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
        `Create a workout plan given:
      - gender: "${gender}"
      - heightFt: "${heightFt}" feet
      - heightIn: "${heightIn}" inches
      - weight: "${weight}" pounds
      - fitnessGoal: "${fitnessGoal}"
      - fitness level: "${fitnessLevel}"
      - workoutPreference: "${workoutPreference}"
      - workoutDuration: ${workoutDuration} minutes
      - workoutFrequency: "${workoutFrequency}" days per week

      Return ONLY a JSON object with these fields (no commentary, no code fences):
      {
        "name": "string",
        "description": "string",
        "difficulty": "beginner" | "intermediate" | "advanced",
        "duration": "string or number (minutes)",
        "equipment": ["string", ...],
        "instructions": ["string step", ...],
        "muscleGroup": "string"
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

    const data = {
      userId: session.user.id,                          // <- from session, not client
      name: ai.name || "Untitled Workout",
      description: ai.description || "",
      difficulty: String(ai.difficulty || "beginner").toLowerCase(),
      duration: toNumber(ai.duration),
      isCompleted: false,
      date: new Date(),                    
      equipment: toArray(ai.equipment),
      instructions: toArray(ai.instructions),
      muscleGroup: ai.muscleGroup
    };

    const created = await prisma.workout.create({ data });

    // Return the saved record (so your UI can show it right away)
    return NextResponse.json(created, { status: 200 });
  } catch (error) {
    console.error("💥 generateWorkout error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}



// TODO: pull in all preferences relative to workouts