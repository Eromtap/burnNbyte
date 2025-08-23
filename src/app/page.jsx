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
      <GenerateWorkout />
    </main>
  );
}
