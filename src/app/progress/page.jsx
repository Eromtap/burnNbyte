import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import ProgressSummary from "@/components/ProgressSummary";
import { getSessionUserProfile } from "@/lib/auth";

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
    // fall through to UTC
  }
  return "UTC";
}

export default async function ProgressPage() {
  const headerStore = await headers();
  const timeZoneCandidate =
    headerStore.get("x-vercel-ip-timezone") ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC";
  const timeZone = resolveTimeZone(timeZoneCandidate);

  const session = await getServerSession(authOptions);
  if (!session) redirect("/signin");

  const profile = await getSessionUserProfile(session);
  if (!profile) redirect("/onboarding/1");

  const todayISO = toYMDInTimeZone(new Date(), timeZone);
  const today = toUTCDateFromLocalYMD(todayISO);

  const rangeStart = new Date(today);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 27);
  const [foodLogs, workouts, weightHistory] = await Promise.all([
    prisma.foodLogEntry.findMany({
      where: { userId: session.user.id, date: { gte: rangeStart, lte: today }, isCompleted: true },
    }),
    prisma.workout.findMany({
      where: { userId: session.user.id, date: { gte: rangeStart, lte: today } },
    }),
    prisma.weightHistory.findMany({ where: { profileId: profile.id }, orderBy: { date: 'desc' }, take: 60 }),
  ]);

  const logsByDay = new Map();
  foodLogs.forEach((entry) => {
    const key = entry.date.toISOString().slice(0, 10);
    logsByDay.set(key, [...(logsByDay.get(key) || []), entry]);
  });
  const loggedDays = [...logsByDay.values()];
  const loggedMacros = loggedDays.flat().reduce(
    (totals, meal) => ({
      calories: totals.calories + (Number(meal?.calories) || 0),
      protein: totals.protein + (Number(meal?.protein) || 0),
      carbs: totals.carbs + (Number(meal?.carbs) || 0),
      fat: totals.fat + (Number(meal?.fat) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const daysLogged = loggedDays.length;
  const nutrition = {
    daysLogged,
    averageCalories: daysLogged ? Math.round(loggedMacros.calories / daysLogged) : 0,
    averageProtein: daysLogged ? Math.round(loggedMacros.protein / daysLogged) : 0,
    averageCarbs: daysLogged ? Math.round(loggedMacros.carbs / daysLogged) : 0,
    averageFat: daysLogged ? Math.round(loggedMacros.fat / daysLogged) : 0,
  };
  const workoutsCompleted = workouts.filter((workout) => workout.isCompleted).length;

  const weightPoints = [...weightHistory].reverse().map((entry) => ({
    id: entry.id,
    date: toYMDInTimeZone(entry.date, "UTC"),
    value: entry.weight,
  }));
  const startingWeight = weightPoints[0]?.value ?? null;
  const weightChange = startingWeight != null && profile.weight != null
    ? Math.round((Number(profile.weight) - Number(startingWeight)) * 10) / 10
    : null;

  return (
    <main className="bn-route-page bn-progress-page">
      <div className="page-shell stack">
        <section className="hero-card page-hero bn-route-hero bn-progress-hero">
          <div className="page-hero-copy">
            <div className="eyebrow">Progress and metrics</div>
            <div>
              <h1 className="page-hero-title">Your last 28 days</h1>
              <p className="page-hero-text">
                {daysLogged} days of food logged · {workoutsCompleted} completed workouts · weight, nutrition, and training in one view.
              </p>
            </div>
          </div>
          <aside className="hero-panel hero-metrics">
            <div className="metric-card">
              <div className="metric-label">Weight change</div>
              <div className="metric-value">{weightChange == null ? '—' : `${Math.abs(weightChange)} lb`}</div>
              <div className="metric-detail">{weightChange == null ? 'Log weight to establish a trend' : weightChange < 0 ? 'down from your first entry' : weightChange > 0 ? 'up from your first entry' : 'steady from your first entry'}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Average intake</div>
              <div className="metric-value">{nutrition.averageCalories}<span className="unit">kcal</span></div>
              <div className="metric-detail">Across days with food logged</div>
            </div>
            {profile.goalWeight && (
              <div className="metric-card">
                <div className="metric-label">Goal weight</div>
                <div className="metric-value">{profile.goalWeight}<span className="unit">lb</span></div>
                <div className="metric-detail">Current weight {profile.weight ?? '--'} lb</div>
              </div>
            )}
          </aside>
        </section>

        <article className="card bn-route-stage">
          <header className="card-head">
            <div>
              <h3>28-day snapshot</h3>
              <div className="sub">Nutrition and training at a glance, followed by your weight trend.</div>
            </div>
          </header>
          <ProgressSummary
            weightPoints={weightPoints}
            currentWeight={profile.weight}
            goalWeight={profile.goalWeight}
            nutrition={nutrition}
            workoutsCompleted={workoutsCompleted}
          />
        </article>
      </div>
    </main>
  );
}
