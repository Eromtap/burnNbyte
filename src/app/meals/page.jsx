import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import GenerateMealPlan from "@/components/GenerateMealPlan";
import DateStrip from "@/components/DateStrip";
import MealsReplacerSingle from "@/components/MealsReplacerSingle";
import { sumMealMacros, formatMacro } from "@/lib/macros";
import MealPhotoReplace from "@/components/MealPhotoReplace";
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
function formatUTCDateForDisplay(date, timeZone) {
  if (!date) return "";
  const dt = new Date(date);
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(dt);
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

export default async function MealsPage({ searchParams }){
  const headerStore = await headers();
  const timeZoneCandidate =
    headerStore.get("x-vercel-ip-timezone") ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC";
  const timeZone = resolveTimeZone(timeZoneCandidate);

  const session = await requireAuth();
  // Optional onboarding check to match home page
  const profile = await prisma.userProfile.findUnique({ where: { userId: String(session.user.id) } });
  if (!profile) redirect("/onboarding/1");

  const todayISO = toYMDInTimeZone(new Date(), timeZone);
  const params = await searchParams; // Next.js async searchParams (may be URLSearchParams)
  const paramDate = typeof params?.get === "function" ? params.get("date") : params?.date;
  const selectedISO = paramDate ? String(paramDate) : todayISO;
  const baseUtc = toUTCDateFromLocalYMD(selectedISO);

  const mealPlan = await prisma.mealPlan.findFirst({ where: { userId: session.user.id, date: baseUtc }, include: { meals: true } });
  const mealMacros = sumMealMacros(mealPlan?.meals || []);

  const grouped = (mealPlan?.meals || []).reduce((acc, m) => {
    const t = (m.type || "").toLowerCase();
    acc[t] = acc[t] || [];
    acc[t].push(m);
    return acc;
  }, {});

  return (
    <main>
      <div className="page-shell">
        <div className="stack">
          <DateStrip basePath="/meals" selectedISO={selectedISO} />
          <article className="card">
            <header className="card-head">
              <h3>Generate Meal Plan</h3>
              <div className="sub">Creates plans and saves to calendar</div>
            </header>
            <GenerateMealPlan />
            <div className="list-row" style={{ marginTop: 8 }}>
              <a className="pill" href="/pantry" style={{ marginLeft: 8 }}>Use Pantry Photo</a>
            </div>
          </article>

          <article className="card">
            <header className="card-head">
              <h3>Meal Plan</h3>
              <div className="sub">{mealPlan ? selectedISO : 'No plan on this day'}</div>
            </header>
            {!mealPlan && <div className="muted">No meal plan for today. Use the button above to generate.</div>}
            {mealPlan && (
              <>
                <div className="list-row" style={{ marginBottom: 12 }}>
                  <span>Daily totals</span>
                  <span className="muted">
                    {mealMacros.calories} kcal | {formatMacro(mealMacros.protein)}g Protein | {formatMacro(mealMacros.carbs)}g Carbs | {formatMacro(mealMacros.fat)}g Fat
                  </span>
                </div>
                <div className="stack">
                {["breakfast", "lunch", "dinner", "snack"].map((type) => (
                  <div key={type} className="planner-col">
                    <div className="planner-head" style={{ textTransform: "capitalize" }}>{type}</div>
                    <ReplaceMealButton
                      dateISO={selectedISO}
                      type={type}
                      className="btn btn-secondary"
                      label="Replace"
                    />
                    <div>
                      {(grouped[type] || []).map((m) => (
                        <article key={m.id} className="card" style={{ marginTop: 8 }}>
                            <header className="card-head">
                              <h3>{m.name}</h3>
                              <div className="sub">
                                {(m.calories ?? "?")} kcal | {formatMacro(m.protein)}g Protein | {formatMacro(m.carbs)}g Carbs | {formatMacro(m.fat)}g Fat
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
                        {!(grouped[type] || []).length && <div className="muted">No {type} planned.</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </article>

          <article className="card">
            <header className="card-head">
              <h3>Replace Meal for Day</h3>
              <div className="sub">Pick one meal to swap for this day</div>
            </header>
            <MealsReplacerSingle selectedISO={selectedISO} />
          </article>

          <article className="card">
            <header className="card-head">
              <h3>Replace with Meal Photo</h3>
              <div className="sub">Upload a meal photo to estimate macros and swap it into this day</div>
            </header>
            <MealPhotoReplace selectedISO={selectedISO} />
          </article>
        </div>
      </div>
    </main>
  );
}
