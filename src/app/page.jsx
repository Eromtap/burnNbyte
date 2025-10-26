// app/page.jsx (server component)
import { getServerSession } from "next-auth/next"; // ✅ correct import
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import MiniCalendar from "@/components/MiniCalendar";

// Server component renders dashboard content; AppFrame wraps it globally

export default async function HomePage() {
  const session = await getServerSession(authOptions); // now defined
  if (!session) redirect("/signin");

  const profile = await prisma.userProfile.findUnique({
    where: { userId: String(session.user.id) },
  });

  if (!profile) redirect("/onboarding/1");

  const today = new Date();
  today.setUTCHours(0,0,0,0);

  const [workout, mealPlan] = await Promise.all([
    prisma.workout.findFirst({ where: { userId: session.user.id, date: today } }),
    prisma.mealPlan.findFirst({ where: { userId: session.user.id, date: today }, include: { meals: true } })
  ]);

  const grouped = (mealPlan?.meals || []).reduce((acc,m)=>{
    const t=(m.type||'').toLowerCase();
    acc[t]=acc[t]||[]; acc[t].push(m); return acc;
  },{});

  // Quick calorie estimates
  const mealCalories = mealPlan?.totalCalories ?? (mealPlan?.meals?.reduce((sum, m) => sum + (Number(m.calories) || 0), 0) || 0);
  const weightLb = profile?.weight || null;
  const weightKg = weightLb ? weightLb * 0.453592 : null;
  const diff = (workout?.difficulty || 'beginner').toLowerCase();
  const met = diff === 'advanced' ? 8 : diff === 'intermediate' ? 6.5 : 5.0;
  const durationH = (workout?.duration || 0) / 60;
  const workoutCalories = weightKg ? Math.round(met * weightKg * durationH) : null;

  return (
    <main>
      <div className="grid">
        <article className="card span-2">
          <header className="card-head">
            <h3>Today’s Summary</h3>
            <div className="sub">Estimated totals</div>
          </header>
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Food Calories</div>
              <div className="stat-value">{mealCalories || '—'}<span className="unit"> kcal</span></div>
            </div>
            <div className="stat">
              <div className="stat-label">Workout Calories
                <span className="pill" title="Estimate uses MET by difficulty (beginner≈5.0, intermediate≈6.5, advanced≈8.0) × weight(kg) × duration(hours)" style={{marginLeft:8}}>i</span>
              </div>
              <div className="stat-value">{workoutCalories ?? '—'}<span className="unit"> kcal</span></div>
            </div>
          </div>
        </article>

        <article className="card span-2">
          <header className="card-head">
            <h3>Today’s Workout</h3>
            <div className="sub">{workout ? new Date(workout.date).toDateString() : 'No workout saved'}</div>
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
            <h3>Today’s Meal Plan</h3>
            <div className="sub">{mealPlan ? new Date(mealPlan.date).toDateString() : 'No meal plan saved'}</div>
          </header>
          {!mealPlan && (
            <div className="muted">No meal plan for today. Go to <Link href="/meals" className="pill">Meals</Link> to generate.</div>
          )}
          {mealPlan && (
            <div className="stack">
              {['breakfast','lunch','dinner','snack'].map((type)=>(
                <div key={type} className="planner-col">
                  <div className="planner-head" style={{textTransform:'capitalize'}}>{type}</div>
                  <div>
                    {(grouped[type]||[]).map(m => (
                      <div key={m.id} className="list-row" style={{marginTop:8}}>
                        <span>{m.name}</span>
                        <span className="muted">{m.calories ?? '—'} kcal</span>
                      </div>
                    ))}
                    {!(grouped[type]||[]).length && <div className="muted">No {type} planned.</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="card">
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
        </article>
      </div>
    </main>
  );
}
