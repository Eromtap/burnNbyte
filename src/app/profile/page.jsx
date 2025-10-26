import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import ProfileForm from "@/components/ProfileForm";
import { redirect } from "next/navigation";

export default async function ProfilePage(){
  const session = await requireAuth();
  const profile = await prisma.userProfile.findUnique({ where: { userId: String(session.user.id) } });
  if (!profile) redirect('/onboarding/1');

  return (
    <main>
      <div className="stack">
        <article className="card">
          <header className="card-head">
            <h3>Profile</h3>
            <div className="sub">Update your preferences</div>
          </header>
          <ProfileForm initial={profile} />
        </article>
      </div>
    </main>
  );
}
