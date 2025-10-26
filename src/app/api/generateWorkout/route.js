// src/app/api/generateWorkout/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from "@/lib/prisma";



const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const WORKOUT_SCHEMA = {
  name: "workouts",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      workouts: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name","description","difficulty","duration","equipment","instructions","muscleGroup","date"],
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            difficulty: { enum: ["beginner","intermediate","advanced"] },
            duration: { anyOf: [{ type: "integer" }, { type: "string" }] },
            equipment: { type: "array", items: { type: "string" } },
            instructions: { type: "array", items: { type: "string" } },
            muscleGroup: { type: "string" },
            date: { type: "string" } // ISO yyyy-mm-dd
          }
        }
      }
    },
    required: ["workouts"]
  },
  strict: true,
};

export async function POST(req) {
  const todayDate = new Date();
  const today = todayDate.toLocaleDateString();
  const plus7Date = new Date(todayDate);
  plus7Date.setDate(plus7Date.getDate() + 7);
  const todayPlus7 = plus7Date.toLocaleDateString();
  

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
      workoutDays,
      dateRange = today + ' - ' + todayPlus7
    } = body;

    if (!fitnessGoal) {
      return NextResponse.json({ error: "Missing required field: goal" }, { status: 400 });
    }

    const prompt = {
      role: "user",
      content:
        `Create a workout plan for each day specified in workoutDays in the date range given. 
        include a number of exercises that will fit in the alloted workout duration:
      - gender: "${gender}"
      - heightFt: "${heightFt}" feet
      - heightIn: "${heightIn}" inches
      - weight: "${weight}" pounds
      - fitnessGoal: "${fitnessGoal}"
      - fitness level: "${fitnessLevel}"
      - workoutPreference: "${workoutPreference}"
      - workoutDuration: ${workoutDuration}
      - workoutDays: ${workoutDays},
      - dateRange: ${dateRange}

      Return ONLY a JSON object with these fields (no commentary, no code fences):
      {
        "name": "string",
        "description": "string",
        "difficulty": "beginner" | "intermediate" | "advanced",
        "duration": "string or number (minutes)",
        "equipment": ["string", ...],
        "instructions": ["string step", ...],
        "muscleGroup": "string"
        "date": "date"
      }
        
      Output requirements:
      - Return a JSON object with a single key "workouts" containing an array of workouts.
      - Each workout must include: name, description, difficulty, duration, equipment[], instructions[], muscleGroup, date (yyyy-mm-dd).
      - If only one workout is generated, it still must be inside the "workouts" array.
      - Do not include any extra keys or commentary.`
    };
    console.log(prompt);
    // Use JSON mode for safer parsing
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [prompt],
      response_format: { type: "json_schema", json_schema: WORKOUT_SCHEMA },
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

      const normalizedDate = (d) => {
      const date = new Date(d ?? Date.now());
      date.setUTCHours(0, 0, 0, 0);
      return date;
    };

    const created = await prisma.$transaction(async (tx) => {
      const out = [];
      for (const w of ai.workouts) {
        const date = normalizedDate(w.date);
        const existing = await tx.workout.findFirst({ where: { userId: session.user.id, date } });
        let rec;
        const dataCommon = {
          name: w.name || "Untitled Workout",
          description: w.description || "",
          difficulty: String(w.difficulty || "beginner").toLowerCase(),
          duration: Number(w.duration) || 60,
          isCompleted: false,
          equipment: Array.isArray(w.equipment) ? w.equipment : [],
          instructions: Array.isArray(w.instructions) ? w.instructions : [],
          muscleGroup: w.muscleGroup || null,
        };
        if (existing) {
          rec = await tx.workout.update({ where: { id: existing.id }, data: dataCommon });
        } else {
          rec = await tx.workout.create({ data: { userId: session.user.id, date, ...dataCommon } });
        }
        out.push(rec);
      }
      return out;
    });

    return NextResponse.json(created, { status: 200 });
  } catch (error) {
    console.error("💥 generateWorkout error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}



// TODO: pull in all preferences relative to workouts

