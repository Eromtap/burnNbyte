import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAppApiSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000,
  maxRetries: 0,
});

export async function POST(req) {
  try {
    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;

    const body = await req.json();
    const workoutId = String(body?.workoutId || '');
    const instructionIndex = Number(body?.instructionIndex);
    const mode = ['ai', 'delete'].includes(body?.mode) ? body.mode : 'custom';
    const requestedInstruction = String(body?.instruction || '').trim();

    if (!workoutId || !Number.isInteger(instructionIndex) || instructionIndex < 0) {
      return NextResponse.json({ error: 'Invalid exercise replacement request.' }, { status: 400 });
    }

    const workout = await prisma.workout.findFirst({
      where: { id: workoutId, userId: auth.session.user.id },
    });
    if (!workout) return NextResponse.json({ error: 'Workout not found.' }, { status: 404 });

    const instructions = Array.isArray(workout.instructions) ? [...workout.instructions] : [];
    const currentInstruction = instructions[instructionIndex];
    if (typeof currentInstruction !== 'string') {
      return NextResponse.json({ error: 'Exercise not found.' }, { status: 404 });
    }

    if (mode === 'delete') {
      if (instructions.length <= 1) {
        return NextResponse.json({ error: 'A workout needs at least one instruction.' }, { status: 400 });
      }
      instructions.splice(instructionIndex, 1);
      const updatedWorkout = await prisma.workout.update({
        where: { id: workout.id },
        data: { instructions },
      });
      return NextResponse.json({ workout: updatedWorkout });
    }

    let replacement = requestedInstruction;
    if (mode === 'ai') {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_WORKOUT_MODEL || 'gpt-4o-mini',
        temperature: 0.5,
        messages: [{
          role: 'user',
          content: `You are a careful fitness coach. Replace exactly one workout instruction with a safe, comparable alternative.\n\nWorkout: ${workout.name}\nCurrent instruction: ${currentInstruction}\nUser preference: ${requestedInstruction || 'Choose a useful alternative.'}\n\nReturn JSON only in the form {"instruction":"Exercise Name: sets/reps or duration, with a concise coaching cue."}. Do not include warm-up or cooldown instructions unless the original is one.`,
        }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'workout_instruction_replacement',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['instruction'],
              properties: { instruction: { type: 'string' } },
            },
          },
        },
      });
      const content = completion.choices?.[0]?.message?.content || '';
      replacement = JSON.parse(content)?.instruction?.trim();
    }

    if (!replacement || replacement.length > 500) {
      return NextResponse.json({ error: 'Enter a valid replacement exercise.' }, { status: 400 });
    }

    instructions[instructionIndex] = replacement;
    const updatedWorkout = await prisma.workout.update({
      where: { id: workout.id },
      data: { instructions },
    });

    return NextResponse.json({ workout: updatedWorkout });
  } catch (error) {
    console.error('workout instruction replacement failed', error);
    return NextResponse.json({ error: 'Unable to replace that exercise right now.' }, { status: 500 });
  }
}
