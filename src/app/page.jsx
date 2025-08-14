import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from 'next/link';
import WorkoutForm from "@/components/WorkoutForm";
import AuthStatus from "@/components/AuthStatus";
import { requireAuth } from "@/lib/auth";
import ClientOnly from "@/components/ClientOnly";
import TestExerciseButton from "@/components/TestExerciseButton";



export default async function HomePage() {

  const session = await requireAuth();

  return (
    <main>
      <AuthStatus />
      <h1>Welcome to Burn-N-Byte!</h1>
            <p>This is the main landing page.</p>
      <div>
        <Link href="/workoutCalendar">
          <button>Workout Calendar</button>
        </Link>
      </div>
      <ClientOnly>
        <WorkoutForm />
      </ClientOnly>
      <TestExerciseButton />
    </main>
  );
}