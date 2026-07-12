import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserAppAccess } from "@/lib/access";

export default async function ExpiredPage() {
  const session = await getServerSession(authOptions);
  const access = session?.user?.id ? await getUserAppAccess(session.user.id) : null;

  return (
    <main>
      <div className="page-shell stack">
        <section className="hero-card page-hero">
          <div className="page-hero-copy">
            <div className="eyebrow">Access required</div>
            <div>
              <h1 className="page-hero-title">Your BurnnByte access has expired.</h1>
              <p className="page-hero-text">
                New accounts get 7 days of full access. After that, the app requires an active subscription unless the account has a manual access grant.
              </p>
              {access?.trialEndsAt ? (
                <p className="page-hero-text">
                  Trial ended: {new Date(access.trialEndsAt).toLocaleDateString("en-US")}
                </p>
              ) : null}
            </div>
          </div>
          <aside className="hero-panel hero-metrics">
            <div className="metric-card">
              <div className="metric-label">Current status</div>
              <div className="metric-value" style={{ fontSize: "1.5rem" }}>
                {access?.accessState || "signed_out"}
              </div>
              <div className="metric-detail">
                Billing is not wired yet. This is the app lock state for expired access.
              </div>
            </div>
          </aside>
        </section>

        <article className="card">
          <header className="card-head">
            <div>
              <h3>Next step</h3>
              <div className="sub">Use a manual grant for testers or wire billing next.</div>
            </div>
          </header>
          <div className="stack">
            <p>
              If this account should keep access for testing, family, or support, add a manual grant through the admin access-grants API.
            </p>
            <p>
              <Link href="/signin">Back to sign in</Link>
            </p>
          </div>
        </article>
      </div>
    </main>
  );
}
