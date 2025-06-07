import prisma from '@/lib/prisma';

// Workout api

export async function GET() {
  
  const workouts = await prisma.workout.findMany();

  return Response.json(workouts);
}


export async function POST(request){
  const body = await request.json();

  const {userId, name, description, duration, difficulty, date} = body;

  const workout = await prisma.workout.create({
    data: {
      userId,
      name,
      description,
      duration,
      difficulty,
      date: new Date(date),
    },
  });

  return Response.json(workout, { status: 201 });  
}