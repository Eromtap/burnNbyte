// src/app/api/generateWorkout/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAppApiSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { describeFitnessGoals, normalizeFitnessGoals } from "@/constants/fitnessGoals";
import { normalizeEquipmentAccess } from "@/constants/equipmentAccess";



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
            instructions: { type: "array", minItems: 5, items: { type: "string" } },
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

function cleanInstructionStep(step) {
  if (typeof step !== "string") return "";
  return step.replace(/\s+/g, " ").trim();
}

function splitExerciseNames(value) {
  return String(value || "")
    .split(/,|\/|&|\band\b/gi)
    .map((item) => item.replace(/^\s*[-•]\s*/, "").trim())
    .filter(Boolean);
}

function normalizeSharedPrescription(step) {
  const cleaned = cleanInstructionStep(step);
  if (!cleaned) return "";
  const withoutLead = cleaned
    .replace(/^perform\s+/i, "")
    .replace(/^do\s+/i, "")
    .replace(/\s+for each exercise\b/i, "")
    .replace(/\s+on each exercise\b/i, "")
    .trim();
  return withoutLead.replace(/\.$/, "").trim();
}

function expandWorkoutInstructions(instructions) {
  if (!Array.isArray(instructions)) return [];

  const normalized = [];
  let sharedPrescription = "";

  for (const rawStep of instructions) {
    const step = cleanInstructionStep(rawStep);
    if (!step) continue;

    const exerciseListMatch = step.match(/^Exercises?\s*:\s*(.+)$/i);
    if (exerciseListMatch) {
      const exerciseNames = splitExerciseNames(exerciseListMatch[1]);
      if (exerciseNames.length) {
        for (const exerciseName of exerciseNames) {
          normalized.push(
            sharedPrescription
              ? `${exerciseName}: ${sharedPrescription}.`
              : `${exerciseName}.`
          );
        }
        sharedPrescription = "";
        continue;
      }
    }

    if (/\b(each|every)\s+exercise\b/i.test(step) && /\bsets?\b/i.test(step)) {
      sharedPrescription = normalizeSharedPrescription(step);
      continue;
    }

    normalized.push(step);
  }

  return normalized;
}

function looksLikeExerciseInstruction(step) {
  const cleaned = cleanInstructionStep(step).toLowerCase();
  if (!cleaned) return false;
  return (
    cleaned.includes(":") ||
    /\b\d+\s+sets?\b/.test(cleaned) ||
    /\b\d+\s+reps?\b/.test(cleaned) ||
    /\bminutes?\b/.test(cleaned) ||
    /\bseconds?\b/.test(cleaned) ||
    /\bcardio\b/.test(cleaned)
  );
}

function workoutHasUsableInstructions(workout) {
  const instructions = expandWorkoutInstructions(workout?.instructions);
  if (instructions.length < 5) return false;
  const detailedCount = instructions.filter(looksLikeExerciseInstruction).length;
  return detailedCount >= 3;
}

async function generateStructuredWorkouts(messages) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    response_format: { type: "json_schema", json_schema: WORKOUT_SCHEMA },
    temperature: 0.7,
  });

  let content = completion.choices?.[0]?.message?.content ?? "";
  if (content.trim().startsWith("```")) {
    content = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }

  return JSON.parse(content);
}

