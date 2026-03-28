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
import MealCompletionToggle from "@/components/MealCompletionToggle";

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

export default async function MealsPage({ searchParams }){
  const headerStore = await headers();
  const timeZoneCandidate =
    headerStore.get("x-vercel-ip-timezone") ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC";
  const timeZone = resolveTimeZone(timeZoneCandidate);

  const session = await requireAuth();
  const profile = await prisma.userProfile.findUnique({ where: { userId: String(session.user.id) } });
  if (!profile) redirect("/onboarding/1");

  const todayISO = toYMDInTimeZone(new Date(), timeZone);
  const params = await searchParams;
  const paramDate = typeof params?.get === "function" ? params.get("date") : params?.date;
  const selectedISO = paramDate ? String(paramDate) : todayISO;
  const baseUtc = toUTCDateFromLocalYMD(selectedISO);

  const mealPlan = await prisma.mealPlan.findFirst({ where: { userId: session.user.id, date: baseUtc }, include: { meals: true } });
  const mealMacros = sumMealMacros(mealPlan?.meals || []);
  const grouped = (mealPlan?.meals || []).reduce((acc, meal) => {
    const type = (meal.type || "").toLowerCase();
    acc[type] = acc[type] || [];
    acc[type].push(meal);
    return acc;
  }, {});

  return (
    <main>
      <div className="page-shell stack">
        <section className="hero-card page-hero">
          <div className="page-hero-copy">
            <div className="eyebrow">Meal planning</div>
            <div>
              <h1 className="page-hero-title">A nutrition plan that feels organized, not stitched together.</h1>
              <p className="page-hero-text">
                Generate a full day, swap specific meals, and pull in photo-based replacements without losing sight of your daily macro totals.
              </p>
            </div>
            <div className="page-hero-actions">
              <a href="#planner" className="btn btn-primary">Open planner</a>
              <a href="#replace" className="btn btn-outline">Replace a meal</a>
            </div>
          </div>
          <aside className="hero-panel hero-metrics">
            <div className="metric-card">
              <div className="metric-label">Selected day</div>
              <div className="metric-value">{selectedISO}</div>
              <div className="metric-detail">{mealPlan ? 'Meal plan loaded.' : 'No plan saved yet.'}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Daily totals</div>
              <div className="metric-value">{mealMacros.calories}<span className="unit">kcal</span></div>
              <div className="metric-detail">{formatMacro(mealMacros.protein)}g protein • {formatMacro(mealMacros.carbs)}g carbs • {formatMacro(mealMacros.fat)}g fat</div>
            </div>
          </aside>
        </section>

        <DateStrip basePath="/meals" selectedISO={selectedISO} />

        <section className="section-grid">
          <article className="card section-side">
            <header className="card-head">
              <div>
                <h3>Generate meal plan</h3>
                <div className="sub">Creates and saves the plan for the selected date.</div>
              </div>
            </header>
            <GenerateMealPlan />
            <div className="page-hero-actions" style={{ marginTop: 12 }}>
              <a className="btn btn-secondary" href="/pantry">Use pantry photo</a>
            </div>
          </article>

          <article id="planner" className="card section-main">
            <header className="card-head">
              <div>
                <h3>Meal lineup</h3>
                <div className="sub">Browse each meal block and swap as needed.</div>
              </div>
              {mealPlan && <div className="section-badge section-badge-meal">{mealPlan.meals.length} items</div>}
            </header>
            {!mealPlan && <div className="list-row"><span className="muted">No meal plan for this date. Generate one to populate the planner.</span></div>}
            {mealPlan && (
              <div className="stack">
                <div className="list-row">
                  <span>Daily totals</span>
                  <span className="muted">{mealMacros.calories} kcal • {formatMacro(mealMacros.protein)}g protein • {formatMacro(mealMacros.carbs)}g carbs • {formatMacro(mealMacros.fat)}g fat</span>
                </div>
                <div className="planner">
                  {["breakfast", "lunch", "dinner", "snack"].map((type) => (
                    <div key={type} className="planner-col">
                      <div className="planner-col planner-col-row" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                        <div className="planner-head" style={{ textTransform: 'capitalize' }}>{type}</div>
                        <ReplaceMealButton dateISO={selectedISO} type={type} className="btn btn-secondary" label="Replace" />
                      </div>
                      {(grouped[type] || []).length ? (
                        (grouped[type] || []).map((meal) => (
                          <article key={meal.id} className="card" style={{ padding: 16 }}>
                            <header className="card-head">
                              <div>
                                <h3>{meal.name}</h3>
                                <div className="sub">{meal.calories ?? 0} kcal • {formatMacro(meal.protein)}g protein • {formatMacro(meal.carbs)}g carbs • {formatMacro(meal.fat)}g fat</div>
                              </div>
                              <MealCompletionToggle mealId={meal.id} initialCompleted={meal.isCompleted} />
                            </header>
                            <div className="stack">
                              {Array.isArray(meal.ingredients) && meal.ingredients.length > 0 && (
                                <div>
                                  <div className="planner-head">Ingredients</div>
                                  <ul className="list" style={{ marginTop: 8 }}>
                                    {meal.ingredients.map((ingredient, index) => (
                                      <li key={index} className="list-row"><span>{ingredient}</span></li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {meal.recipe && (
                                <div>
                                  <div className="planner-head">Recipe</div>
                                  <div className="list-row"><span style={{ whiteSpace: 'pre-wrap' }}>{meal.recipe}</span></div>
                                </div>
                              )}
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="list-row"><span className="muted">No {type} planned.</span></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>
        </section>

        <section className="section-grid">
          <article id="replace" className="card section-side">
            <header className="card-head">
              <div>
                <h3>Replace meal for day</h3>
                <div className="sub">Swap one meal on the selected date.</div>
              </div>
            </header>
            <MealsReplacerSingle selectedISO={selectedISO} />
          </article>

          <article className="card section-main">
            <header className="card-head">
              <div>
                <h3>Replace from photo</h3>
                <div className="sub">Upload a meal photo, estimate macros, and drop it into the plan.</div>
              </div>
            </header>
            <MealPhotoReplace selectedISO={selectedISO} />
          </article>
        </section>
      </div>
    </main>
  );
}

