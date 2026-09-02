import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserAppAccess } from "@/lib/access";
import { ArrowRight, Clock3, LockKeyhole, ShieldCheck } from "lucide-react";
import StripeBillingButton from "@/components/StripeBillingButton";

export default async function ExpiredPage() {
  const session = await getServerSession(authOptions);
  const access = session?.user?.id ? await getUserAppAccess(session.user.id) : null;

  return (
    <main className="bn-access-page">
      <div className="page-shell">
        <section className="bn-access-hero">
          <div className="bn-access-copy">
            <div className="bn-access-kicker">
              <LockKeyhole size={15} aria-hidden />
              <span>ACCESS PAUSED</span>
            </div>
            <h1>Your plan is still here.<br />Access is not.</h1>
            <p>
              Your workouts, meals, and progress have not been removed. Restore access to pick up
              exactly where you left off.
            </p>
            <div className="bn-access-actions">
              {session ? <StripeBillingButton className="bn-access-primary">Subscribe for $11.99/month <ArrowRight size={17} aria-hidden /></StripeBillingButton> : <Link href="/signin" className="bn-access-primary">Return to sign in <ArrowRight size={17} aria-hidden /></Link>}
              <span>No data has been deleted.</span>
            </div>
          </div>

          <aside className="bn-access-panel">
            <header>
              <span>ACCOUNT STATE</span>
              <ShieldCheck size={20} aria-hidden />
            </header>
            <strong>{access?.accessState || "signed out"}</strong>
            <div className="bn-access-rule" />
            <div className="bn-access-detail">
              <Clock3 size={17} aria-hidden />
              <div>
                <span>Trial window</span>
                <p>
                  {access?.trialEndsAt
                    ? `Ended ${new Date(access.trialEndsAt).toLocaleDateString("en-US")}`
                    : "Sign in to view account timing"}
                </p>
              </div>
            </div>
          </aside>
        </section>

        <section className="bn-access-next">
          <span>01</span>
          <div>
            <small>WHAT HAPPENS NEXT</small>
            <h2>Restore access without rebuilding your plan.</h2>
          </div>
          <div className="bn-access-next-copy">
            <p>
              New accounts receive 14 days of full access. After that, an active subscription
              or manual access grant is required.
            </p>
            <p>
              If you believe your access should be active, contact the person who manages your
              account and ask them to review your access status.
            </p>
          </div>
        </section>

        <footer className="bn-access-footer">
          <div>
            <ShieldCheck size={17} aria-hidden />
            <div>
              <strong>Your saved plan stays private</strong>
              <span>Account access controls visibility; expiration does not erase your data.</span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
