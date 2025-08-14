import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { goal, fitnessLevel, duration } = body;

    if (!goal) {
      return NextResponse.json({ error: "Missing required field: goal" }, { status: 400 });
    }

    const prompt = `
Create a workout for a user whose goal is: "${goal}", fitness level is: "${fitnessLevel},
workout duration is: ${duration} minutes".
Return a JSON object with the following fields only:

{
  "name": "...",
  "description": "...",
  "muscleGroup": "...",
  "equipment": "[...]",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "duration": "..."
  "instructions": "[...]"
  "isCompleted": "false",
  "createdAt": "1900-01-01",
  "updatedAt": "1900-01-01"
}

Only return valid JSON. Do not include anything else. Do not include json '''
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0].message.content;
    console.log(content)
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("❌ Failed to parse AI response:", content);
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("💥 OpenAI error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}


// TODO: add exercise preferences and stuff