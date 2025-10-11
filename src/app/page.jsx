// app/page.jsx (server component)
import { getServerSession } from "next-auth/next"; // ✅ correct import
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import AuthStatus from "@/components/AuthStatus";
import GenerateWorkout from "@/components/GenerateWorkout";
import GenerateMealPlan from "@/components/GenerateMealPlan";
import Link from "next/link";

export default async function HomePage() {
  const session = await getServerSession(authOptions); // now defined
  if (!session) redirect("/signin");

  const profile = await prisma.userProfile.findUnique({
    where: { userId: String(session.user.id) },
  });

  if (!profile) redirect("/onboarding/1");

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
      <GenerateMealPlan /> {/* Add this button for meal plans */}
    </main>
  );
}
