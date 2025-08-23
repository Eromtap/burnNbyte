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
          goal: 'build leg muscle',
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
        </>
      )}
    </div>
  );
}

// TODO: get rid of commented code if nothing breaks
// TODO: get rid of hardcoded fitness level, goals etc.
// TODO: pull in workout preferences from db and send them with prompt
// will require changing the prompts to accomodate