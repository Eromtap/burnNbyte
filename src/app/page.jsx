import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from 'next/link';
import WorkoutForm from "./components/WorkoutForm";


export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/signin");
  }

  return (
    <main>
      <h1>Welcome to Burn-N-Byte!</h1>
            <p>This is the main landing page.</p>
      <div>
        <Link href="/workoutCalendar">
          <button>Workout Calendar</button>
        </Link>
      </div>
      <WorkoutForm />
    </main>
  );
}