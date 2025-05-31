import prisma from '@/lib/prisma';

export async function GET() {
  
  const workouts = await prisma.workout.findMany();

  return Response.json(workouts);
}