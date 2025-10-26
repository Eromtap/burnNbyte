import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import PantryCapture from "@/components/PantryCapture";

export default async function PantryPage() {
  const session = await requireAuth();
  const profile = await prisma.userProfile.findUnique({ where: { userId: String(session.user.id) } });
  if (!profile) redirect('/onboarding/1');

  return (
    <main>
      <div className="stack">
        <article className="card">
          <header className="card-head">
            <h3>Pantry Planner</h3>
            <div className="sub">Snap your cabinet and get meal ideas</div>
          </header>
          <PantryCapture />
        </article>
      </div>
    </main>
  );
}

