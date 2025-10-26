'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function GenerateWorkout() {
  const { data: session } = useSession();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const userPrefs = session?.user?.preferences || {};

  async function handleClick() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/generateWorkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender: userPrefs.gender,
          heightFt: userPrefs.heightFt,
          heightIn: userPrefs.heightIn,
          weight: userPrefs.weight,
          fitnessGoal: userPrefs.fitnessGoal,
          fitnessLevel: userPrefs.fitnessLevel || 'beginner',
          workoutPreference: userPrefs.workoutPreference,
          workoutDuration: userPrefs.workoutDuration,
          workoutDays: userPrefs.workoutDays,
        }),
      });
      const data = await res.json();
      setResult(Array.isArray(data) ? data : (data?.workouts || null));
    } catch (err) {
      setResult({ error: 'Failed to generate workout.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <button className="btn btn-primary" onClick={handleClick} disabled={loading}>
        {loading ? 'Generating…' : 'Create Workout Plan'}
      </button>

      {Array.isArray(result) && result.length > 0 && (
        <div className="stack">
          {result.map((w) => (
            <article className="card" key={w.id || `${w.name}-${w.date}`}>
              <header className="card-head">
                <h3>{w.name || 'Workout'}</h3>
                <div className="sub">{w.date ? new Date(w.date).toDateString() : ''}</div>
              </header>
              <div className="stack">
                <div className="list-row"><span>Duration</span><span className="muted">{w.duration} min</span></div>
                {w.muscleGroup && <div className="list-row"><span>Muscle</span><span className="muted">{w.muscleGroup}</span></div>}
                {Array.isArray(w.instructions) && w.instructions.length > 0 && (
                  <div>
                    <div className="planner-head">Instructions</div>
                    <ul className="list" style={{ marginTop: 8 }}>
                      {w.instructions.map((s, i) => (<li key={i} className="list-row"><span>{s}</span></li>))}
                    </ul>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
