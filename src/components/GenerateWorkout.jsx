'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function GenerateWorkout() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const userPrefs = session?.user?.preferences || {};
  const todayLocal = new Date();
  todayLocal.setHours(0,0,0,0);
  const selectedISO = searchParams.get('date') || toYMDLocal(todayLocal);
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
      // Determine selected date from URL (defaults to today)
      const selectedDate = parseLocalYMD(selectedISO);
      const selectedDow = dowCode(selectedDate);
      const goalList = Array.isArray(userPrefs.fitnessGoals)
        ? userPrefs.fitnessGoals
        : (userPrefs.fitnessGoal ? [userPrefs.fitnessGoal] : []);
      const equipmentAccess = Array.isArray(userPrefs.equipmentAccess) ? userPrefs.equipmentAccess : [];

      const preferredDays = Array.isArray(userPrefs.workoutDays) ? userPrefs.workoutDays : [];
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
          gender: userPrefs.gender,
          heightFt: userPrefs.heightFt,
          heightIn: userPrefs.heightIn,
          weight: userPrefs.weight,
          fitnessGoal: userPrefs.fitnessGoal || goalList[0],
          fitnessGoals: goalList,
          fitnessLevel: userPrefs.fitnessLevel || 'beginner',
          workoutPreference: userPrefs.workoutPreference,
          workoutDuration: userPrefs.workoutDuration,
          workoutDays: selectedOnly ? [selectedDow] : (preferredDays.length ? preferredDays : [selectedDow]),
          equipmentAccess,
          dateRange: selectedOnly
            ? `${selectedISO} - ${selectedISO}`
            : `${toYMDLocal(todayLocal)} - ${toYMDLocal(new Date(todayLocal.getTime() + 6*24*60*60*1000))}`,
          dates: targetDates,
        }),
      });
      const data = await res.json();
      // Refresh page data so the server-rendered Workout card shows the selected day
      try { router.refresh(); } catch {}
      const list = Array.isArray(data) ? data : (data?.workouts || []);
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
      setResult({ error: 'Failed to generate workout.' });
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
