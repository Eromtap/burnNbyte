import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import GenerateWorkout from "@/components/GenerateWorkout";
import Link from "next/link";
import DateStrip from "@/components/DateStrip";

function toYMDLocal(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function parseYMDLocal(ymd){
  const [y,m,d] = ymd.split('-').map(Number);
  return new Date(y, (m||1)-1, d||1);
}
function toUTCDateFromLocalYMD(ymd){
  const [y,m,d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, (m||1)-1, d||1));
}

export default async function WorkoutsPage({ searchParams }){
  const session = await requireAuth();
  const profile = await prisma.userProfile.findUnique({ where: { userId: String(session.user.id) } });
  if (!profile) redirect('/onboarding/1');

  const todayLocal = new Date(); todayLocal.setHours(0,0,0,0);
  const selectedISO = searchParams?.date ? String(searchParams.date) : toYMDLocal(todayLocal);
  const baseUtc = toUTCDateFromLocalYMD(selectedISO);

  const workout = await prisma.workout.findFirst({ where: { userId: session.user.id, date: baseUtc } });

  const upcoming = await prisma.workout.findMany({
    where: { userId: session.user.id, date: { gte: new Date() } },
    orderBy: { date: 'asc' },
    take: 14
  });

  return (
    <main>
      <div className="stack">
        <DateStrip basePath="/workouts" selectedISO={selectedISO} />
        <article className="card">
          <header className="card-head">
            <h3>Generate Workout Plan</h3>
            <div className="sub">Creates/upserts workouts by date</div>
          </header>
          <GenerateWorkout />
        </article>

        <article className="card">
          <header className="card-head">
            <h3>Workout</h3>
            <div className="sub">{workout ? new Date(workout.date).toDateString() : 'No workout on this day'}</div>
          </header>
          {!workout && <div className="muted">No workout for today. Use the button above to generate.</div>}
          {workout && (
            <div className="stack">
              <div className="list-row"><span>Name</span><span className="muted">{workout.name}</span></div>
              {workout.muscleGroup && <div className="list-row"><span>Muscle Group</span><span className="muted">{workout.muscleGroup}</span></div>}
              <div className="list-row"><span>Duration</span><span className="muted">{workout.duration} min</span></div>
              {Array.isArray(workout.instructions) && workout.instructions.length > 0 && (
                <div>
                  <div className="planner-head">Instructions</div>
                  <ul className="list" style={{marginTop:8}}>
                    {workout.instructions.map((step, i) => (
                      <li key={i} className="list-row"><span>{step}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </article>

        <article className="card">
          <header className="card-head">
            <h3>Upcoming</h3>
            <div className="sub">Next 14 saved workouts</div>
          </header>
          <ul className="list">
            {upcoming.map(w => (
              <li key={w.id} className="list-row">
                <Link href={`/workouts?date=${toYMDLocal(new Date(w.date))}`} className="pill">{new Date(w.date).toDateString()}</Link>
                <span>{w.name}</span>
                <span className="muted">{w.duration} min</span>
              </li>
            ))}
            {!upcoming.length && <li className="list-row"><span className="muted">No workouts saved yet.</span></li>}
          </ul>
        </article>
      </div>
    </main>
  );
}
