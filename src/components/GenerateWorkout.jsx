'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import OperationFeedback from '@/components/OperationFeedback';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

export default function GenerateWorkout({ initialPreferences = null, selectedISO: selectedISOProp, onGenerated, compact = false }) {
  const { data: session, update } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState(null);
  const sessionPrefs = session?.user?.preferences || null;
  const userPrefs = sessionPrefs || initialPreferences || {};
  const todayLocal = new Date();
  todayLocal.setHours(0,0,0,0);
  const requestedISO = selectedISOProp || searchParams.get('date') || toYMDLocal(todayLocal);
  // Workout history remains viewable, but creating a workout for a past day is not useful.
  const selectedISO = requestedISO < toYMDLocal(todayLocal) ? toYMDLocal(todayLocal) : requestedISO;
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
    setLoadingMode(selectedOnly ? 'day' : 'week');
    setResult(null);
    try {
      let prefs = session?.user?.preferences || initialPreferences || {};
      if (!Object.keys(prefs).length) {
        try {
          const fresh = await update();
          prefs = fresh?.user?.preferences || prefs;
        } catch {}
      }

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

      const res = await fetchWithTimeout('/api/generateWorkout', {
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
          clientTodayISO: toYMDLocal(todayLocal),
          dates: targetDates,
        }),
      }, 195000);
      const data = await res.json().catch(() => ({}));
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
      setResult({
        error: err?.name === 'TimeoutError'
          ? 'Workout generation took longer than expected and was stopped. Please try again; a weekly plan may work better one day at a time.'
          : (err?.message || 'Failed to generate workout.'),
      });
    } finally {
      setLoading(false);
      setLoadingMode(null);
    }
  }

  if (compact) {
    return (
      <div className="stack" style={{ gap: 8 }}>
        <OperationFeedback
          active={loading}
          title={`Building ${selectedLabel}'s workout`}
          steps={['Checking your preferences', 'Choosing the training focus', 'Balancing exercises and progression', 'Saving the finished plan']}
          timeoutSeconds={195}
        />
        <button type="button" className="btn btn-primary" onClick={() => handleClick({ selectedOnly: true })} disabled={loading}>
          {loadingMode === 'day' ? 'Building session…' : 'Build session'}
        </button>
        {result?.error && <div className="muted" style={{ color: 'var(--danger)' }}>{result.error}</div>}
      </div>
    );
  }

  return (
    <div className="stack">
      <OperationFeedback
        active={loading}
        title={loadingMode === 'week' ? 'Building your workout week' : `Building ${selectedLabel}'s workout`}
        steps={['Checking your preferences', 'Choosing the training focus', 'Balancing exercises and progression', 'Saving the finished plan']}
        timeoutSeconds={195}
      />
      <button type="button" className="btn btn-primary btn-full" onClick={() => handleClick({ selectedOnly: true })} disabled={loading}>
        {loadingMode === 'day' ? 'Building this workout…' : `Create or Replace Workout for ${selectedLabel}`}
      </button>
      <button type="button" className="btn btn-secondary btn-full" onClick={() => handleClick({ selectedOnly: false })} disabled={loading}>
        {loadingMode === 'week' ? 'Building the weekly plan…' : 'Create Workout Plan'}
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
