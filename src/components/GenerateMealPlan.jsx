'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function GenerateMealPlan({ initialPreferences = null, selectedISO = null, onGenerated }) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const prefs = session?.user?.preferences || initialPreferences || {};

  function toYMDLocal(d){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  const todayISO = (() => {
    const d = new Date();
    return toYMDLocal(d); // local-date based (not UTC)
  })();
  const sevenDaysOutISO = (() => {
    const d = new Date();
    d.setDate(d.getDate()+6); // inclusive range -> 7 days total
    return toYMDLocal(d); // local-date based (not UTC)
  })();

  async function handleClick() {
    setLoading(true);
    setResult(null);
    try {
      // Refresh session to ensure latest preferences (e.g., updated allergies)
      let fresh = null;
      try { fresh = await update(); } catch {}
      const prefs = fresh?.user?.preferences || session?.user?.preferences || initialPreferences || {};
      const goalList = Array.isArray(prefs.fitnessGoals)
        ? prefs.fitnessGoals
        : (prefs.fitnessGoal ? [prefs.fitnessGoal] : []);
      const startDate = selectedISO || todayISO;
      const endDate = selectedISO || sevenDaysOutISO;
      const res = await fetch('/api/generateMealPlan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender: prefs.gender,
          heightFt: prefs.heightFt,
          heightIn: prefs.heightIn,
          weight: prefs.weight,
          fitnessGoal: prefs.fitnessGoal || goalList[0],
          fitnessGoals: goalList,
          mealsPerDay: prefs.mealsPerDay || 3,
          dietaryPreferences: prefs.dietaryPreferences || [],
          dislikedFoods: prefs.dislikedFoods || [],
          mealPrepMode: Boolean(prefs.mealPrepMode),
          allergies: prefs.allergies || [],
          startDate,
          endDate
        }),
      });
      const data = await res.json();
      setResult(data);
      if (res.ok) {
        if (typeof onGenerated === 'function') {
          try { await onGenerated(data); } catch {}
        } else {
          try { router.refresh(); } catch {}
        }
      }
    } catch (e) {
      setResult({ error: 'Failed to generate meal plan.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <button className="btn btn-primary btn-full" onClick={handleClick} disabled={loading}>
        {loading ? 'Generating…' : (selectedISO ? `Create or Replace Meal Plan for ${selectedISO}` : 'Create Meal Plans (Daily)')}
      </button>
      {result?.ok && (
        <div className="list-row"><span>Created meal plans</span><span className="muted">{result.count} day(s)</span></div>
      )}
      {result?.error && (
        <div className="list-row"><span>Error</span><span className="muted">{String(result.error)}</span></div>
      )}
    </div>
  );
}
