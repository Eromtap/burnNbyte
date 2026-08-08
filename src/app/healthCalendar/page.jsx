import { requireAppSession } from "@/lib/auth";
import Calendar from "@/components/Calendar";
import { getSessionUserProfile } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function HealthCalendar() {
  const { session } = await requireAppSession();
  const profile = await getSessionUserProfile(session);
  if (!profile) redirect('/onboarding/1');

  const [workouts, mealPlans] = await Promise.all([
    prisma.workout.findMany({
      where: { userId: session.user.id },
      orderBy: { date: 'asc' },
    }),
    prisma.mealPlan.findMany({
      where: { userId: session.user.id },
      include: { meals: true },
      orderBy: { date: 'asc' },
    }),
  ]);

  const merged = {};
  for (const w of workouts) {
    const date = w.date?.toISOString?.().slice(0, 10);
    if (!date) continue;
    if (!merged[date]) merged[date] = { workouts: [], mealPlan: null };
    merged[date].workouts.push(w);
  }
  for (const mp of mealPlans) {
    if (!Array.isArray(mp.meals) || mp.meals.length === 0) continue;
    const date = mp.date?.toISOString?.().slice(0, 10);
    if (!date) continue;
    if (!merged[date]) merged[date] = { workouts: [], mealPlan: null };
    const existing = merged[date].mealPlan;
    if (!existing || new Date(mp.createdAt) > new Date(existing.createdAt)) {
      merged[date].mealPlan = mp;
    }
  }

  const initialEvents = Object.entries(merged).flatMap(([date, value]) => {
    const events = [];
    for (const w of value.workouts) {
      events.push({
        title: 'Workout',
        date,
        classNames: ['event-workout'],
        extendedProps: { type: 'workout', ...w },
      });
    }
    if (value.mealPlan) {
      events.push({
        title: 'Meal Plan',
        date,
        classNames: ['event-meal'],
        extendedProps: { type: 'mealPlan', meals: value.mealPlan.meals },
      });
    }
    return events;
  });

  return (
    <main className="bn-route-page bn-calendar-page">
      <div className="page-shell stack">
        <section className="bn-route-intro">
          <div>
            <div className="eyebrow">Training rhythm</div>
            <h1>See the week before<br /><em>it gets away.</em></h1>
            <p>Workouts and meals share one timeline, so your plan reads like a schedule instead of a checklist.</p>
          </div>
          <aside>
            <span>Calendar view</span>
            <strong>One plan. Two signals.</strong>
            <small>Training and nutrition, aligned by day</small>
          </aside>
        </section>
        <Calendar
          calendarTitle="My Health Calendar"
          dataSources={[
            { url: '/api/workouts', type: 'workout' },
            { url: '/api/mealPlans', type: 'mealPlan' },
          ]}
          initialEvents={initialEvents}
        />
      </div>
    </main>
  );
}
