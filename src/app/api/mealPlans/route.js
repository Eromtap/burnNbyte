import prisma from '@/lib/prisma';

// Workout api

export async function GET() {
  
  const mealPlan = await prisma.mealPlan.findMany();

  return Response.json(mealPlan);
}
