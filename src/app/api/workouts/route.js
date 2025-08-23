// app/api/workouts/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  
  const workouts = await prisma.workout.findMany({
    where: {
      userId: userId
    }
  });

  return Response.json(workouts);
}
