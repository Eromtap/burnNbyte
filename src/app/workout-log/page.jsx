import { requireAppSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import WorkoutLog from '@/components/WorkoutLog';

export default async function WorkoutLogPage() {
  const { session } = await requireAppSession();
  const sessions = await prisma.workout.findMany({
    where: { userId: session.user.id, isCompleted: true },
    include: {
      exerciseLogs: {
        where: { userId: session.user.id },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: [{ completedAt: 'desc' }, { date: 'desc' }],
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
