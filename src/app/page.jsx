// app/page.jsx (server component)
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { sumMealMacros } from "@/lib/macros";
import { applyNutritionTargetOverride, deriveNutritionTargets } from "@/lib/nutritionTargets";
import { getSessionUserProfile } from "@/lib/auth";
import WorkoutCompletionToggle from "@/components/WorkoutCompletionToggle";
import GenerateWorkout from "@/components/GenerateWorkout";
import CheatPlanner from "@/components/CheatPlanner";
import HomeMealsCard from "@/components/HomeMealsCard";
import DashboardSpotlightCarousel from "@/components/DashboardSpotlightCarousel";
import { Activity, ArrowUpRight, CheckCircle2, CircleAlert, Dumbbell, Flame, TrendingDown, TrendingUp } from "lucide-react";

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

function countWorkoutMovements(instructions) {
  if (!Array.isArray(instructions)) return 0;
  const names = instructions
    .map((step) => {
      if (typeof step !== 'string') return null;
      let cleaned = step.replace(/\s+/g, ' ').trim();
      if (!cleaned) return null;
      cleaned = cleaned.replace(/^\d+[\.\)]\s*/, '').trim();
      cleaned = cleaned.split(':')[0].trim();
      cleaned = cleaned.replace(/\s+-\s+\d.*$/i, '').trim();
      cleaned = cleaned.replace(/\b\d+\s*(x|×)\s*\d+\b.*$/i, '').trim();
      cleaned = cleaned.replace(/\b\d+\s*(reps?|sets?|secs?|seconds?|mins?|minutes?)\b.*$/i, '').trim();
      return cleaned.length >= 2 && cleaned.length <= 80 ? cleaned : null;
    })
    .filter(Boolean);
  return new Set(names).size;
}