export async function POST(req) {
  const todayDate = new Date();
  const today = todayDate.toLocaleDateString();
  const plus7Date = new Date(todayDate);
  plus7Date.setDate(plus7Date.getDate() + 7);
  const todayPlus7 = plus7Date.toLocaleDateString();
  

  try {
    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = await req.json();
    const {
      gender,
      heightFt,
      heightIn,
      weight,
      fitnessGoal,
      fitnessGoals,
      fitnessLevel = "beginner", 
      workoutPreference = "mixed",
      workoutDuration = "60",
      workoutDays,
      equipmentAccess,
      dateRange = today + ' - ' + todayPlus7,
      dates = []
    } = body;

    const goalList = normalizeFitnessGoals(fitnessGoals ?? fitnessGoal);
    const primaryGoal = goalList[0] || (typeof fitnessGoal === 'string' ? fitnessGoal : '');
    const goalDescriptions = describeFitnessGoals(goalList);
    const goalText = goalDescriptions.length ? goalDescriptions.join("; ") : primaryGoal;
    if (!primaryGoal) {
      return NextResponse.json({ error: "Missing required field: goal" }, { status: 400 });
    }
    const equipmentList = normalizeEquipmentAccess(equipmentAccess);

    const targetDates = Array.isArray(dates)
      ? dates
          .map((d) => {
            try {
              const normalized = new Date(d);
              if (Number.isNaN(normalized.getTime())) return null;
              const y = normalized.getUTCFullYear();
              const m = String(normalized.getUTCMonth() + 1).padStart(2, "0");
              const day = String(normalized.getUTCDate()).padStart(2, "0");
              return `${y}-${m}-${day}`;
            } catch {
              return null;
            }
          })
          .filter(Boolean)
      : [];

    if (!targetDates.length) {
      return NextResponse.json({ error: "No target dates supplied" }, { status: 400 });
    }

    const normalizeUTCDate = (value) => {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      d.setUTCHours(0, 0, 0, 0);
      return d;
    };
    const targetDateObjs = targetDates
      .map((d) => normalizeUTCDate(d))
      .filter(Boolean);
    const rangeStart = targetDateObjs.length ? new Date(Math.min(...targetDateObjs.map((d) => d.getTime()))) : null;
    const rangeEnd = targetDateObjs.length ? new Date(Math.max(...targetDateObjs.map((d) => d.getTime()))) : null;
    const existingWorkouts = rangeStart && rangeEnd
      ? await prisma.workout.findMany({
          where: { userId: session.user.id, date: { gte: rangeStart, lte: rangeEnd } },
          select: { date: true, name: true, muscleGroup: true, difficulty: true, duration: true },
          orderBy: { date: "asc" },
        })
      : [];
    const recentLogs = await prisma.exerciseLog.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    const prompt = {
      role: "user",
      content:
        `Create a workout plan for each calendar date listed. Return one workout entry per date in the same order they are provided. Only generate workouts on those dates and set the "date" field exactly to the yyyy-mm-dd string supplied.
        Include enough exercises to fill the allotted workout duration. Balance muscle groups across the week and avoid repeating the same muscle group on consecutive days when possible.
      - gender: "${gender}"
      - heightFt: "${heightFt}" feet
      - heightIn: "${heightIn}" inches
      - weight: "${weight}" pounds
      - fitnessGoals: ${JSON.stringify(goalList.length ? goalList : [primaryGoal])}
      - goal details: ${goalText}
      - fitness level: "${fitnessLevel}"
      - preferred split: "${workoutPreference}"
      - workoutDuration: ${workoutDuration}
      - preferred workoutDays: ${JSON.stringify(workoutDays)}
      - available equipment: ${JSON.stringify(equipmentList)}
      - targetDates: ${JSON.stringify(targetDates)}
      - existingWorkouts: ${JSON.stringify(existingWorkouts.map((w) => ({
        date: w.date?.toISOString?.().slice(0, 10) || null,
        name: w.name,
        muscleGroup: w.muscleGroup,
        difficulty: w.difficulty,
        duration: w.duration,
      })))}
      - recentExerciseLogs: ${JSON.stringify(recentLogs.map((log) => ({
        exerciseName: log.exerciseName,
        type: log.type,
        weight: log.weight,
        reps: log.reps,
        sets: log.sets,
        distance: log.distance,
        pace: log.pace,
        createdAt: log.createdAt?.toISOString?.() || null,
      })))}

      Progression rules:
      - If you include a previously logged weighted exercise, increase weight slightly (2.5-5 lb) and keep sets/reps similar.
      - If you include a previously logged cardio exercise, increase distance slightly (0.1-0.25 mi) OR improve pace slightly (5-10 sec/mi), not both.
      - Include the target weight/distance/pace in the instructions array so the user can follow the progression.
      - Every entry in "instructions" must be a single discrete step or a single discrete exercise. One exercise per array item.
      - Never combine multiple exercises into one instruction.
      - Never say "for each exercise", "repeat for all exercises", or "Exercises: squat, lunge, curl" in one item.
      - If a workout includes 5 exercises, there should be at least 5 separate exercise instruction items.
      - Each workout must have at least 5 instruction items total.
      - At least 3 instruction items must be actual exercise prescriptions with sets/reps/weight/distance/pace.
      - Good format examples: "Squats: 3 sets of 8 reps at 135 lb.", "Walking Lunges: 3 sets of 10 reps per leg.", "Cool down with 5 minutes of stretching."
      - Treat the preferred split as a real constraint when it fits the requested number of days. For example: "full_body" should bias toward full-body sessions, "push_pull_legs" should bias toward a PPL rotation, "upper_lower" should bias toward upper/lower alternation, and "body_part" should bias toward dedicated muscle-group days.
      - If the preferred split does not fit the number of target days exactly, honor the spirit of it as closely as possible instead of ignoring it.

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
      - The array length must match the number of target dates provided.
      - Each workout's "date" must be one of the supplied target dates.
      - Each workout must include: name, description, difficulty, duration, equipment[], instructions[], muscleGroup, date (yyyy-mm-dd).
      - If only one workout is generated, it still must be inside the "workouts" array.
      - Do not include any extra keys or commentary.`
    };

    let ai;
    try {
      ai = await generateStructuredWorkouts([prompt]);
    } catch (err) {
      console.error("❌ Failed to parse AI JSON:", err);
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    const needsRepair =
      !Array.isArray(ai?.workouts) ||
      ai.workouts.length !== targetDates.length ||
      ai.workouts.some((workout) => !workoutHasUsableInstructions(workout));

    if (needsRepair) {
      const repairPrompt = {
        role: "user",
        content:
          `Repair this workout JSON so every workout has usable instructions.
          Requirements:
          - Keep the same dates and overall workout intent.
          - Return one workout per input workout.
          - Every workout must have at least 5 instruction items.
          - At least 3 instruction items must be concrete exercise prescriptions.
          - One exercise per instruction item.
          - Never group multiple exercises into one step.
          - Replace vague outputs like "Upper Body Strength" with actual exercise-by-exercise instructions.
          - Return only JSON matching the required schema.

          Input JSON:
          ${JSON.stringify(ai)}`
      };

      try {
        ai = await generateStructuredWorkouts([prompt, repairPrompt]);
      } catch (err) {
        console.error("❌ Failed to repair AI workout JSON:", err);
        return NextResponse.json({ error: "Failed to repair workout instructions" }, { status: 500 });
      }
    }

    const normalizedDate = (d) => {
      if (!d) return null;
      const date = new Date(d);
      if (Number.isNaN(date.getTime())) return null;
      date.setUTCHours(0, 0, 0, 0);
      return date;
    };

    const fallbackDates = targetDates
      .map((d) => normalizedDate(d))
      .filter(Boolean);

    const created = await prisma.$transaction(async (tx) => {
      const out = [];
      for (const w of ai.workouts) {
        let date = normalizedDate(w.date);
        if (!date) {
          date = fallbackDates.shift() ?? normalizedDate(Date.now());
        } else {
          const iso = date.toISOString().slice(0, 10);
          const idx = targetDates.indexOf(iso);
          if (idx !== -1) {
            fallbackDates.splice(idx, 1);
          }
        }
        if (!date) continue; // skip unparseable entries

        const existing = await tx.workout.findFirst({ where: { userId: session.user.id, date } });
        let rec;
        const dataCommon = {
          name: w.name || "Untitled Workout",
          description: w.description || "",
          difficulty: String(w.difficulty || "beginner").toLowerCase(),
          duration: Number(w.duration) || 60,
          isCompleted: false,
          equipment: Array.isArray(w.equipment) ? w.equipment : [],
          instructions: expandWorkoutInstructions(w.instructions),
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
