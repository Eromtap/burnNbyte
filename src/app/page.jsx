// app/page.jsx (server component)
import { getServerSession } from "next-auth/next"; // correct import
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import MiniCalendar from "@/components/MiniCalendar";
import { sumMealMacros, formatMacro } from "@/lib/macros";

// Server component renders dashboard content; AppFrame wraps it globally

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
    // fall through to UTC
  }
  return "UTC";
}

export default async function HomePage() {
  const headerStore = await headers();
  const timeZoneCandidate =
    headerStore.get("x-vercel-ip-timezone") ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC";
  const timeZone = resolveTimeZone(timeZoneCandidate);

  const session = await getServerSession(authOptions);
  if (!session) redirect("/signin");

  const profile = await prisma.userProfile.findUnique({
    where: { userId: String(session.user.id) },
  });
  if (!profile) redirect("/onboarding/1");

  // Use local date converted to UTC midnight to match other tabs
  const todayISO = toYMDInTimeZone(new Date(), timeZone);
  const today = toUTCDateFromLocalYMD(todayISO);

  const [workout, mealPlan] = await Promise.all([
    prisma.workout.findFirst({ where: { userId: session.user.id, date: today } }),
    prisma.mealPlan.findFirst({ where: { userId: session.user.id, date: today }, include: { meals: true } })
  ]);
  const mealMacros = sumMealMacros(mealPlan?.meals || []);

  const grouped = (mealPlan?.meals || []).reduce((acc, m) => {
    const t = (m.type || "").toLowerCase();
    acc[t] = acc[t] || [];
    acc[t].push(m);
    return acc;
  }, {});

  // Food calories from meals (matches Meals tab)
  const mealCalories = mealMacros.calories;

  // Estimated workout calories
  const weightLb = profile?.weight || null;
  const weightKg = weightLb ? weightLb * 0.453592 : null;
  const diff = (workout?.difficulty || "beginner").toLowerCase();
  const met = diff === "advanced" ? 8 : diff === "intermediate" ? 6.5 : 5.0;
  const durationH = (workout?.duration || 0) / 60;
  const workoutCalories = weightKg ? Math.round(met * weightKg * durationH) : null;

  return (
    <main>
      <div className="dashboard-shell">
        <div className="dashboard-grid">
        <article className="card span-2">
          <header className="card-head">
            <h3>Today's Summary</h3>
            <div className="sub">Estimated totals</div>
          </header>
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Food Calories</div>
              <div className="stat-value">{mealCalories}<span className="unit"> kcal</span></div>
            </div>
            <div className="stat">
              <div className="stat-label">Workout Calories
                <span className="pill" title="Estimate uses MET by difficulty and weight" style={{ marginLeft: 8 }}>i</span>
              </div>
              <div className="stat-value">{workoutCalories ?? 0}<span className="unit"> kcal</span></div>
            </div>
          </div>
          <div className="list-row" style={{ marginTop: 12 }}>
            <span>Meal Macros (est.)</span>
            <span className="muted">
              {mealCalories} kcal | {formatMacro(mealMacros.protein)}g Protein | {formatMacro(mealMacros.carbs)}g Carbs | {formatMacro(mealMacros.fat)}g Fat
            </span>
          </div>
        </article>
        <article className="card span-2">
          <header className="card-head">
            <h3>Today's Workout</h3>
            <div className="sub">{workout ? formatUTCDateForDisplay(workout.date, timeZone) : "No workout saved"}</div>
          </header>
          {!workout && (
            <div className="muted">No workout plan for today. Go to <Link href="/workouts" className="pill">Workouts</Link> to generate.</div>
          )}
          {workout && (
            <div className="stack">
              <div className="list-row"><span>Name</span><span className="muted">{workout.name}</span></div>
              {workout.muscleGroup && <div className="list-row"><span>Muscle Group</span><span className="muted">{workout.muscleGroup}</span></div>}
              <div className="list-row"><span>Duration</span><span className="muted">{workout.duration} min</span></div>
            </div>
          )}
        </article>

        <article className="card span-2">
          <header className="card-head">
            <h3>Today's Meal Plan</h3>
            <div className="sub">{mealPlan ? formatUTCDateForDisplay(mealPlan.date, timeZone) : "No meal plan saved"}</div>
          </header>
          {!mealPlan && (
            <div className="muted">No meal plan for today. Go to <Link href="/meals" className="pill">Meals</Link> to generate.</div>
          )}
          {mealPlan && (
            <div className="stack">
              <div className="list-row" style={{ marginBottom: 12 }}>
                <span>Daily totals</span>
                <span className="muted">
                  {mealCalories} kcal | {formatMacro(mealMacros.protein)}g Protein | {formatMacro(mealMacros.carbs)}g Carbs | {formatMacro(mealMacros.fat)}g Fat
                </span>
              </div>
              {["breakfast", "lunch", "dinner", "snack"].map((type) => (
                <div key={type} className="planner-col">
                  <div className="planner-head" style={{ textTransform: "capitalize" }}>{type}</div>
                  <div>
                    {(grouped[type] || []).map((m) => (
                      <div key={m.id} className="list-row" style={{ marginTop: 8 }}>
                        <span>{m.name}</span>
                        <span className="muted">
                          {(m.calories ?? 0)} kcal | {formatMacro(m.protein)}g Protein | {formatMacro(m.carbs)}g Carbs | {formatMacro(m.fat)}g Fat
                        </span>
                      </div>
                    ))}
                    {!((grouped[type] || []).length) && <div className="muted">No {type} planned.</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        {/* <article className="card">
          <header className="card-head">
            <h3>Calendar</h3>
          </header>
          <div className="stack">
            <MiniCalendar
              dataSources={[
                { url: '/api/workouts', type: 'workout' },
                { url: '/api/mealPlans', type: 'mealPlan' },
              ]}
            />
            <Link href="/healthCalendar"><button className="btn btn-outline">Open Calendar</button></Link>
          </div>
        </article> */}
        </div>
      </div>
    </main>
  );
}
