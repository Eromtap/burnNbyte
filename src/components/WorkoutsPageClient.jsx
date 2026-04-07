'use client';

import { useState } from 'react';
import DateStrip from '@/components/DateStrip';
import ExerciseLogPanel from '@/components/ExerciseLogPanel';
import GenerateWorkout from '@/components/GenerateWorkout';
import WorkoutCompletionToggle from '@/components/WorkoutCompletionToggle';

function toYMDLocal(d){
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYMDLocal(ymd){
  if (!ymd) return new Date();
  const [y, m, d] = String(ymd).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addDaysLocal(d, n){
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function extractExerciseSuggestions(instructions){
  if (!Array.isArray(instructions)) return [];
  const candidates = instructions
    .map((step) => {
      if (typeof step !== 'string') return null;
      let cleaned = step.replace(/\s+/g, ' ').trim();
      if (!cleaned) return null;
      cleaned = cleaned.replace(/^\d+[\.\)]\s*/, '').trim();
      cleaned = cleaned.split(':')[0].trim();
      cleaned = cleaned.replace(/\s+-\s+\d.*$/i, '').trim();
      cleaned = cleaned.replace(/\b\d+\s*(x|×)\s*\d+\b.*$/i, '').trim();
      cleaned = cleaned.replace(/\b\d+\s*(reps?|sets?|secs?|seconds?|mins?|minutes?)\b.*$/i, '').trim();
      if (cleaned.length < 2 || cleaned.length > 80) return null;
      return cleaned;
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

export default function WorkoutsPageClient({
  profile,
  initialSelectedISO,
  initialWorkout = null,
  initialExerciseLogs = [],
}){
  const [selectedISO, setSelectedISO] = useState(initialSelectedISO);
  const [workout, setWorkout] = useState(initialWorkout);
  const [exerciseLogs, setExerciseLogs] = useState(Array.isArray(initialExerciseLogs) ? initialExerciseLogs : []);
  const [exerciseSuggestions, setExerciseSuggestions] = useState(
    initialWorkout ? extractExerciseSuggestions(initialWorkout.instructions) : []
  );
  const [loadingDay, setLoadingDay] = useState(false);
  const [loadError, setLoadError] = useState(null);

  function syncUrl(nextISO){
    window.history.replaceState(null, '', `/workouts?date=${nextISO}`);
  }

  async function loadDay(nextISO){
    if (!nextISO || nextISO === selectedISO) return;
    setLoadingDay(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/workouts?date=${encodeURIComponent(nextISO)}`, {
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load workout');
      syncUrl(nextISO);
      setSelectedISO(nextISO);
      setWorkout(data?.workout || null);
      setExerciseLogs(Array.isArray(data?.exerciseLogs) ? data.exerciseLogs : []);
      setExerciseSuggestions(
        Array.isArray(data?.exerciseSuggestions)
          ? data.exerciseSuggestions
          : extractExerciseSuggestions(data?.workout?.instructions)
      );
    } catch (err) {
      setLoadError(err?.message || 'Failed to load workout');
    } finally {
      setLoadingDay(false);
    }
  }

  function handleShiftWeek(direction){
    const shifted = addDaysLocal(parseYMDLocal(selectedISO), direction * 7);
    loadDay(toYMDLocal(shifted));
  }

  async function refreshSelectedDay(){
    setLoadingDay(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/workouts?date=${encodeURIComponent(selectedISO)}`, {
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load workout');
      setWorkout(data?.workout || null);
      setExerciseLogs(Array.isArray(data?.exerciseLogs) ? data.exerciseLogs : []);
      setExerciseSuggestions(
        Array.isArray(data?.exerciseSuggestions)
          ? data.exerciseSuggestions
          : extractExerciseSuggestions(data?.workout?.instructions)
      );
    } catch (err) {
      setLoadError(err?.message || 'Failed to load workout');
    } finally {
      setLoadingDay(false);
    }
  }

  return (
    <>
      <section className="hero-card page-hero">
        <div className="page-hero-copy">
          <div className="eyebrow">Workout builder</div>
          <div>
            <h1 className="page-hero-title">Train with a cleaner plan and tighter execution.</h1>
            <p className="page-hero-text">
              Generate by date, track completion, and keep exercise progress next to the actual session so the workout page feels like a tool, not a dump.
            </p>
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

      <DateStrip
        basePath="/workouts"
        selectedISO={selectedISO}
        onSelectDate={loadDay}
        onShiftWeek={handleShiftWeek}
      />

      <section className="section-grid">
        <article id="generate" className="card section-side">
          <header className="card-head">
            <div>
              <h3>Build my workout</h3>
              <div className="sub">Create or update the session for the selected date.</div>
            </div>
          </header>
          <GenerateWorkout
            initialPreferences={profile}
            selectedISO={selectedISO}
            onGenerated={refreshSelectedDay}
          />
        </article>

        <article id="session" className="card section-main">
          <header className="card-head">
            <div>
              <h3>My session</h3>
              <div className="sub">
                {loadingDay
                  ? 'Loading my session...'
                  : (workout ? 'Everything I need to execute today.' : 'Build a workout to populate this view.')}
              </div>
            </div>
            {workout && <div className="section-badge section-badge-workout">{workout.difficulty || 'beginner'}</div>}
          </header>
          {loadError && <div className="list-row"><span className="muted">{loadError}</span></div>}
          {!loadError && !workout && !loadingDay && (
            <div className="list-row"><span className="muted">No workout for this date yet. Use the builder to create one.</span></div>
          )}
          {workout && (
            <div className="stack">
              <div className="list-row workout-session-summary">
                <div>
                  <strong>{workout.name}</strong>
                  <div className="muted" style={{ marginTop: 4 }}>{workout.muscleGroup || 'General training'} • {workout.duration} minutes</div>
                </div>
                <WorkoutCompletionToggle
                  key={workout.id}
                  workoutId={workout.id}
                  initialCompleted={workout.isCompleted}
                  className="workout-session-toggle"
                  onUpdated={(updatedWorkout) => {
                    if (!updatedWorkout) return;
                    setWorkout((prev) => (prev ? { ...prev, ...updatedWorkout } : updatedWorkout));
                  }}
                />
              </div>
              {Array.isArray(workout.instructions) && workout.instructions.length > 0 && (
                <div className="stack">
                  <div className="planner-head">Instructions</div>
                  <ul className="list">
                    {workout.instructions.map((step, i) => (
                      <li key={i} className="list-row workout-instruction-row" style={{ alignItems: 'flex-start' }}>
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
                <div className="planner-head">How it&apos;s going</div>
                <ExerciseLogPanel
                  workoutId={workout.id}
                  initialLogs={exerciseLogs}
                  exerciseSuggestions={exerciseSuggestions}
                />
              </div>
            </div>
          )}
        </article>
      </section>
    </>
  );
}
