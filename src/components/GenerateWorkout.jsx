'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function GenerateWorkout({ initialPreferences = null, selectedISO: selectedISOProp, onGenerated }) {
  const { data: session, update } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const sessionPrefs = session?.user?.preferences || null;
  const userPrefs = sessionPrefs || initialPreferences || {};
  const todayLocal = new Date();
  todayLocal.setHours(0,0,0,0);
  const selectedISO = selectedISOProp || searchParams.get('date') || toYMDLocal(todayLocal);
  const selectedLabel = new Date(`${selectedISO}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  function toYMDLocal(d){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function toYMDUtc(d){
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth()+1).padStart(2,'0');
    const day = String(d.getUTCDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }

  function parseLocalYMD(ymd){
    const [y,m,d] = String(ymd||'').split('-').map(Number);
    return new Date(y, (m||1)-1, d||1);
  }

  function dowCode(date){
    const CODES = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    return CODES[date.getDay()];
  }

  async function handleClick({ selectedOnly } = {}) {
    setLoading(true);
    setResult(null);
    try {
      let fresh = null;
      try { fresh = await update(); } catch {}
      const prefs = fresh?.user?.preferences || session?.user?.preferences || initialPreferences || {};

      // Determine selected date from URL (defaults to today)
      const selectedDate = parseLocalYMD(selectedISO);
      const selectedDow = dowCode(selectedDate);
      const goalList = Array.isArray(prefs.fitnessGoals)
        ? prefs.fitnessGoals
        : (prefs.fitnessGoal ? [prefs.fitnessGoal] : []);
      const equipmentAccess = Array.isArray(prefs.equipmentAccess) ? prefs.equipmentAccess : [];

      const preferredDays = Array.isArray(prefs.workoutDays) ? prefs.workoutDays : [];
      let targetDates = [];
      if (selectedOnly) {
        targetDates = [selectedISO];
      } else {
        for (let i = 0; i < 7; i++) {
          const d = new Date(todayLocal);
          d.setDate(todayLocal.getDate() + i);
          const dow = dowCode(d);
          if (!preferredDays.length || preferredDays.includes(dow)) {
            targetDates.push(toYMDLocal(d));
          }
        }
      }
      if (!targetDates.length) {
        // Fallback to selected day so the API still receives at least one date
        targetDates.push(selectedISO);
      }

      const res = await fetch('/api/generateWorkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender: prefs.gender,
          heightFt: prefs.heightFt,
          heightIn: prefs.heightIn,
          weight: prefs.weight,
          fitnessGoal: prefs.fitnessGoal || goalList[0],
          fitnessGoals: goalList,
          fitnessLevel: prefs.fitnessLevel || 'beginner',
          workoutPreference: prefs.workoutPreference,
          workoutDuration: prefs.workoutDuration,
          workoutDays: selectedOnly ? [selectedDow] : (preferredDays.length ? preferredDays : [selectedDow]),
          equipmentAccess,
          dateRange: selectedOnly
            ? `${selectedISO} - ${selectedISO}`
            : `${toYMDLocal(todayLocal)} - ${toYMDLocal(new Date(todayLocal.getTime() + 6*24*60*60*1000))}`,
          dates: targetDates,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data?.error || 'Failed to generate workout.' });
        return;
      }
      const list = Array.isArray(data) ? data : (data?.workouts || []);
      if (typeof onGenerated === 'function') {
        try {
          await onGenerated({ workouts: list, selectedOnly: !!selectedOnly, selectedISO });
        } catch {}
      } else {
        try { router.refresh(); } catch {}
      }
      const filtered = list.filter((w) => {
        try {
          return toYMDUtc(new Date(w.date)) === selectedISO;
        } catch {
          return false;
        }
      });
      const deduped = [];
      const seen = new Set();
      for (const w of filtered) {
        const key = `${toYMDUtc(new Date(w.date))}:${w.name || ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(w);
      }
      // We rely on the server-rendered card for display to avoid double-rendering;
      // only show a simple success message here.
      setResult({
        ok: true,
        count: deduped.length,
        selectedOnly: !!selectedOnly,
        dates: targetDates,
        selectedLabel,
      });
    } catch (err) {
      setResult({ error: err?.message || 'Failed to generate workout.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <button className="btn btn-primary btn-full" onClick={() => handleClick({ selectedOnly: true })} disabled={loading}>
        {loading ? 'Generating…' : `Create or Replace Workout for ${selectedLabel}`}
      </button>
      <button className="btn btn-secondary btn-full" onClick={() => handleClick({ selectedOnly: false })} disabled={loading}>
        {loading ? 'Generating…' : 'Create Workout Plan'}
      </button>

      {result?.error && (
        <div className="alert alert-error">
          {result.error}
        </div>
      )}

      {result?.ok && (
        <div className="alert alert-success">
          {result.selectedOnly
            ? `Created or replaced ${result.count || 1} workout${(result.count||1) > 1 ? 's' : ''} for ${result.selectedLabel}.`
            : `Created workouts for your preferred days this week (${(result.dates || []).length} day${(result.dates || []).length === 1 ? '' : 's'}).`}
        </div>
      )}
    </div>
  );
}



// TODO: change created workout wording. it will say one is created even when the current day isn't in preferences
