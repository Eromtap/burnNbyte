import prisma from '@/lib/prisma';

// Workout api

export async function GET() {
  
  const mealPlan = await prisma.mealPlan.findMany();

  return Response.json(mealPlan);
}



// TODO: this needs to be meal, not meal plan. Like how workout table replaced excersize 