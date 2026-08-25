import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAppApiSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 90000,
  maxRetries: 0,
});

const WORKOUT_SCHEMA = {
  name: 'replacement_workout',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'description', 'difficulty', 'duration', 'equipment', 'instructions', 'muscleGroup'],
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      difficulty: { enum: ['beginner', 'intermediate', 'advanced'] },
      duration: { type: 'integer', minimum: 10, maximum: 180 },
      equipment: { type: 'array', items: { type: 'string' } },
      instructions: { type: 'array', minItems: 5, maxItems: 12, items: { type: 'string' } },
      muscleGroup: { type: 'string' },
    },
  },
};

export async function POST(req) {
  try {
    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;

    const { workoutId, request } = await req.json();
    const userRequest = String(request || '').trim();
    if (!workoutId || !userRequest) {
      return NextResponse.json({ error: 'Tell us how you want to change this workout.' }, { status: 400 });
    }

    const workout = await prisma.workout.findFirst({
      where: { id: String(workoutId), userId: auth.session.user.id },
    });
    if (!workout) return NextResponse.json({ error: 'Workout not found.' }, { status: 404 });

    const profile = await prisma.userProfile.findUnique({
      where: { userId: auth.session.user.id },
    });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_WORKOUT_MODEL || 'gpt-4o-mini',
      temperature: 0.6,
      messages: [{
        role: 'user',
        content: `You are a careful fitness coach. Create a replacement for one day's workout. Honor the user's requested change and make appropriate safety accommodations. Do not make medical claims; if they mention pain or injury, avoid stressing that area and choose lower-risk movements.\n\nUser request: ${userRequest}\nCurrent workout: ${JSON.stringify({ name: workout.name, duration: workout.duration, difficulty: workout.difficulty, muscleGroup: workout.muscleGroup, instructions: workout.instructions })}\nProfile: ${JSON.stringify({ fitnessLevel: profile?.fitnessLevel || workout.difficulty, fitnessGoals: profile?.fitnessGoals || profile?.fitnessGoal || [], workoutPreference: profile?.workoutPreference || '', workoutDuration: profile?.workoutDuration || workout.duration, equipmentAccess: profile?.equipmentAccess || [] })}\n\nReturn only a complete, practical replacement workout. Include a concise warm-up, 3–8 exercise instructions with sets/reps or duration, and a concise cooldown.`,
      }],
      response_format: { type: 'json_schema', json_schema: WORKOUT_SCHEMA },
    });
    const content = completion.choices?.[0]?.message?.content || '';
    const replacement = JSON.parse(content);

    const updatedWorkout = await prisma.workout.update({
      where: { id: workout.id },
      data: {
        name: replacement.name.trim(),
        description: replacement.description.trim(),
        difficulty: replacement.difficulty,
        duration: replacement.duration,
        equipment: replacement.equipment.map((item) => String(item).trim()).filter(Boolean),
        instructions: replacement.instructions.map((item) => String(item).trim()).filter(Boolean),
        muscleGroup: replacement.muscleGroup.trim(),
      },
    });
    return NextResponse.json({ workout: updatedWorkout });
  } catch (error) {
    console.error('workout replacement failed', error);
    return NextResponse.json({ error: 'Unable to create a replacement workout right now.' }, { status: 500 });
  }
}
