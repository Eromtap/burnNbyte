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
        orderBy: { createdAt: 'desc' },
      })
    : [];
  const exerciseSuggestions = workout ? extractExerciseSuggestions(workout.instructions) : [];

  return (
    <main>
      <div className="page-shell stack">
        <section className="hero-card page-hero">
          <div className="page-hero-copy">
            <div className="eyebrow">Workout builder</div>
            <div>
              <h1 className="page-hero-title">Train with a cleaner plan and tighter execution.</h1>
              <p className="page-hero-text">
                Generate by date, track completion, and keep exercise progress next to the actual session so the workout page feels like a tool, not a dump.
              </p>
            </div>
            <div className="page-hero-actions">
              <LinkButton href="#generate">Generate workout</LinkButton>
              <LinkButton href="#session" variant="outline">Jump to session</LinkButton>
            </div>
          </div>
          <aside className="hero-panel hero-metrics">
            <div className="metric-card">
              <div className="metric-label">Selected day</div>
              <div className="metric-value">{selectedISO}</div>
              <div className="metric-detail">{workout ? 'Plan ready for this day.' : 'No plan saved yet.'}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Session target</div>
              <div className="metric-value">{profile.workoutDuration || 30}<span className="unit">min</span></div>
              <div className="metric-detail">Based on your profile defaults.</div>
            </div>
          </aside>
        </section>

        <DateStrip basePath="/workouts" selectedISO={selectedISO} />

        <section className="section-grid">
          <article id="generate" className="card section-side">
            <header className="card-head">
              <div>
                <h3>Generate workout plan</h3>
                <div className="sub">Creates or updates the session for the selected date.</div>
              </div>
            </header>
            <GenerateWorkout />
          </article>

          <article id="session" className="card section-main">
            <header className="card-head">
              <div>
                <h3>Session details</h3>
                <div className="sub">{workout ? 'Everything you need to execute today.' : 'Generate a workout to populate this view.'}</div>
              </div>
              {workout && <div className="section-badge section-badge-workout">{workout.difficulty || 'beginner'}</div>}
            </header>
            {!workout && <div className="list-row"><span className="muted">No workout for this date. Use the generator to create one.</span></div>}
            {workout && (
              <div className="stack">
                <div className="list-row">
                  <div>
                    <strong>{workout.name}</strong>
                    <div className="muted" style={{ marginTop: 4 }}>{workout.muscleGroup || 'General training'} • {workout.duration} minutes</div>
                  </div>
                  <WorkoutCompletionToggle key={workout.id} workoutId={workout.id} initialCompleted={workout.isCompleted} />
                </div>
                {Array.isArray(workout.instructions) && workout.instructions.length > 0 && (
                  <div className="stack">
                    <div className="planner-head">Instructions</div>
                    <ul className="list">
                      {workout.instructions.map((step, i) => (
                        <li key={i} className="list-row" style={{ alignItems: 'flex-start' }}>
                          <div>
                            <div className="instruction-text">{step}</div>
                            <a
                              style={{ display: 'inline-block', marginTop: 8, color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}
                              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${normalizeInstructionForSearch(step) || step} exercise demo`)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Watch a demo on YouTube
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="stack">
                  <div className="planner-head">Exercise progress</div>
                  <ExerciseLogPanel workoutId={workout.id} initialLogs={exerciseLogs} exerciseSuggestions={exerciseSuggestions} />
                </div>
              </div>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}

function LinkButton({ href, children, variant = 'primary' }) {
  return <a href={href} className={`btn ${variant === 'outline' ? 'btn-outline' : 'btn-primary'}`}>{children}</a>;
}

