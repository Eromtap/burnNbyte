'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { deriveNutritionTargets } from '@/lib/nutritionTargets';

export default function GenerateMealPlan({ initialPreferences = null, selectedISO = null, onGenerated }) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  function toYMDLocal(d){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function parseYMDLocal(ymd){
    const [y, m, d] = String(ymd || '').split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }
  function addDaysLocal(date, days){
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  const todayISO = toYMDLocal(new Date());
  const activeISO = selectedISO || todayISO;
  const selectedLabel = new Date(`${activeISO}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  async function handleClick({ selectedOnly }) {
    setLoading(true);
    setResult(null);
    try {
      // Refresh session to ensure latest preferences (e.g., updated allergies)
      let fresh = null;
      try { fresh = await update(); } catch {}
      const prefs = fresh?.user?.preferences || session?.user?.preferences || initialPreferences || {};
      const targets = deriveNutritionTargets(prefs);
      const goalList = Array.isArray(prefs.fitnessGoals)
        ? prefs.fitnessGoals
        : (prefs.fitnessGoal ? [prefs.fitnessGoal] : []);
      const selectedDate = parseYMDLocal(activeISO);
      const startDate = activeISO;
      const endDate = selectedOnly ? activeISO : toYMDLocal(addDaysLocal(selectedDate, 6));
      const res = await fetch('/api/generateMealPlan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender: prefs.gender,
          heightFt: prefs.heightFt,
          heightIn: prefs.heightIn,
          weight: prefs.weight,
          activityLevel: prefs.activityLevel,
          fitnessGoal: prefs.fitnessGoal || goalList[0],
          fitnessGoals: goalList,
          mealsPerDay: prefs.mealsPerDay || 3,
          macroTargetMode: prefs.macroTargetMode || targets.mode || 'grams',
          calorieTarget: targets.calories,
          proteinTarget: targets.protein,
          carbsTarget: targets.carbs,
          fatTarget: targets.fat,
          proteinPctTarget: targets.proteinPct,
          carbsPctTarget: targets.carbsPct,
          fatPctTarget: targets.fatPct,
          dietaryPreferences: prefs.dietaryPreferences || [],
          dislikedFoods: prefs.dislikedFoods || [],
          mealPrepMode: Boolean(prefs.mealPrepMode),
          allergies: prefs.allergies || [],
          startDate,
          endDate
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (typeof onGenerated === 'function') {
          try { await onGenerated({ ...data, selectedOnly, startDate, endDate }); } catch {}
        } else {
          try { router.refresh(); } catch {}
        }
        setResult({
          ok: true,
          count: Number(data?.count || 0) || (selectedOnly ? 1 : 7),
          selectedOnly: !!selectedOnly,
          startDate,
          endDate,
          selectedLabel,
        });
      } else {
        setResult({ error: data?.error || 'Failed to generate meal plan.' });
      }
    } catch (e) {
      setResult({ error: e?.message || 'Failed to generate meal plan.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <button className="btn btn-primary btn-full" onClick={() => handleClick({ selectedOnly: true })} disabled={loading}>
        {loading ? 'Generating…' : `Create or Replace Meal Plan for ${selectedLabel}`}
      </button>
      <button className="btn btn-secondary btn-full" onClick={() => handleClick({ selectedOnly: false })} disabled={loading}>
        {loading ? 'Generating…' : `Create Meal Plans for ${selectedLabel} + Next 6 Days`}
      </button>
      {result?.ok && (
        <div className="alert alert-success">
          {result.selectedOnly
            ? `Created or replaced meals for ${result.selectedLabel}.`
            : `Created or replaced meal plans for ${result.count} days, from ${result.startDate} through ${result.endDate}.`}
        </div>
      )}
      {result?.error && (
        <div className="alert alert-error">
          {String(result.error)}
        </div>
      )}
    </div>
  );
}
