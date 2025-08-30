'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';


export default function GenerateWorkout() {
  const { data: session, status } = useSession();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const userPrefs = session.user.preferences;

  async function handleClick() {
    setLoading(true);
    setResult(null);

    console.log("userId:", session?.user?.id); // safe log
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
          fitnessLevel: 'begginer',
          workoutPreference: userPrefs.workoutPreference,
          workoutDuration: userPrefs.workoutDuration,
          workoutFrequency: userPrefs.workoutFrequency,
        }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: 'Failed to fetch workout.', err: String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleClick} disabled={loading}>
        {loading ? 'Loading...' : 'Create Workout Plan'}
      </button>

      {result && (
        <>
          <pre style={{ marginTop: '1rem', background: '#111', color: '#0f0', padding: '1rem' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}

// TODO: get rid of hardcoded fitness level. Needs added to DB.

// TODO: pull in all preferences relative to workouts

// TODO: Pass date range to api by adding date range selection of some sort