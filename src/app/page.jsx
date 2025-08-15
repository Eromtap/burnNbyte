// import { getServerSession } from "next-auth";
// import { authOptions } from "@/app/api/auth/[...nextauth]/route";
// import { redirect } from "next/navigation";
// import WorkoutForm from "@/components/WorkoutForm";
// import ClientOnly from "@/components/ClientOnly";
import Link from 'next/link';
import AuthStatus from "@/components/AuthStatus";
import { requireAuth } from "@/lib/auth";
import GenerateWorkout from '@/components/GenerateWorkout';



export default async function HomePage() {

  const session = await requireAuth();

  return (
    <main>
      <AuthStatus />
      <h1>Welcome to Burn-N-Byte!</h1>
            <p>This is the main landing page.</p>
      <div>
        <Link href="/healthCalendar">
          <button>Calendar</button>
        </Link>
      </div>
      {/* <ClientOnly>
        <WorkoutForm />
      </ClientOnly> */}
      <GenerateWorkout />
    </main>
  );
}

// TODO: If everything works with imports commented out, delete them evenutally
// TODO: remove workoutForm when verified not needed