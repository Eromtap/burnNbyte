import Link from "next/link";
import { requireAppSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import KrogerConnectionPanel from "@/components/KrogerConnectionPanel";
import { redirect } from "next/navigation";
import { KROGER_PROVIDER } from "@/lib/retailers/kroger";

export const metadata = { title: "Connect Kroger" };

export default async function KrogerPage() {
  if (process.env.KROGER_OAUTH_ENABLED !== "true") redirect("/groceries");
  const { session } = await requireAppSession();
  const connection = await prisma.retailerConnection.findUnique({
    where: {
      userId_provider: { userId: String(session.user.id), provider: KROGER_PROVIDER },
    },
    select: { connectedAt: true },
  });

  return (
    <main className="bn-route-page">
      <div className="page-shell">
        <div className="stack bn-legal-wrap">
          <section className="bn-route-intro">
            <div>
              <div className="eyebrow">Grocery handoff</div>
              <h1>Connect Kroger.<br /><em>Keep checkout in your control.</em></h1>
              <p>Authorize only the access needed to search products and add your approved selections to a Kroger cart.</p>
            </div>
          </section>
          <article className="card bn-legal-card">
            <header className="card-head">
              <h2>Kroger connection</h2>
              <div className="sub">You can disconnect and delete BurnNByte&apos;s stored Kroger credentials at any time.</div>
            </header>
            <KrogerConnectionPanel connected={Boolean(connection)} connectedAt={connection?.connectedAt?.toISOString()} />
            <p className="muted text-xs">
              By connecting, you direct BurnNByte to exchange authentication data with Kroger as described in our{" "}
              <Link href="/privacy">Privacy Policy</Link>. Kroger&apos;s own terms and privacy policy also apply.
            </p>
          </article>
        </div>
      </div>
    </main>
  );
}
