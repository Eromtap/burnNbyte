import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import GenerateWorkout from "@/components/GenerateWorkout";
import DateStrip from "@/components/DateStrip";
import WorkoutCompletionToggle from "@/components/WorkoutCompletionToggle";
import ExerciseLogPanel from "@/components/ExerciseLogPanel";

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
function extractExerciseSuggestions(instructions){
  if (!Array.isArray(instructions)) return [];
  const candidates = instructions
    .map((step) => {
      if (typeof step !== 'string') return null;
      const cleaned = step.replace(/\s+/g, ' ').trim();
      if (!cleaned) return null;
      const firstChunk = cleaned.split(/[:\-]/)[0].trim();
      if (firstChunk.length < 2 || firstChunk.length > 60) return null;
      return firstChunk;
    })
    .filter(Boolean);
  return Array.from(new Set(candidates));
}

function normalizeInstructionForSearch(step){
  if (typeof step !== 'string') return '';
  let text = step.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  text = text.split(/[:\-]/)[0].trim();
  text = text.replace(/\([^)]*\)/g, '').trim();
  text = text.replace(/\b\d+\s*(x|×)\s*\d+\b/gi, '').trim();
  text = text.replace(/\b\d+\s*(reps?|sets?|set|rep)\b/gi, '').trim();
  text = text.replace(/\bsets?\s*of\s*\d+\b/gi, '').trim();
  text = text.replace(/\b\d+\s*(secs?|seconds?|mins?|minutes?)\b/gi, '').trim();
  text = text.replace(/\s{2,}/g, ' ').trim();
  return text;
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
  const exerciseLogs = workout
    ? await prisma.exerciseLog.findMany({
        where: { workoutId: workout.id, userId: session.user.id },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const exerciseSuggestions = workout ? extractExerciseSuggestions(workout.instructions) : [];

  // Removed Upcoming section

  return (
    <main>
      <div className="page-shell">
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
                <div className="list-row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="muted">{workout.isCompleted ? 'Completed' : 'Not done yet'}</span>
                  <WorkoutCompletionToggle key={workout.id} workoutId={workout.id} initialCompleted={workout.isCompleted} />
                </div>
                <div className="list-row"><span>Name</span><span className="workout-title">{workout.name}</span></div>
                {workout.muscleGroup && <div className="list-row"><span>Muscle Group</span><span className="muted">{workout.muscleGroup}</span></div>}
                <div className="list-row"><span>Duration</span><span className="muted">{workout.duration} min</span></div>
                {Array.isArray(workout.instructions) && workout.instructions.length > 0 && (
                  <div>
                    <div className="planner-head">Instructions</div>
                    <ul className="list" style={{marginTop:8}}>
                      {workout.instructions.map((step, i) => (
                        <li key={i} className="list-row" style={{ alignItems: 'flex-start' }}>
                          <div>
                            <div className="instruction-text">{step}</div>
                            <a
                              style={{
                                display: 'inline-block',
                                marginTop: 4,
                                color: 'var(--accent)',
                                fontSize: 12,
                                textDecoration: 'none',
                                fontWeight: 600,
                              }}
                              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                                `${normalizeInstructionForSearch(step) || step} exercise demo`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Need a demo? Watch on YouTube
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <div className="planner-head">Exercise Progress</div>
                  <ExerciseLogPanel workoutId={workout.id} initialLogs={exerciseLogs} exerciseSuggestions={exerciseSuggestions} />
                </div>
              </div>
            )}
          </article>
        </div>
      </div>
    </main>
  );
}
