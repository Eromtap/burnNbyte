
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Calendar from "../components/Calendar";
import AuthStatus from "../components/AuthStatus";
import { requireAuth } from "@/lib/auth";

export default async function WorkoutCalendar() {

  const session = await requireAuth();

  return (
    <>
      <AuthStatus />
      <div className="calendar-container">
        <Calendar 
            dataSource="/api/workouts"
            calendarTitle="Workout Calendar"/>
      </div>
    </>
  )
}
