import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import GenerateWorkout from "@/components/GenerateWorkout";
import DateStrip from "@/components/DateStrip";

function toUTCDateFromLocalYMD(ymd){
  const [y,m,d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, (m||1)-1, d||1));
}
function toYMDInTimeZone(date, timeZone){
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value ?? '0000';
  const month = parts.find(p => p.type === 'month')?.value ?? '01';
  const day = parts.find(p => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}
function formatYMDForDisplay(ymd, timeZone){
  const [y,m,d] = ymd.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, (m||1)-1, d||1));
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(utcDate);
}

function resolveTimeZone(candidate){
  try {
    if (candidate) {
      new Intl.DateTimeFormat(undefined, { timeZone: candidate }).format(new Date());
      return candidate;
    }
  } catch (_err) {
    // ignore and fall back
  }
  return 'UTC';
}

export default async function WorkoutsPage({ searchParams: searchParamsPromise }){
  const searchParams = await searchParamsPromise;
  const resolveDateParam = () => {
    if (!searchParams) return undefined;
    if (typeof searchParams.get === 'function') {
      return searchParams.get('date') || undefined;
    }
    const raw = searchParams?.date;
    if (Array.isArray(raw)) return raw[0];
    return raw;
  };

  const headerStore = await headers();
  const timeZoneCandidate =
    headerStore.get('x-vercel-ip-timezone') ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    'UTC';
  const timeZone = resolveTimeZone(timeZoneCandidate);

  const session = await requireAuth();
  const profile = await prisma.userProfile.findUnique({ where: { userId: String(session.user.id) } });
  if (!profile) redirect('/onboarding/1');

  const todayISO = toYMDInTimeZone(new Date(), timeZone);
  const dateParam = resolveDateParam();
  const selectedISO = dateParam ? String(dateParam) : todayISO;
  const baseUtc = toUTCDateFromLocalYMD(selectedISO);

  const workout = await prisma.workout.findFirst({ where: { userId: session.user.id, date: baseUtc } });

  // Removed Upcoming section

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
            <div className="sub">{workout ? selectedISO : 'No workout on this day'}</div>
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

        
      </div>
    </main>
  );
}
