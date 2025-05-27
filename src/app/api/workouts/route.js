import prisma from '@/lib/prisma';

export async function GET() {
  const dbHost = new URL(process.env.DATABASE_URL || '').host;
  const dbName = process.env.PGDATABASE || 'undefined';
  
  const workouts = await prisma.workout.findMany();

  console.log('✅ Staging route hit');
  console.log('➡️ Connected to host:', dbHost);
  console.log('➡️ Using database:', dbName);
  console.log('📦 Workouts fetched:', workouts.length);
  console.log('🧪 Sample workout:', workouts[0]);

  return Response.json(workouts);
}