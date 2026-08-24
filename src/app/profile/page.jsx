import { requireAppSession } from "@/lib/auth";
import ProfileForm from "@/components/ProfileForm";
import { getSessionUserProfile } from "@/lib/auth";
import ThemePreferencesCard from "@/components/ThemePreferencesCard";
import { redirect } from "next/navigation";
import StripeBillingButton from "@/components/StripeBillingButton";
import prisma from "@/lib/prisma";

export default async function ProfilePage(){
  const { session } = await requireAppSession();
  const profile = await getSessionUserProfile(session);
  if (!profile) redirect('/onboarding/1');
  const goal = profile.fitnessGoal || profile.fitnessGoals?.[0] || 'General fitness';
  const goalLabel = goal.replace(/[_-]/g, ' ');
  const stripeSubscription = await prisma.subscription.findUnique({
    where: { userId: String(session.user.id) },
    select: { provider: true, providerCustomerId: true },
  });
  const hasStripeSubscription = stripeSubscription?.provider === "stripe" && Boolean(stripeSubscription.providerCustomerId);

  return (
    <main className="bn-route-page bn-profile-page">
      <div className="page-shell stack">
        <section className="bn-profile-goal" aria-label="Current profile goal">
          <span>Current goal</span>
          <strong>{goalLabel}</strong>
          <small>{profile.workoutDuration || 30} min workouts · {profile.mealsPerDay || 3} meals per day</small>
        </section>

        <ThemePreferencesCard />

        <article className="card bn-route-stage">
          <header className="card-head"><div><h3>Billing</h3><div className="sub">Manage your BurnNByte web subscription and payment method.</div></div></header>
          <StripeBillingButton action={hasStripeSubscription ? "portal" : "checkout"} className="bn-access-primary">
            {hasStripeSubscription ? "Manage subscription" : "Subscribe for $11.99/month"}
          </StripeBillingButton>
        </article>

        <article className="card bn-route-stage">
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
