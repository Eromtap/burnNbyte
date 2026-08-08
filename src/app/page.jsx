// app/page.jsx (server component)
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { sumMealMacros } from "@/lib/macros";
import { deriveNutritionTargets } from "@/lib/nutritionTargets";
import { getSessionUserProfile } from "@/lib/auth";
import WorkoutCompletionToggle from "@/components/WorkoutCompletionToggle";
import CheatPlanner from "@/components/CheatPlanner";
import HomeMealsCard from "@/components/HomeMealsCard";
import DashboardSpotlightCarousel from "@/components/DashboardSpotlightCarousel";
import DateStrip from "@/components/DateStrip";
import { Activity, ArrowUpRight, Dumbbell, Flame, ShoppingBag, Sparkles, TrendingDown } from "lucide-react";

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

export default async function HomePage({ searchParams }) {
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
  const params = await searchParams;
  const requestedDate = typeof params?.get === "function" ? params.get("date") : params?.date;
  const selectedISO = /^\d{4}-\d{2}-\d{2}$/.test(String(requestedDate || ""))
    ? String(requestedDate)
    : todayISO;
  const selectedDate = toUTCDateFromLocalYMD(selectedISO);

  const [workout, mealPlan, libraryItems, weightHistory] = await Promise.all([
    prisma.workout.findFirst({ where: { userId: session.user.id, date: selectedDate } }),
    prisma.mealPlan.findFirst({ where: { userId: session.user.id, date: selectedDate }, include: { meals: true } }),
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
  const weightPoints = (weightHistory?.length
    ? weightHistory.map((entry) => ({
        date: toYMDInTimeZone(entry.date, timeZone),
        value: entry.weight,
      }))
    : profile.weight != null
      ? [{ date: todayISO, value: profile.weight }]
      : []);
  const calorieProgress = macroTargets.calories
    ? Math.max(0, Math.min(100, Math.round((consumedCalories / macroTargets.calories) * 100)))
    : 0;
  const remainingCalories = Math.max(0, (macroTargets.calories || 0) - consumedCalories);
  const weightDelta = weightPoints.length > 1
    ? Math.round((Number(weightPoints[weightPoints.length - 1].value) - Number(weightPoints[0].value)) * 10) / 10
    : null;
  const selectedDateLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(selectedDate);
  const dashboardHeadline = selectedISO !== todayISO
    ? `Plan for ${selectedDateLabel}`
    : workout?.isCompleted
      ? "Workout complete"
      : workout
        ? `${workout.name} is ready`
        : remainingCalories <= 0
          ? "Nutrition target reached"
          : "Today at a glance";

  return (
    <main className="bn-home-dashboard">
      <div className="dashboard-shell">
        <div className="bn-lab-date-strip">
          <DateStrip basePath="/" selectedISO={selectedISO} />
        </div>

        <div className="bn-home-layout">
          <section className="bn-home-primary">
            <div className="bn-home-hero">
              <div className="bn-home-hero-copy">
                <div className="bn-home-status">
                  <Sparkles size={15} aria-hidden />
                  <span>
                    {selectedISO === todayISO
                      ? (remainingCalories > 0 ? "ON TRACK TODAY" : "TARGET REACHED")
                      : `PLAN FOR ${selectedISO}`}
                  </span>
                </div>
                <h2>{dashboardHeadline}</h2>
                <p>
                  {remainingCalories > 0
                    ? `You’re ${remainingCalories.toLocaleString()} calories from target${workout ? " with one training session ready" : ""}.`
                    : "Your nutrition target is covered for this day."}
                </p>
              </div>

              <div className="bn-home-energy">
                <div
                  className="bn-home-energy-ring"
                  style={{ "--bn-energy-progress": `${calorieProgress * 3.6}deg` }}
                  aria-label={`${calorieProgress}% of calorie target`}
                >
                  <div>
                    <strong>{consumedCalories.toLocaleString()}</strong>
                    <span>of {(macroTargets.calories || 0).toLocaleString()} kcal</span>
                  </div>
                </div>
                <div className="bn-home-energy-legend">
                  <span><i /> eaten</span>
                  <span><i /> remaining</span>
                </div>
              </div>
            </div>

            <section className="bn-home-next">
              <header>
                <div>
                  <span>UP NEXT</span>
                  <h3>{workout?.name || "Build today’s workout"}</h3>
                </div>
                <Link href={`/workouts?date=${selectedISO}`}>
                  View workout
                  <ArrowUpRight size={16} aria-hidden />
                </Link>
              </header>

              <div className="bn-home-next-row">
                <div>
                  <Dumbbell size={20} aria-hidden />
                  <span><strong>{workout?.duration || 0}</strong><small>minutes</small></span>
                </div>
                <div>
                  <Flame size={20} aria-hidden />
                  <span><strong>{workoutCalories || 0}</strong><small>estimated burn</small></span>
                </div>
                <div>
                  <Activity size={20} aria-hidden />
                  <span><strong>{workout?.exercises?.length || "—"}</strong><small>movements</small></span>
                </div>
                <div className="bn-home-next-action">
                  {workout ? (
                    <WorkoutCompletionToggle workoutId={workout.id} initialCompleted={workout.isCompleted} />
                  ) : (
                    <Link href={`/workouts?date=${selectedISO}`} className="btn btn-primary">
                      Build session
                    </Link>
                  )}
                </div>
              </div>
            </section>

            <HomeMealsCard
              todayISO={selectedISO}
              isToday={selectedISO === todayISO}
              profile={profile}
              initialMealPlan={mealPlan}
              initialLibraryItems={libraryItems}
            />
          </section>

          <aside className="bn-home-insights">
            <section className="bn-home-signal">
              <span>WEIGHT SIGNAL</span>
              <div>
                <TrendingDown size={22} aria-hidden />
                <strong>{weightDelta == null ? "—" : Math.abs(weightDelta)}</strong>
                <small>{weightDelta == null ? "log weight" : `lb ${weightDelta <= 0 ? "down" : "up"}`}</small>
              </div>
              <p>
                {weightDelta == null
                  ? "Add another weight entry to reveal your trend."
                  : weightDelta <= 0
                    ? "Your trend is moving at a sustainable pace."
                    : "Your recent trend is up. Use the full chart for context."}
              </p>
              <Link href="/progress">Open progress <ArrowUpRight size={15} /></Link>
            </section>

            <section className="bn-home-goal">
              <span>CURRENT WEIGHT</span>
              <strong>{profile.weight ?? "—"}<small> lb</small></strong>
              <p>{profile.goalWeight ? `Goal: ${profile.goalWeight} lb` : "Add a goal weight in your profile."}</p>
            </section>

            <Link className="bn-home-grocery-link" href={`/groceries?date=${selectedISO}`}>
              <span><ShoppingBag size={18} aria-hidden /><strong>Grocery list</strong></span>
              <small>Open this week&apos;s ingredients</small>
              <ArrowUpRight size={16} aria-hidden />
            </Link>
          </aside>
        </div>

        <section className="bn-home-support">
          <DashboardSpotlightCarousel
            consumedCalories={consumedCalories}
            consumedMacros={consumedMacros}
            macroTargets={macroTargets}
            weightPoints={weightPoints}
            currentWeight={profile.weight}
            goalWeight={profile.goalWeight}
          />

          <CheatPlanner currentDateISO={selectedISO} />
        </section>
      </div>
    </main>
  );
}
