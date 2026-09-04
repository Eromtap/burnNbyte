import { requireAppSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import WorkoutLog from '@/components/WorkoutLog';

export default async function WorkoutLogPage() {
  const { session } = await requireAppSession();
  const sessions = await prisma.workout.findMany({
    // A workout belongs in the log once the user has recorded at least one exercise.
    // Completion remains a separate, session-level status.
    where: {
      userId: session.user.id,
      exerciseLogs: { some: { userId: session.user.id } },
    },
    include: {
      exerciseLogs: {
        where: { userId: session.user.id },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { date: 'desc' },
    take: 60,
  });

  return (
    <main className="bn-route-page bn-train-page">
      <div className="page-shell stack">
        <WorkoutLog sessions={sessions} />
      </div>
    </main>
  );
}
