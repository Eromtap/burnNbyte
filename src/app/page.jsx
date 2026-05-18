// app/page.jsx (server component)
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { sumMealMacros } from "@/lib/macros";
import { labelForFitnessGoal } from "@/constants/fitnessGoals";
import { deriveNutritionTargets } from "@/lib/nutritionTargets";
import WorkoutCompletionToggle from "@/components/WorkoutCompletionToggle";
import CheatPlanner from "@/components/CheatPlanner";
import MobileDisclosure from "@/components/MobileDisclosure";
import HomeMealsCard from "@/components/HomeMealsCard";
import DashboardSpotlightCarousel from "@/components/DashboardSpotlightCarousel";

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

  const todayISO = toYMDInTimeZone(new Date(), timeZone);
  const today = toUTCDateFromLocalYMD(todayISO);

  const [workout, mealPlan, libraryItems, weightHistory] = await Promise.all([
    prisma.workout.findFirst({ where: { userId: session.user.id, date: today } }),
    prisma.mealPlan.findFirst({ where: { userId: session.user.id, date: today }, include: { meals: true } }),
    prisma.mealLibraryItem.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
    prisma.weightHistory.findMany({
      where: { profileId: profile.id },
      orderBy: { date: 'asc' },
      take: 30,
    }),
  ]);

  const completedMeals = (mealPlan?.meals || []).filter((m) => m.isCompleted);
  const consumedMacros = sumMealMacros(completedMeals);
  const consumedCalories = consumedMacros.calories;

  const weightLb = profile?.weight || null;
  const weightKg = weightLb ? weightLb * 0.453592 : null;
  const diff = (workout?.difficulty || "beginner").toLowerCase();
  const met = diff === "advanced" ? 8 : diff === "intermediate" ? 6.5 : 5;
  const durationH = (workout?.duration || 0) / 60;
  const workoutCalories = weightKg ? Math.round(met * weightKg * durationH) : null;

  const macroTargets = deriveNutritionTargets(profile);
  const primaryGoalId = profile.fitnessGoal || profile.fitnessGoals?.[0] || "general_fitness";
  const primaryGoal = labelForFitnessGoal(primaryGoalId) || "General fitness";
  const weightPoints = (weightHistory?.length
    ? weightHistory.map((entry) => ({
        date: toYMDInTimeZone(entry.date, timeZone),
        value: entry.weight,
      }))
    : profile.weight != null
      ? [{ date: todayISO, value: profile.weight }]
      : []);

  return (
    <main>
      <div className="dashboard-shell stack">
        <DashboardSpotlightCarousel
          consumedCalories={consumedCalories}
          consumedMacros={consumedMacros}
          macroTargets={macroTargets}
          weightPoints={weightPoints}
          currentWeight={profile.weight}
          goalWeight={profile.goalWeight}
        />

        <section className="brand-dashboard-grid">
          <MobileDisclosure
            className="mobile-disclosure dashboard-disclosure"
            summaryClassName="mobile-disclosure-summary dashboard-summary"
            panelClassName="mobile-disclosure-panel"
            summary={
              <>
                <span className="planner-head">Workout spotlight</span>
                <span className="mobile-disclosure-meta">{workout ? `${workout.duration} min` : "Not built"}</span>
              </>
            }
          >
              <article className="card span-2 brand-story-card">
                <header className="card-head brand-story-head">
                  <div>
                    <div className="section-badge section-badge-workout">Workout spotlight</div>
                    <h3>{workout ? workout.name : "I haven’t built today’s session yet"}</h3>
                    <div className="sub">
                      {workout
                        ? `${workout.muscleGroup || "Full body focus"} • ${workout.duration} min • ${workout.difficulty || "beginner"}`
                        : "Generate a workout and this becomes my featured training brief."}
                    </div>
                  </div>
                  {workout ? (
                    <WorkoutCompletionToggle workoutId={workout.id} initialCompleted={workout.isCompleted} />
                  ) : (
                    <Link href="/workouts" className="btn btn-primary">Build my workout</Link>
                  )}
                </header>
                <div className="brand-story-body">
                  <div className="brand-story-copy">
                    <div className="metric-label">Training note</div>
                    <p className="brand-story-text">
                      {workout
                        ? `This session is built for ${primaryGoal.toLowerCase()}. Use today as a focused block instead of another generic gym day.`
                        : "There’s no workout saved for today yet. Build one to turn the dashboard into a real coaching brief."}
                    </p>
                    <div className="brand-story-actions">
                      <Link href={`/workouts?date=${todayISO}`} className="btn btn-outline">See my workout</Link>
                    </div>
                  </div>
                  <div className="brand-story-metrics">
                    <div className="brand-stat-panel">
                      <div className="metric-label">Estimated burn</div>
                      <div className="spotlight-mini">{workoutCalories ?? 0}</div>
                      <div className="metric-detail">kcal if completed</div>
                    </div>
                    <div className="brand-stat-panel">
                      <div className="metric-label">Session status</div>
                      <div className="spotlight-mini">{workout?.isCompleted ? "Done" : "Pending"}</div>
                      <div className="metric-detail">Track it when finished</div>
                    </div>
                  </div>
                </div>
              </article>
          </MobileDisclosure>

          <HomeMealsCard
            todayISO={todayISO}
            profile={profile}
            initialMealPlan={mealPlan}
            initialLibraryItems={libraryItems}
          />

          <CheatPlanner currentDateISO={todayISO} />
        </section>
      </div>
    </main>
  );
}
