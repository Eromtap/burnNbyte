import AdminAccessPageClient from "@/components/AdminAccessPageClient";
import { requireAdmin } from "@/lib/auth";

export default async function AdminAccessPage() {
  await requireAdmin({ allowWithoutTerms: true });

  return (
    <main>
      <div className="page-shell stack">
        <section className="hero-card page-hero page-hero-compact">
          <div className="page-hero-copy">
            <div className="eyebrow">Admin</div>
            <div>
              <h1 className="page-hero-title">Access control</h1>
              <p className="page-hero-text">
                Search for a user, inspect their current app access, and grant or revoke manual full access.
              </p>
            </div>
          </div>
        </section>

        <AdminAccessPageClient />
      </div>
    </main>
  );
}
