'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function GenerateMealPlan() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const prefs = session?.user?.preferences || {};

  const todayISO = new Date().toISOString().slice(0,10);
  const sevenDaysOutISO = (() => {
    const d = new Date();
    d.setDate(d.getDate()+6); // inclusive range -> 7 days total
    return d.toISOString().slice(0,10);
  })();

  async function handleClick() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/generateMealPlan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender: prefs.gender,
          heightFt: prefs.heightFt,
          heightIn: prefs.heightIn,
          weight: prefs.weight,
          fitnessGoal: prefs.fitnessGoal,
          mealsPerDay: prefs.mealsPerDay || 3,
          dietaryPreferences: prefs.dietaryPreferences || [],
          allergies: prefs.allergies || [],
          // EITHER pass a date range:
          startDate: todayISO,
          endDate: sevenDaysOutISO
          // OR just pass numDays: 7
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ error: 'Failed to generate meal plan.', err: String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleClick} disabled={loading}>
        {loading ? 'Generating…' : 'Create Meal Plans (Daily)'}
      </button>
      {result && (
        <pre style={{ marginTop: '1rem', background: '#111', color: '#0f0', padding: '1rem' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
