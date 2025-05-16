// app/api/workouts/route.js
// import prisma from '@/lib/prisma';
import prisma from '@/lib/prisma';

export async function GET() {
  const workouts = await prisma.workout.findMany();
  console.log(workouts);
  return Response.json(workouts);
}