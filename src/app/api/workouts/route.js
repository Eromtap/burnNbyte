// import prisma from '@/lib/prisma';

// // Workout api

// export async function GET() {
  
//   const workouts = await prisma.workout.findMany();

//   return Response.json(workouts);
// }


// export async function POST(request){
//   const body = await request.json();

//   const {userId, name, description, duration, difficulty, date} = body;

//   const workout = await prisma.workout.create({
//     data: {
//       userId,
//       name,
//       description,
//       duration,
//       difficulty,
//       date: new Date(date),
//     },
//   });

//   return Response.json(workout, { status: 201 });  
// }


// app/api/workouts/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json();

  // Normalize inputs (mirror your client helpers)
  const toArray = (v) =>
    Array.isArray(v)
      ? v
      : typeof v === 'string'
      ? v.split(/,\s*/).filter(Boolean)
      : [];

  const toNumber = (v) => {
    if (typeof v === 'number') return v;
    const m = String(v ?? '').match(/\d+/);
    return m ? Number(m[0]) : 0;
  };

  const data = {
    userId, // <- from session, ignore any client-sent userId
    name: body.name ?? 'Untitled Workout',
    description: body.description ?? '',
    // muscleGroup: body.muscleGroup ?? null,
    // equipment: toArray(body.equipment),
    difficulty: (body.difficulty ?? 'beginner').toLowerCase(),
    duration: toNumber(body.duration),
    // instructions: toArray(body.instructions),
    isCompleted: Boolean(body.isCompleted ?? false),
    date: body.date ?? new Date().toISOString(),
  };

  const created = await prisma.workout.create({ data });
  return new Response(JSON.stringify(created), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
