'use client';

import { useState } from 'react';
import DateStrip from '@/components/DateStrip';
import ExerciseLogPanel from '@/components/ExerciseLogPanel';
import GenerateWorkout from '@/components/GenerateWorkout';
import WorkoutCompletionToggle from '@/components/WorkoutCompletionToggle';
import MobileDisclosure from '@/components/MobileDisclosure';
import ReplaceExerciseButton from '@/components/ReplaceExerciseButton';
import ReplaceWorkoutButton from '@/components/ReplaceWorkoutButton';

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

  const generatorPanel = (
    <article id="generate" className={`card ${workout ? 'span-full' : 'section-side'}`}>
      <header className="card-head">
        <div>
          <h3>{workout ? 'Generate new workout' : 'Build my workout'}</h3>
          <div className="sub">
            {workout
              ? 'Replace the current session with a newly generated workout.'
              : 'Create a session for the selected date.'}
          </div>
        </div>
      </header>
      <GenerateWorkout
        initialPreferences={profile}
        selectedISO={selectedISO}
        onGenerated={refreshSelectedDay}
      />
    </article>
  );

  return (
    <>
      <DateStrip
        basePath="/workouts"
        selectedISO={selectedISO}
        onSelectDate={loadDay}
        onShiftWeek={handleShiftWeek}
      />

      <section className="section-grid bn-route-grid">
        {!workout && generatorPanel}

        <article id="session" className={`card ${workout ? 'span-full' : 'section-main'}`}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <ReplaceWorkoutButton
                    workoutId={workout.id}
                    workoutName={workout.name}
                    onReplaced={(updatedWorkout) => {
                      setWorkout(updatedWorkout);
                      setExerciseSuggestions(extractExerciseSuggestions(updatedWorkout.instructions));
                    }}
                  />
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
              </div>
              {Array.isArray(workout.instructions) && workout.instructions.length > 0 && (
                <MobileDisclosure
                  className="mobile-disclosure detail-disclosure"
                  summaryClassName="mobile-disclosure-summary detail-disclosure-summary"
                  panelClassName="mobile-disclosure-panel"
                  summary={
                    <>
                      <span className="planner-head">Instructions</span>
                      <span className="mobile-disclosure-meta">{workout.instructions.length} steps</span>
                    </>
                  }
                >
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
                            <div style={{ marginTop: 10 }}>
                              <ReplaceExerciseButton
                                workoutId={workout.id}
                                instructionIndex={i}
                                currentInstruction={step}
                                onReplaced={(updatedWorkout) => {
                                  setWorkout(updatedWorkout);
                                  setExerciseSuggestions(extractExerciseSuggestions(updatedWorkout.instructions));
                                }}
                              />
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                </MobileDisclosure>
              )}
              <MobileDisclosure
                className="mobile-disclosure detail-disclosure"
                summaryClassName="mobile-disclosure-summary detail-disclosure-summary"
                panelClassName="mobile-disclosure-panel"
                summary={
                  <>
                    <span className="planner-head">How it&apos;s going</span>
                    <span className="mobile-disclosure-meta">{exerciseLogs.length} logs</span>
                  </>
                }
              >
                  <ExerciseLogPanel
                    workoutId={workout.id}
                    initialLogs={exerciseLogs}
                    exerciseSuggestions={exerciseSuggestions}
                  />
              </MobileDisclosure>
            </div>
          )}
        </article>

        {workout && generatorPanel}
      </section>
    </>
  );
}
