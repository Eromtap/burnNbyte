'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function GenerateWorkout() {
  const { data: session, status } = useSession();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  // const [saving, setSaving] = useState(false);

  async function handleClick() {
    setLoading(true);
    setResult(null);

    console.log("userId:", session?.user?.id); // safe log
    try {
      const res = await fetch('/api/generateWorkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: 'build upper body strength',
          fitnessLevel: 'advanced',
          duration: '60'
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

  // async function storeWorkoutFromResult() {
  //   if (!result) return alert('No workout to save yet.');

  //   setSaving(true);
  //   try {
  //     const toArray = (v) => Array.isArray(v)
  //       ? v
  //       : typeof v === 'string'
  //         ? v.split(/,\s*/).filter(Boolean)
  //         : [];

  //     const toNumber = (v) => {
  //       if (typeof v === 'number') return v;
  //       const m = String(v).match(/\d+/);
  //       return m ? Number(m[0]) : 0;
  //     };

  //     const payload = {
  //       // ❌ userId: session.user.id,  <-- remove this
  //       name: result.name || 'Untitled Workout',
  //       description: result.description || '',
  //       // muscleGroup: result.muscleGroup || null,
  //       // equipment: toArray(result.equipment),
  //       difficulty: (result.difficulty || 'beginner').toLowerCase(),
  //       duration: toNumber(result.duration),
  //       // instructions: toArray(result.instructions),
  //       isCompleted: false,
  //       date: new Date().toISOString(),
  //     };

  //     const res = await fetch('/api/workouts', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(payload),
  //     });

  //     // Handle 401 from server nicely
  //     if (res.status === 401) {
  //       alert('Please sign in to save workouts.');
  //       return;
  //     }

  //     if (!res.ok) throw new Error(`HTTP ${res.status}`);
  //     const created = await res.json();
  //     alert('Workout saved!');
  //     console.log('Workout created:', created);
  //   } catch (err) {
  //     console.error(err);
  //     alert('Failed to save workout.');
  //   } finally {
  //     setSaving(false);
  //   }
  // }

  return (
    <div>
      <button onClick={handleClick} disabled={loading}>
        {loading ? 'Loading...' : 'Create Workout'}
      </button>

      {result && (
        <>
          <pre style={{ marginTop: '1rem', background: '#111', color: '#0f0', padding: '1rem' }}>
            {JSON.stringify(result, null, 2)}
          </pre>

          {/* <button
            onClick={storeWorkoutFromResult}
            disabled={saving || status !== 'authenticated'} // optional UX
          >
            {saving ? 'Saving…' : 'Save to DB'}
          </button> */}
        </>
      )}
    </div>
  );
}

// TODO: get rid of commented code if nothing breaks