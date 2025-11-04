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

  function parseLocalYMD(ymd){
    const [y,m,d] = String(ymd||'').split('-').map(Number);
    return new Date(y, (m||1)-1, d||1);
  }

  function dowCode(date){
    const CODES = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    return CODES[date.getDay()];
  }

  async function handleClick() {
    setLoading(true);
    setResult(null);
    try {
      // Determine selected date from URL (defaults to today)
      const selectedDate = parseLocalYMD(selectedISO);
      const selectedDow = dowCode(selectedDate);

      const preferredDays = Array.isArray(userPrefs.workoutDays) ? userPrefs.workoutDays : [];
      const nextSevenDates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(todayLocal);
        d.setDate(todayLocal.getDate() + i);
        const dow = dowCode(d);
        if (!preferredDays.length || preferredDays.includes(dow)) {
          nextSevenDates.push(toYMDLocal(d));
        }
      }
      if (!nextSevenDates.length) {
        // Fallback to selected day so the API still receives at least one date
        nextSevenDates.push(selectedISO);
      }

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
          workoutDays: preferredDays.length ? preferredDays : [selectedDow],
          dateRange: `${toYMDLocal(todayLocal)} - ${toYMDLocal(new Date(todayLocal.getTime() + 6*24*60*60*1000))}`,
          dates: nextSevenDates,
        }),
      });
      const data = await res.json();
      // Refresh page data so the server-rendered Workout card shows the selected day
      try { router.refresh(); } catch {}
      const list = Array.isArray(data) ? data : (data?.workouts || []);
      const filtered = list.filter((w) => {
        try {
          return toYMDLocal(new Date(w.date)) === selectedISO;
        } catch {
          return false;
        }
      });
      setResult(filtered);
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

      {result?.error && (
        <div className="alert alert-error">
          {result.error}
        </div>
      )}

      {Array.isArray(result) && result.length > 0 && (
        <div className="stack">
          {result.map((w) => (
            <article className="card" key={w.id || `${w.name}-${w.date}`}>
              <header className="card-head">
                <h3>{w.name || 'Workout'}</h3>
                <div className="sub">{selectedLabel}</div>
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
