// app/api/workouts/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();



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

// export async function POST(req) {
//   const session = await getServerSession(authOptions);
//   const userId = session?.user?.id;

//   if (!userId) {
//     return new Response(JSON.stringify({ error: 'Unauthorized' }), {
//       status: 401,
//       headers: { 'Content-Type': 'application/json' },
//     });
//   }

//   const body = await req.json();
//   console.log(body)


//   const toNumber = (v) => {
//     if (typeof v === 'number') return v;
//     const m = String(v ?? '').match(/\d+/);
//     return m ? Number(m[0]) : 0;
//   };

//   const data = {
//     userId, // <- from session, ignore any client-sent userId
//     name: body.name ?? 'Untitled Workout',
//     description: body.description ?? '',
//     // muscleGroup: body.muscleGroup ?? null,
//     // equipment: toArray(body.equipment),
//     difficulty: (body.difficulty ?? 'beginner').toLowerCase(),
//     duration: toNumber(body.duration),
//     // instructions: toArray(body.instructions),
//     isCompleted: Boolean(body.isCompleted ?? false),
//     date: body.date ?? new Date().toISOString(),
//   };

//   const created = await prisma.workout.create({ data });
//   return new Response(JSON.stringify(created), {
//     status: 200,
//     headers: { 'Content-Type': 'application/json' },
//   });
// }


// TODO: add columns to workout table for muscle group, equpment, instructions etc.
// TODO: get rid of commented code if nothing breaks