import AdminAccessPageClient from "@/components/AdminAccessPageClient";
import { requireAdmin } from "@/lib/auth";

export default async function AdminAccessPage() {
  await requireAdmin({ allowWithoutTerms: true });

  return (
    <main className="bn-route-page bn-admin-page">
      <div className="page-shell stack">
        <section className="hero-card page-hero page-hero-compact bn-route-hero bn-admin-hero">
          <div className="page-hero-copy">
            <div className="eyebrow">Admin</div>
            <div>
              <h1 className="page-hero-title">Access control</h1>
              <p className="page-hero-text">
                Search for a user, manage administrator roles, and grant or revoke manual full access.
              </p>
            </div>
          </div>
        </section>

        <AdminAccessPageClient />
      </div>
    </main>
  );
}
