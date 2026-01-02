import { requireAuth } from "@/lib/auth";
import Calendar from "@/components/Calendar";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function HealthCalendar() {
  const session = await requireAuth();
  const profile = await prisma.userProfile.findUnique({ where: { userId: String(session.user.id) } });
  if (!profile) redirect('/onboarding/1');

  return (
    <main>
      <div className="page-shell">
        <Calendar
          calendarTitle="My Health Calendar"
          dataSources={[
            { url: '/api/workouts', type: 'workout' },
            { url: '/api/mealPlans', type: 'mealPlan' },
          ]}
        />
      </div>
    </main>
  );
}
