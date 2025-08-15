// import { NextResponse } from "next/server";
// import OpenAI from "openai";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// export async function POST(req) {
//   try {
//     const body = await req.json();
//     const { goal, fitnessLevel, duration } = body;

//     if (!goal) {
//       return NextResponse.json({ error: "Missing required field: goal" }, { status: 400 });
//     }

//     const prompt = `
// Create a workout for a user whose goal is: "${goal}", fitness level is: "${fitnessLevel},
// workout duration is: ${duration} minutes".
// Return a JSON object with the following fields only:

// {
//   "name": "...",
//   "description": "...",
//   "muscleGroup": "...",
//   "equipment": "[...]",
//   "difficulty": "beginner" | "intermediate" | "advanced",
//   "duration": "..."
//   "instructions": "[...]"
//   "isCompleted": "false",
//   "createdAt": "1900-01-01",
//   "updatedAt": "1900-01-01"
// }

// Only return valid JSON. Do not include anything else. Do not include json '''
// `;

//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o",
//       messages: [{ role: "user", content: prompt }],
//     });

//     const content = completion.choices[0].message.content;
//     let parsed;
//     try {
//       parsed = JSON.parse(content);
//     } catch (err) {
//       console.error("❌ Failed to parse AI response:", content);
//       return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
//     }

//     return NextResponse.json(parsed);
//   } catch (error) {
//     console.error("💥 OpenAI error:", error);
//     return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
//   }
// }


// TODO: add exercise preferences and stuff
// TODO: ChatGPT likes to sometimes return '''json...''' with the response
// need to parse the string better for that eventuality as it breaks 
// the workout generation


// src/app/api/generateWorkout/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
// import { authOptions } from "../auth/[...nextauth]/authOptions"; // <- adjust path if needed
// import { prisma } from "@/lib/prisma";
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { goal, fitnessLevel = "beginner", duration = "60" } = body;

    if (!goal) {
      return NextResponse.json({ error: "Missing required field: goal" }, { status: 400 });
    }

    // Ask only for fields your schema actually stores.
    // If your Prisma model has JSON columns for equipment/instructions, keep them.
    // Otherwise, remove those keys from both the prompt and the mapping below.
    const prompt = {
      role: "user",
      content:
        `Create a workout plan given:
- goal: "${goal}"
- fitness level: "${fitnessLevel}"
- duration: ${duration} minutes

Return ONLY a JSON object with these fields (no commentary, no code fences):
{
  "name": "string",
  "description": "string",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "duration": "string or number (minutes)",
  "equipment": ["string", ...],
  "instructions": ["string step", ...]
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
      date: new Date(),                                 // or store planned date if you have one
      // If your schema has these as Json:
      // equipment: toArray(ai.equipment),
      // instructions: toArray(ai.instructions),
      // muscleGroup: ai.muscleGroup
    };

    // IMPORTANT: pass only fields that exist in your Prisma model
    const created = await prisma.workout.create({ data });

    // Return the saved record (so your UI can show it right away)
    return NextResponse.json(created, { status: 200 });
  } catch (error) {
    console.error("💥 generateWorkout error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

// TODO: Prisma client is used wrong, will create multiple clients
// need to fix that. Basically everywhere we use prisma needs to be fixed
// TODO: get rid of commented code if nothing breaks