function getWeightSignalMessage({ delta, initialWeight, goalWeight, fitnessGoal }) {
  if (delta == null) {
    return goalWeight != null
      ? `Log another weigh-in to see how you’re tracking toward ${goalWeight} lb.`
      : "Log another weigh-in to start seeing your trend.";
  }

  const direction = Math.sign(delta);
  const hasWeightGoal = goalWeight != null && initialWeight != null && Number(goalWeight) !== Number(initialWeight);
  const targetDirection = hasWeightGoal ? Math.sign(Number(goalWeight) - Number(initialWeight)) : 0;
  const movingTowardGoal = targetDirection !== 0 && direction === targetDirection;
  const pounds = Math.abs(delta);

  if (movingTowardGoal) {
    return `${pounds} lb ${direction < 0 ? "down" : "up"} from your start—solid progress toward ${goalWeight} lb.`;
  }

  if (hasWeightGoal && direction !== 0) {
    return `${pounds} lb ${direction < 0 ? "down" : "up"} from your start. Keep the next few meals and sessions consistent.`;
  }

  if (direction === 0) {
    return goalWeight != null
      ? `Holding steady. Consistency will carry you toward ${goalWeight} lb.`
      : "Holding steady—keep building the habits that support your training.";
  }

  if (fitnessGoal === "fat_loss" && direction < 0) {
    return `${pounds} lb down from your start—your fat-loss work is adding up.`;
  }
  if (fitnessGoal === "muscle_gain" && direction > 0) {
    return `${pounds} lb up from your start—keep pairing the work with steady recovery.`;
  }

  return `${pounds} lb ${direction < 0 ? "down" : "up"} from your start. Keep showing up for the plan.`;
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
  const onboardingStatus = typeof params?.get === "function" ? params.get("onboarding") : params?.onboarding;
  const selectedISO = /^\d{4}-\d{2}-\d{2}$/.test(String(requestedDate || ""))
    ? String(requestedDate)
    : todayISO;
  const selectedDate = toUTCDateFromLocalYMD(selectedISO);

  const [workout, mealPlan, foodLogs, libraryItems, weightHistory, initialWeightEntry, targetOverride] = await Promise.all([
    prisma.workout.findFirst({
      where: { userId: session.user.id, date: selectedDate },
      include: { exercises: { select: { id: true } } },
    }),
    prisma.mealPlan.findFirst({ where: { userId: session.user.id, date: selectedDate }, include: { meals: true } }),
    prisma.foodLogEntry.findMany({ where: { userId: session.user.id, date: selectedDate }, orderBy: { createdAt: 'asc' } }),
    prisma.mealLibraryItem.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
    prisma.weightHistory.findMany({
      where: { profileId: profile.id },
      orderBy: { date: 'desc' },
      take: 30,
    }),
    prisma.weightHistory.findFirst({
      where: { profileId: profile.id },
      orderBy: { date: 'asc' },
    }),
    prisma.nutritionTargetOverride.findUnique({ where: { userId_date: { userId: session.user.id, date: selectedDate } } }),
  ]);

  const completedMeals = [
    ...(mealPlan?.meals || []).filter((m) => m.isCompleted),
    ...foodLogs.filter((m) => m.isCompleted),
  ];
  const consumedMacros = sumMealMacros(completedMeals);
  const consumedCalories = consumedMacros.calories;

  const weightLb = profile?.weight || null;
  const weightKg = weightLb ? weightLb * 0.453592 : null;
  const diff = (workout?.difficulty || "beginner").toLowerCase();
  const met = diff === "advanced" ? 8 : diff === "intermediate" ? 6.5 : 5;
  const durationH = (workout?.duration || 0) / 60;
  const workoutCalories = weightKg ? Math.round(met * weightKg * durationH) : null;

  const macroTargets = applyNutritionTargetOverride(deriveNutritionTargets(profile), targetOverride);
  const weightPoints = (weightHistory?.length
    ? [...weightHistory].reverse().map((entry) => ({
        id: entry.id,
        date: toYMDInTimeZone(entry.date, "UTC"),
        value: entry.weight,
      }))
    : profile.weight != null
      ? [{ date: todayISO, value: profile.weight }]
      : []);
  const initialWeight = initialWeightEntry?.weight ?? profile.weight ?? null;
  const weightDelta = initialWeight != null && profile.weight != null
    ? Math.round((Number(profile.weight) - Number(initialWeight)) * 10) / 10
    : null;
  const weightSignalMessage = getWeightSignalMessage({
    delta: weightDelta,
    initialWeight,
    goalWeight: profile.goalWeight,
    fitnessGoal: profile.fitnessGoal,
  });
  const movementCount = countWorkoutMovements(workout?.instructions);
  return (
    <main className="bn-home-dashboard">
      <div className="dashboard-shell">
        {onboardingStatus === "complete" ? (
          <section className="bn-onboarding-result is-success">
            <CheckCircle2 size={20} aria-hidden />
            <span><strong>Your first week is ready.</strong><small>Start with today, then adjust anything that does not fit.</small></span>
          </section>
        ) : null}
        {onboardingStatus === "partial" ? (
          <section className="bn-onboarding-result is-warning">
            <CircleAlert size={20} aria-hidden />
            <span><strong>Your profile is ready.</strong><small>Open Train or Fuel to finish any plan that could not be generated.</small></span>
          </section>
        ) : null}
        <div className="bn-home-layout">
          <section className="bn-home-primary">
            <section className="bn-home-signal bn-home-signal-compact">
              <span>WEIGHT SIGNAL</span>
              <div>
                {weightDelta < 0 ? <TrendingDown size={16} aria-hidden /> : null}
                {weightDelta > 0 ? <TrendingUp size={16} aria-hidden /> : null}
                <strong>{weightDelta == null ? "—" : Math.abs(weightDelta)}</strong>
                <small>{weightDelta == null ? "log weight" : weightDelta === 0 ? "lb steady" : `lb ${weightDelta < 0 ? "down" : "up"}`}</small>
                <small className="bn-home-current-weight">now {profile.weight ?? "—"} lb</small>
              </div>
              <p>{weightSignalMessage}</p>
              <Link href="/progress">Open progress <ArrowUpRight size={15} /></Link>
            </section>

            <DashboardSpotlightCarousel
              consumedCalories={consumedCalories}
              consumedMacros={consumedMacros}
              macroTargets={macroTargets}
              weightPoints={weightPoints}
              currentWeight={profile.weight}
              goalWeight={profile.goalWeight}
              nutritionLabel={selectedISO === todayISO ? "Today at a glance" : `Plan for ${selectedISO}`}
            />

            <HomeMealsCard
              todayISO={selectedISO}
              isToday={selectedISO === todayISO}
              profile={profile}
              macroTargets={macroTargets}
              initialMealPlan={mealPlan}
              initialFoodLogs={foodLogs}
              initialLibraryItems={libraryItems}
            />

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
                  <span><strong>{workout ? movementCount : "—"}</strong><small>movements</small></span>
                </div>
                <div className="bn-home-next-action">
                  {workout ? (
                    <WorkoutCompletionToggle workoutId={workout.id} initialCompleted={workout.isCompleted} />
                  ) : (
                    <GenerateWorkout
                      initialPreferences={profile}
                      selectedISO={selectedISO}
                      compact
                    />
                  )}
                </div>
              </div>
            </section>

          </section>

        </div>

        <section className="bn-home-support bn-home-support-single">
          <CheatPlanner currentDateISO={selectedISO} />
        </section>
      </div>
    </main>
  );
}
