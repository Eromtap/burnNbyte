import { requireAuth } from "@/lib/auth";
import Calendar from "@/components/Calendar";
import AuthStatus from "@/components/AuthStatus";

export default async function WorkoutCalendar() {
  const session = await requireAuth();

  return (
    <>
      <AuthStatus />
      <Calendar
        calendarTitle="My Health Calendar"
        dataSources={[
          { url: '/api/workouts', type: 'workout' },
          { url: '/api/mealPlans', type: 'mealPlan' },
        ]}
      />
    </>
  );
}
