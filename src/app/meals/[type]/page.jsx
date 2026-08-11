import { requireAppSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSessionUserProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { formatMacro } from "@/lib/macros";
import ReplaceMealButton from "@/components/ReplaceMealButton";

function toUTCDateFromLocalYMD(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function toYMDInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function resolveTimeZone(candidate) {
  try {
    if (candidate) {
      new Intl.DateTimeFormat(undefined, { timeZone: candidate }).format(new Date());
      return candidate;
    }
  } catch (_err) {
    // ignore, fall back to UTC
  }
  return "UTC";
}

const ALLOWED_TYPES = ["breakfast", "lunch", "dinner", "snack"];

function formatCost(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return `$${Number(value).toFixed(2)}`;
}

export default async function MealTypePage({ params, searchParams }) {
  const rawType = (params?.type || "").toLowerCase();
  if (!ALLOWED_TYPES.includes(rawType)) {
    redirect("/meals");
  }

  const headerStore = await headers();
  const timeZoneCandidate =
    headerStore.get("x-vercel-ip-timezone") ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC";
  const timeZone = resolveTimeZone(timeZoneCandidate);

  const { session } = await requireAppSession();
  const profile = await getSessionUserProfile(session);
  if (!profile) redirect("/onboarding/1");

  const todayISO = toYMDInTimeZone(new Date(), timeZone);
  const paramDate = typeof searchParams?.get === "function" ? searchParams.get("date") : searchParams?.date;
  const selectedISO = paramDate ? String(paramDate) : todayISO;
  const baseUtc = toUTCDateFromLocalYMD(selectedISO);

  const mealPlan = await prisma.mealPlan.findFirst({
    where: { userId: session.user.id, date: baseUtc },
    include: { meals: true },
  });

  const meals = (mealPlan?.meals || []).filter(
    (m) => (m.type || "").toLowerCase() === rawType
  );

  return (
    <main className="bn-route-page bn-meal-detail-page">
      <div className="page-shell">
        <div className="stack">
          <section className="bn-route-intro">
            <div>
              <div className="eyebrow">Daily fuel detail</div>
              <h1 style={{ textTransform: "capitalize" }}>{rawType}.<br /><em>Handled.</em></h1>
              <p>Review what is planned, replace what no longer fits, and keep the rest of the day intact.</p>
            </div>
            <aside>
              <span>Selected day</span>
              <strong>{selectedISO}</strong>
              <small>{meals.length} planned item{meals.length === 1 ? '' : 's'}</small>
            </aside>
          </section>
          <article className="card bn-route-stage">
          <header className="card-head">
            <h3 style={{ textTransform: "capitalize" }}>{rawType}</h3>
            <div className="sub">{selectedISO}</div>
          </header>
          <div className="list-row" style={{ marginTop: 8 }}>
            <ReplaceMealButton
              dateISO={selectedISO}
              type={rawType}
              className="btn btn-secondary"
              label="Replace"
            />
          </div>
          {!mealPlan && <div className="muted">No meal plan for this day. Go to <Link href={`/meals?date=${selectedISO}`} className="pill">Meals</Link> to generate.</div>}
            {mealPlan && meals.length === 0 && (
              <div className="muted">No {rawType} planned for this day.</div>
            )}
            {mealPlan && meals.length > 0 && (
              <div className="stack">
                {meals.map((m) => (
                  <article key={m.id} className="card">
                    <header className="card-head">
                      <h3>{m.name}</h3>
                      <div className="sub">
                        {(m.calories ?? 0)} kcal | {formatMacro(m.protein)}g Protein | {formatMacro(m.carbs)}g Carbs | {formatMacro(m.fat)}g Fat{formatCost(m.costPerServing) ? ` | ~${formatCost(m.costPerServing)}/serving` : ''}
                      </div>
                    </header>
                    <div className="stack">
                      {Array.isArray(m.ingredients) && m.ingredients.length > 0 && (
                        <div>
                          <div className="planner-head">Ingredients</div>
                          <ul className="list" style={{ marginTop: 8 }}>
                            {m.ingredients.map((ing, i) => (<li key={i} className="list-row"><span>{ing}</span></li>))}
                          </ul>
                        </div>
                      )}
                      {m.recipe && (
                        <div>
                          <div className="planner-head">Recipe</div>
                          <div className="list-row"><span style={{ whiteSpace: "pre-wrap" }}>{m.recipe}</span></div>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>
        </div>
      </div>
    </main>
  );
}
