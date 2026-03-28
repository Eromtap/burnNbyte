// app/page.jsx (server component)
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { sumMealMacros, formatMacro } from "@/lib/macros";
import { labelForFitnessGoal } from "@/constants/fitnessGoals";
import ReplaceMealButton from "@/components/ReplaceMealButton";
import MealCompletionToggle from "@/components/MealCompletionToggle";
import WorkoutCompletionToggle from "@/components/WorkoutCompletionToggle";

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

function macroPct(value, target) {
  if (!target) return 0;
  return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
}

function buildHeroContent({ workout, mealPlan, completionPct, primaryGoal }) {
  if (!workout && !mealPlan) {
    return {
      eyebrow: "Dashboard",
      title: "Build your plan for today.",
      body: "You don’t have a workout or meal plan saved yet. Start by generating today’s schedule so everything is lined up in one place.",
    };
  }

  if (!workout) {
    return {
      eyebrow: "Dashboard",
      title: "Your meals are ready. Your workout still needs a plan.",
      body: "Your nutrition is set for today. Generate a workout so the rest of your day is mapped out too.",
    };
  }

  if (!mealPlan) {
    return {
      eyebrow: "Dashboard",
      title: "Your workout is ready. Add your meal plan next.",
      body: "Training is already on the board. Generate your meals so today’s plan feels complete instead of pieced together.",
    };
  }

  if (completionPct >= 80) {
    return {
      eyebrow: "Dashboard",
      title: "You’re on track today.",
      body: "Most of your plan is already checked off. Use this page to finish strong and keep the day consistent.",
    };
  }

  return {
    eyebrow: "Dashboard",
    title: `${primaryGoal} plan ready for today.`,
    body: "Your workout, meals, and progress are all here. Use this screen as the hub for what’s next.",
  };
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

  const [workout, mealPlan] = await Promise.all([
    prisma.workout.findFirst({ where: { userId: session.user.id, date: today } }),
    prisma.mealPlan.findFirst({ where: { userId: session.user.id, date: today }, include: { meals: true } }),
  ]);

  const mealMacros = sumMealMacros(mealPlan?.meals || []);
  const completedMeals = (mealPlan?.meals || []).filter((m) => m.isCompleted);
  const consumedMacros = sumMealMacros(completedMeals);
  const grouped = (mealPlan?.meals || []).reduce((acc, meal) => {
    const type = (meal.type || "").toLowerCase();
    acc[type] = acc[type] || [];
    acc[type].push(meal);
    return acc;
  }, {});

  const mealCalories = mealMacros.calories;
  const consumedCalories = consumedMacros.calories;

  const weightLb = profile?.weight || null;
  const weightKg = weightLb ? weightLb * 0.453592 : null;
  const diff = (workout?.difficulty || "beginner").toLowerCase();
  const met = diff === "advanced" ? 8 : diff === "intermediate" ? 6.5 : 5;
  const durationH = (workout?.duration || 0) / 60;
  const workoutCalories = weightKg ? Math.round(met * weightKg * durationH) : null;
  const burnedCalories = workout?.isCompleted ? (workoutCalories ?? 0) : 0;
  const completionTotal = (mealPlan?.meals?.length || 0) + (workout ? 1 : 0);
  const completionDone = completedMeals.length + (workout?.isCompleted ? 1 : 0);
  const completionPct = completionTotal ? Math.round((completionDone / completionTotal) * 100) : 0;

  const macroTargets = {
    protein: Number(profile?.weight || 0) || 160,
    carbs: Math.max(150, Math.round((mealMacros.carbs || 0) || 220)),
    fat: Math.max(50, Math.round((mealMacros.fat || 0) || 70)),
  };
  const spotlightMeal =
    grouped.breakfast?.[0] ||
    grouped.lunch?.[0] ||
    grouped.dinner?.[0] ||
    grouped.snack?.[0] ||
    null;
  const primaryGoalId = profile.fitnessGoal || profile.fitnessGoals?.[0] || "general_fitness";
  const primaryGoal = labelForFitnessGoal(primaryGoalId) || "General fitness";
  const hero = buildHeroContent({ workout, mealPlan, completionPct, primaryGoal });

  return (
    <main>
      <div className="dashboard-shell stack">
        <section className="brand-hero span-full">
          <div className="brand-hero-copy">
            <div className="eyebrow">{hero.eyebrow}</div>
            <div className="brand-hero-date">{formatUTCDateForDisplay(today, timeZone)}</div>
            <h1 className="brand-hero-title">{hero.title}</h1>
            <p className="brand-hero-text">
              {hero.body}
            </p>
            <div className="page-hero-actions">
              <Link href={`/workouts?date=${todayISO}`} className="btn btn-primary">Train today</Link>
              <Link href={`/meals?date=${todayISO}`} className="btn btn-outline">See meal plan</Link>
              <Link href="/progress" className="btn btn-secondary">Review progress</Link>
            </div>
            <div className="brand-chip-row">
              <div className="chip chip-success">Goal: {primaryGoal}</div>
              <div className="chip">{profile.workoutDuration || 30} minute sessions</div>
              <div className="chip">{completionPct}% adherence today</div>
            </div>
          </div>
          <div className="brand-hero-aside">
            <article className="spotlight-card spotlight-card-primary">
              <div className="metric-label">Today&apos;s score</div>
              <div className="spotlight-value">{completionPct}%</div>
              <div className="metric-detail">{completionDone} of {completionTotal} plan items completed.</div>
            </article>
            <article className="spotlight-card">
              <div className="metric-label">Nutrition balance</div>
              <div className="spotlight-row">
                <div>
                  <div className="spotlight-mini">{consumedCalories}</div>
                  <div className="metric-detail">calories in</div>
                </div>
                <div>
                  <div className="spotlight-mini">{burnedCalories}</div>
                  <div className="metric-detail">calories out</div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="brand-dashboard-grid">
          <article className="card span-2 brand-story-card">
            <header className="card-head brand-story-head">
              <div>
                <div className="section-badge section-badge-workout">Workout spotlight</div>
                <h3>{workout ? workout.name : "No session built yet"}</h3>
                <div className="sub">
                  {workout
                    ? `${workout.muscleGroup || "Full body focus"} • ${workout.duration} min • ${workout.difficulty || "beginner"}`
                    : "Generate a workout and this becomes your featured training brief."}
                </div>
              </div>
              {workout ? (
                <WorkoutCompletionToggle workoutId={workout.id} initialCompleted={workout.isCompleted} />
              ) : (
                <Link href="/workouts" className="btn btn-primary">Generate workout</Link>
              )}
            </header>
            <div className="brand-story-body">
              <div className="brand-story-copy">
                <div className="metric-label">Training note</div>
                <p className="brand-story-text">
                  {workout
                    ? `Your session is built for ${primaryGoal.toLowerCase()}. Use today as a focused block instead of another generic gym day.`
                    : "No workout is saved for today yet. Generate one to turn the dashboard into a real coaching brief."}
                </p>
                <div className="brand-story-actions">
                  <Link href={`/workouts?date=${todayISO}`} className="btn btn-outline">Open workout details</Link>
                  <Link href="/healthCalendar" className="btn btn-secondary">View calendar</Link>
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

          <article className="card span-2 brand-nutrition-card">
            <header className="card-head">
              <div>
                <div className="section-badge section-badge-meal">Nutrition spotlight</div>
                <h3>Macro rhythm for today</h3>
                <div className="sub">A cleaner view of what you&apos;ve eaten versus what the plan asked for.</div>
              </div>
            </header>
            <div className="stats brand-tight-stats">
              <div className="stat">
                <div className="stat-label">Calories</div>
                <div className="stat-value">{consumedCalories}<span className="unit">/ {mealCalories || 0}</span></div>
                <div className="progress"><span style={{ width: `${macroPct(consumedCalories, mealCalories || 1)}%` }} /></div>
              </div>
              <div className="stat">
                <div className="stat-label">Protein</div>
                <div className="stat-value">{formatMacro(consumedMacros.protein)}<span className="unit">g</span></div>
                <div className="progress"><span style={{ width: `${macroPct(consumedMacros.protein, macroTargets.protein)}%` }} /></div>
              </div>
              <div className="stat">
                <div className="stat-label">Carbs / Fat</div>
                <div className="stat-value">{formatMacro(consumedMacros.carbs)} / {formatMacro(consumedMacros.fat)}<span className="unit">g</span></div>
                <div className="sub">Planned {formatMacro(mealMacros.carbs)}g carbs and {formatMacro(mealMacros.fat)}g fat</div>
              </div>
            </div>
            <div className="brand-meal-spotlight">
              <div>
                <div className="metric-label">Featured meal</div>
                <div className="brand-meal-name">{spotlightMeal?.name || "No meals planned yet"}</div>
                <div className="metric-detail">
                  {spotlightMeal
                    ? `${spotlightMeal.calories ?? 0} kcal • ${formatMacro(spotlightMeal.protein)}g protein`
                    : "Generate a meal plan to see your first featured plate."}
                </div>
              </div>
              <Link href={`/meals?date=${todayISO}`} className="btn btn-outline">Open meal planner</Link>
            </div>
          </article>

          <article className="card span-2 brand-feed-card">
            <header className="card-head">
              <div>
                <h3>Today&apos;s lineup</h3>
                <div className="sub">Meal-by-meal tracking in a format that feels more like a curated daily feed.</div>
              </div>
              <Link href={`/meals?date=${todayISO}`} className="btn btn-secondary">Manage plan</Link>
            </header>
            <div className="planner brand-feed-grid">
              {["breakfast", "lunch", "dinner", "snack"].map((type) => (
                <article key={type} className="brand-feed-item">
                  <div className="brand-feed-head">
                    <div>
                      <div className="metric-label">{type}</div>
                      <div className="planner-head" style={{ textTransform: 'capitalize' }}>{type} block</div>
                    </div>
                    <ReplaceMealButton dateISO={todayISO} type={type} className="btn btn-secondary" label="Replace" />
                  </div>
                  {(grouped[type] || []).length ? (
                    (grouped[type] || []).map((meal) => (
                      <div key={meal.id} className="list-row brand-feed-row">
                        <div>
                          <strong>{meal.name}</strong>
                          <div className="muted brand-feed-meta">
                            {meal.calories ?? 0} kcal • {formatMacro(meal.protein)}g protein • {formatMacro(meal.carbs)}g carbs • {formatMacro(meal.fat)}g fat
                          </div>
                        </div>
                        <MealCompletionToggle mealId={meal.id} initialCompleted={meal.isCompleted} />
                      </div>
                    ))
                  ) : (
                    <div className="list-row brand-feed-row"><span className="muted">No {type} planned.</span></div>
                  )}
                </article>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}


