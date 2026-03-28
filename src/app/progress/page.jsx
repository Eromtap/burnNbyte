import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import ProgressSummary from "@/components/ProgressSummary";

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

  const profile = await prisma.userProfile.findUnique({
    where: { userId: String(session.user.id) },
  });
  if (!profile) redirect("/onboarding/1");

  const todayISO = toYMDInTimeZone(new Date(), timeZone);
  const today = toUTCDateFromLocalYMD(todayISO);

  const [workout, mealPlan, weightHistory] = await Promise.all([
    prisma.workout.findFirst({ where: { userId: session.user.id, date: today } }),
    prisma.mealPlan.findFirst({ where: { userId: session.user.id, date: today }, include: { meals: true } }),
    prisma.weightHistory.findMany({ where: { profileId: profile.id }, orderBy: { date: 'asc' }, take: 60 }),
  ]);

  const mealMacros = (mealPlan?.meals || []).reduce(
    (totals, meal) => ({
      calories: totals.calories + (Number(meal?.calories) || 0),
      protein: totals.protein + (Number(meal?.protein) || 0),
      carbs: totals.carbs + (Number(meal?.carbs) || 0),
      fat: totals.fat + (Number(meal?.fat) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const completedMeals = (mealPlan?.meals || []).filter((meal) => meal.isCompleted);
  const consumedMacros = completedMeals.reduce(
    (totals, meal) => ({
      calories: totals.calories + (Number(meal?.calories) || 0),
      protein: totals.protein + (Number(meal?.protein) || 0),
      carbs: totals.carbs + (Number(meal?.carbs) || 0),
      fat: totals.fat + (Number(meal?.fat) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const weightLb = profile?.weight || null;
  const weightKg = weightLb ? weightLb * 0.453592 : null;
  const diff = (workout?.difficulty || "beginner").toLowerCase();
  const met = diff === "advanced" ? 8 : diff === "intermediate" ? 6.5 : 5;
  const durationH = (workout?.duration || 0) / 60;
  const workoutCalories = weightKg ? Math.round(met * weightKg * durationH) : null;
  const burnedCalories = workout?.isCompleted ? (workoutCalories ?? 0) : 0;

  const totalActions = (mealPlan?.meals?.length || 0) + (workout ? 1 : 0);
  const completedActions = completedMeals.length + (workout?.isCompleted ? 1 : 0);
  const completionPct = totalActions ? Math.round((completedActions / totalActions) * 100) : 0;

  const weightPoints = (weightHistory || []).map((entry) => ({
    date: toYMDInTimeZone(entry.date, timeZone),
    value: entry.weight,
  }));

  return (
    <main>
      <div className="page-shell stack">
        <section className="hero-card page-hero">
          <div className="page-hero-copy">
            <div className="eyebrow">Progress and metrics</div>
            <div>
              <h1 className="page-hero-title">See adherence, calories, and weight trend without leaving the app flow.</h1>
              <p className="page-hero-text">
                This view turns your daily actions into something readable: whether you followed the plan, how calories tracked, and how bodyweight is trending over time.
              </p>
            </div>
          </div>
          <aside className="hero-panel hero-metrics">
            <div className="metric-card">
              <div className="metric-label">Plan completion</div>
              <div className="metric-value">{completionPct}%</div>
              <div className="metric-detail">{completedActions} of {totalActions} actions completed today</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Calories today</div>
              <div className="metric-value">{consumedMacros.calories}<span className="unit">consumed</span></div>
              <div className="metric-detail">{burnedCalories} kcal burned from workout completion</div>
            </div>
          </aside>
        </section>

        <article className="card">
          <header className="card-head">
            <div>
              <h3>Progress dashboard</h3>
              <div className="sub">Daily adherence, calories, and 60-entry weight trend.</div>
            </div>
          </header>
          <ProgressSummary
            weightPoints={weightPoints}
            calories={{ consumed: consumedMacros.calories, planned: mealMacros.calories, burned: burnedCalories, plannedBurn: workoutCalories ?? 0 }}
            planCompletion={{ percent: completionPct, completed: completedActions, total: totalActions }}
          />
        </article>
      </div>
    </main>
  );
}
