'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  TimerReset,
  Trophy,
} from 'lucide-react';
import styles from './page.module.css';

const exercises = [
  { name: 'Goblet squat', detail: '3 sets · 10–12 reps', sets: 3, weight: 35, reps: 12 },
  { name: 'Dumbbell bench press', detail: '3 sets · 8–10 reps', sets: 3, weight: 30, reps: 10 },
  { name: 'One-arm row', detail: '3 sets · 10 reps / side', sets: 3, weight: 35, reps: 10 },
  { name: 'Dead bug', detail: '2 sets · 8 reps / side', sets: 2, weight: 0, reps: 8 },
];

const totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets, 0);

export default function WorkoutTrackerPreview() {
  const [phase, setPhase] = useState('ready');
  const [activeIndex, setActiveIndex] = useState(0);
  const [completed, setCompleted] = useState(() => exercises.map(() => []));
  const [weight, setWeight] = useState(exercises[0].weight);
  const [reps, setReps] = useState(exercises[0].reps);
  const [restSeconds, setRestSeconds] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const activeExercise = exercises[activeIndex];
  const completedSets = useMemo(
    () => completed.reduce((sum, sets) => sum + sets.length, 0),
    [completed]
  );
  const progress = Math.round((completedSets / totalSets) * 100);

  useEffect(() => {
    if (phase !== 'active') return undefined;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (restSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setRestSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [restSeconds]);

  function selectExercise(index) {
    setActiveIndex(index);
    setWeight(exercises[index].weight);
    setReps(exercises[index].reps);
    setRestSeconds(0);
  }

  function startWorkout() {
    setPhase('active');
    setElapsed(0);
  }

  function completeSet() {
    const nextCompleted = completed.map((sets) => [...sets]);
    nextCompleted[activeIndex].push({ weight, reps });
    setCompleted(nextCompleted);

    const nowComplete = nextCompleted.reduce((sum, sets) => sum + sets.length, 0);
    if (nowComplete === totalSets) {
      setPhase('complete');
      setRestSeconds(0);
      return;
    }

    if (nextCompleted[activeIndex].length >= activeExercise.sets) {
      const nextIndex = exercises.findIndex((exercise, index) => (
        index > activeIndex && nextCompleted[index].length < exercise.sets
      ));
      if (nextIndex !== -1) selectExercise(nextIndex);
    }
    setRestSeconds(60);
  }

  function resetWorkout() {
    setPhase('ready');
    setActiveIndex(0);
    setCompleted(exercises.map(() => []));
    setWeight(exercises[0].weight);
    setReps(exercises[0].reps);
    setRestSeconds(0);
    setElapsed(0);
  }

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');
  const currentSet = Math.min(completed[activeIndex].length + 1, activeExercise.sets);

  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <header className={styles.topbar}>
        <Link href="/design-lab/cardless" className={styles.backLink}>
          <ArrowLeft size={16} /> Design lab
        </Link>
        <div className={styles.brand}><span>burnNbyte</span><em>interaction preview</em></div>
        <Link href="/workouts" className={styles.liveLink}>Back to workouts</Link>
      </header>

      <section className={styles.shell}>
        <div className={styles.sessionHeader}>
          <div>
            <span className={styles.eyebrow}>TODAY · FULL BODY</span>
            <h1>Strength foundation</h1>
          </div>
          <div className={styles.sessionMeta}>
            <span><Clock3 size={15} /> {phase === 'ready' ? '30 min' : `${minutes}:${seconds}`}</span>
            <span>{completedSets} / {totalSets} sets</span>
          </div>
        </div>

        <div className={styles.progressTrack} aria-label={`${progress}% complete`}>
          <span style={{ width: `${progress}%` }} />
        </div>

        {phase === 'ready' && (
          <section className={styles.readyPanel}>
            <div className={styles.readyIcon}><Dumbbell size={28} /></div>
            <span className={styles.eyebrow}>YOUR SESSION IS READY</span>
            <h2>One exercise at a time.</h2>
            <p>We’ll keep your place, prefill each target, and handle the rest between sets.</p>
            <button type="button" className={styles.primaryButton} onClick={startWorkout}>
              Start workout <ChevronRight size={18} />
            </button>
            <div className={styles.readyList}>
              {exercises.map((exercise, index) => (
                <div key={exercise.name}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{exercise.name}</strong>
                  <small>{exercise.detail}</small>
                </div>
              ))}
            </div>
          </section>
        )}

        {phase === 'active' && (
          <div className={styles.trackerGrid}>
            <nav className={styles.exerciseRail} aria-label="Workout exercises">
              <span className={styles.railLabel}>EXERCISES</span>
              {exercises.map((exercise, index) => {
                const count = completed[index].length;
                const done = count >= exercise.sets;
                return (
                  <button
                    type="button"
                    key={exercise.name}
                    className={index === activeIndex ? styles.exerciseActive : ''}
                    onClick={() => selectExercise(index)}
                  >
                    <i>{done ? <Check size={14} /> : index + 1}</i>
                    <span><strong>{exercise.name}</strong><small>{count} / {exercise.sets} sets</small></span>
                  </button>
                );
              })}
            </nav>

            <section className={styles.activePanel}>
              {restSeconds > 0 && (
                <div className={styles.restBar}>
                  <TimerReset size={19} />
                  <span><strong>Rest</strong><small>Next set is ready when you are</small></span>
                  <b>0:{String(restSeconds).padStart(2, '0')}</b>
                  <button type="button" onClick={() => setRestSeconds(0)}>Skip</button>
                </div>
              )}

              <div className={styles.activeHeading}>
                <div>
                  <span className={styles.eyebrow}>SET {currentSet} OF {activeExercise.sets}</span>
                  <h2>{activeExercise.name}</h2>
                  <p>{activeExercise.detail}</p>
                </div>
                <span className={styles.lastTime}><Sparkles size={14} /> Last time: {activeExercise.weight || 'Bodyweight'}{activeExercise.weight ? ' lb' : ''}</span>
              </div>

              <div className={styles.controls}>
                <div className={styles.stepper}>
                  <label>WEIGHT <small>lb</small></label>
                  <div>
                    <button type="button" aria-label="Decrease weight" onClick={() => setWeight(Math.max(0, weight - 5))}><Minus size={18} /></button>
                    <strong>{weight || 'BW'}</strong>
                    <button type="button" aria-label="Increase weight" onClick={() => setWeight(weight + 5)}><Plus size={18} /></button>
                  </div>
                </div>
                <div className={styles.stepper}>
                  <label>REPS</label>
                  <div>
                    <button type="button" aria-label="Decrease reps" onClick={() => setReps(Math.max(1, reps - 1))}><Minus size={18} /></button>
                    <strong>{reps}</strong>
                    <button type="button" aria-label="Increase reps" onClick={() => setReps(reps + 1)}><Plus size={18} /></button>
                  </div>
                </div>
              </div>

              <div className={styles.setHistory}>
                <span>THIS EXERCISE</span>
                <div>
                  {Array.from({ length: activeExercise.sets }, (_, index) => {
                    const set = completed[activeIndex][index];
                    return (
                      <i key={index} className={set ? styles.setDone : ''}>
                        {set ? <Check size={14} /> : index + 1}
                      </i>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={completeSet}
                disabled={completed[activeIndex].length >= activeExercise.sets}
              >
                <Check size={18} /> Complete set
              </button>

              <div className={styles.exerciseNav}>
                <button type="button" disabled={activeIndex === 0} onClick={() => selectExercise(activeIndex - 1)}><ChevronLeft size={16} /> Previous</button>
                <button type="button" disabled={activeIndex === exercises.length - 1} onClick={() => selectExercise(activeIndex + 1)}>Next <ChevronRight size={16} /></button>
              </div>
            </section>
          </div>
        )}

        {phase === 'complete' && (
          <section className={styles.completePanel}>
            <div className={styles.trophy}><Trophy size={30} /></div>
            <span className={styles.eyebrow}>SESSION COMPLETE</span>
            <h2>That work counts.</h2>
            <p>Your next workout can now use what you completed today.</p>
            <div className={styles.stats}>
              <div><strong>{totalSets}</strong><span>sets</span></div>
              <div><strong>{minutes}:{seconds}</strong><span>duration</span></div>
              <div><strong>+120</strong><span>XP earned</span></div>
            </div>
            <button type="button" className={styles.secondaryButton} onClick={resetWorkout}><RotateCcw size={16} /> Run preview again</button>
          </section>
        )}
      </section>
    </main>
  );
}
