import AdminAccessPageClient from "@/components/AdminAccessPageClient";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function parseDateInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
    ? parsed
    : null;
}

function startOfTomorrow(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
}

function readSearchParam(searchParams, name) {
  const value = typeof searchParams?.get === "function" ? searchParams.get(name) : searchParams?.[name];
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminAccessPage({ searchParams }) {
  await requireAdmin({ allowWithoutTerms: true });

  const params = await searchParams;
  const today = new Date();
  const defaultEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const defaultStart = new Date(defaultEnd);
  defaultStart.setUTCDate(defaultStart.getUTCDate() - 29);
  let start = parseDateInput(readSearchParam(params, "start")) || defaultStart;
  let end = parseDateInput(readSearchParam(params, "end")) || defaultEnd;
  if (start > end) [start, end] = [end, start];

  const userDateRange = { createdAt: { gte: start, lt: startOfTomorrow(end) } };
  const [totalUsers, paidUsers] = await Promise.all([
    prisma.user.count({ where: userDateRange }),
    prisma.user.count({
      where: {
        ...userDateRange,
        subscription: { is: { status: "active" } },
      },
    }),
  ]);
  const unpaidUsers = totalUsers - paidUsers;
  const startInput = formatDateInput(start);
  const endInput = formatDateInput(end);

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

        <section className="card bn-route-stage stack">
          <header className="card-head">
            <div>
              <h3>User growth</h3>
              <div className="sub">Accounts created from {startInput} through {endInput}, inclusive.</div>
            </div>
          </header>

          <form className="form admin-user-count-form" action="/admin/access" method="get">
            <label>
              <span>Start date</span>
              <input type="date" name="start" defaultValue={startInput} max={endInput} required />
            </label>
            <label>
              <span>End date</span>
              <input type="date" name="end" defaultValue={endInput} required />
            </label>
            <div className="admin-user-count-actions">
              <button className="btn btn-primary" type="submit">Apply range</button>
              <a className="btn btn-outline" href="/admin/access">Last 30 days</a>
            </div>
          </form>

          <div className="hero-panel hero-metrics admin-user-count-metrics">
            <div className="metric-card">
              <div className="metric-label">Total users</div>
              <div className="metric-value">{totalUsers}</div>
              <div className="metric-detail">Created in this date range</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Paid users</div>
              <div className="metric-value">{paidUsers}</div>
              <div className="metric-detail">Current subscription status: active</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Unpaid users</div>
              <div className="metric-value">{unpaidUsers}</div>
              <div className="metric-detail">No active paid subscription</div>
            </div>
          </div>
        </section>

        <AdminAccessPageClient />
      </div>
    </main>
  );
}
