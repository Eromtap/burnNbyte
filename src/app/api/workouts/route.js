import prisma from '@/lib/prisma';

// Workout api

export async function GET() {
  
  const workouts = await prisma.workout.findMany();

  return Response.json(workouts);
}