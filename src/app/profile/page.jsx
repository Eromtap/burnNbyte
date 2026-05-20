import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import ProfileForm from "@/components/ProfileForm";
import ThemePreferencesCard from "@/components/ThemePreferencesCard";
import { redirect } from "next/navigation";

export default async function ProfilePage(){
  const session = await requireAuth();
  const profile = await prisma.userProfile.findUnique({ where: { userId: String(session.user.id) } });
  if (!profile) redirect('/onboarding/1');

  return (
    <main>
      <div className="page-shell stack">
        <section className="hero-card page-hero">
          <div className="page-hero-copy">
            <div className="eyebrow">Profile and preferences</div>
            <div>
              <h1 className="page-hero-title">Set the inputs once so workouts and meals stay aligned.</h1>
              <p className="page-hero-text">
                Your profile drives workout duration, equipment assumptions, dietary filters, and macro planning. This should feel like system setup, not a generic form.
              </p>
            </div>
          </div>
          <aside className="hero-panel hero-metrics">
            <div className="metric-card">
              <div className="metric-label">Primary goal</div>
              <div className="metric-value" style={{ fontSize: '1.5rem' }}>{profile.fitnessGoal || profile.fitnessGoals?.[0] || 'General fitness'}</div>
              <div className="metric-detail">Workout duration {profile.workoutDuration || 30} min • {profile.mealsPerDay || 3} meals per day</div>
            </div>
          </aside>
        </section>

        <ThemePreferencesCard />

        <article className="card">
          <header className="card-head">
            <div>
              <h3>Profile settings</h3>
              <div className="sub">Update the preferences the planner should respect.</div>
            </div>
          </header>
          <ProfileForm initial={profile} />
        </article>
      </div>
    </main>
  );
}
