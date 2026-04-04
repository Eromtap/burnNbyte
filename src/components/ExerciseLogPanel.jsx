'use client';
import { useEffect, useMemo, useState } from 'react';

function formatLog(log) {
  if (!log) return '';
  if (log.type === 'weighted') {
    const sets = log.sets ? `${log.sets}x` : '';
    const reps = log.reps ? `${log.reps}` : '';
    const weight = log.weight != null ? `@ ${log.weight} lb` : '';
    return [sets + reps, weight].filter(Boolean).join(' ');
  }
  if (log.type === 'cardio') {
    const distance = log.distance != null ? `${log.distance} mi` : '';
    const pace = log.pace != null ? `${log.pace} min/mi` : '';
    return [distance, pace].filter(Boolean).join(' • ');
  }
  return 'Logged';
}

function sanitizeNumber(value) {
  if (value === '' || value === null || value === undefined) return '';
  return String(value);
}

export default function ExerciseLogPanel({ workoutId, initialLogs = [], exerciseSuggestions = [] }) {
  const [logs, setLogs] = useState(Array.isArray(initialLogs) ? initialLogs : []);
  const availableExercises = useMemo(
    () => (Array.isArray(exerciseSuggestions) ? exerciseSuggestions.filter(Boolean) : []),
    [exerciseSuggestions]
  );
  const [form, setForm] = useState({
    exerciseName: Array.isArray(exerciseSuggestions) && exerciseSuggestions[0] ? exerciseSuggestions[0] : '',
    type: 'weighted',
    weight: '',
    reps: '',
    sets: '',
    distance: '',
    pace: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const isWeighted = form.type === 'weighted';
  const isCardio = form.type === 'cardio';

  useEffect(() => {
    setLogs(Array.isArray(initialLogs) ? initialLogs : []);
    setForm({
      exerciseName: availableExercises[0] || '',
      type: 'weighted',
      weight: '',
      reps: '',
      sets: '',
      distance: '',
      pace: '',
    });
    setError(null);
  }, [workoutId, initialLogs, availableExercises]);

  const canSubmit = useMemo(() => {
    if (!form.exerciseName.trim()) return false;
    if (isWeighted) return form.weight !== '';
    if (isCardio) return form.distance !== '' || form.pace !== '';
    return true;
  }, [form.exerciseName, form.weight, form.distance, form.pace, isWeighted, isCardio]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/progress/exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutId,
          exerciseName: form.exerciseName.trim(),
          type: form.type,
          weight: form.weight,
          reps: form.reps,
          sets: form.sets,
          distance: form.distance,
          pace: form.pace,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to log exercise');
      setLogs((prev) => [data.log, ...prev]);
      setForm({
        exerciseName: availableExercises[0] || '',
        type: form.type,
        weight: '',
        reps: '',
        sets: '',
        distance: '',
        pace: '',
      });
    } catch (err) {
      setError(err.message || 'Failed to log exercise');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      {exerciseSuggestions.length > 0 && (
        <div>
          <div className="planner-head">Quick pick</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {availableExercises.map((name) => (
              <button
                key={name}
                type="button"
                className={`pill exercise-pill${form.exerciseName === name ? ' exercise-pill-active' : ''}`}
                aria-pressed={form.exerciseName === name}
                onClick={() => updateField('exerciseName', name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
      <form className="form" onSubmit={onSubmit}>
        {availableExercises.length > 0 && (
          <div className="list-row">
            <span>Exercise</span>
            <span className="muted">{form.exerciseName || 'Select an exercise above'}</span>
          </div>
        )}
        {availableExercises.length === 0 && (
          <div className="list-row">
            <span className="muted">No workout exercises available for logging yet.</span>
          </div>
        )}
        <label>
          <span>Type</span>
          <select value={form.type} onChange={(e) => updateField('type', e.target.value)}>
            <option value="weighted">Weighted</option>
            <option value="cardio">Cardio</option>
            <option value="other">Other</option>
          </select>
        </label>

        {isWeighted && (
          <label>
            <span>Weight (lb)</span>
            <input
              type="number"
              inputMode="decimal"
              value={sanitizeNumber(form.weight)}
              onChange={(e) => updateField('weight', e.target.value)}
            />
          </label>
        )}
        {isWeighted && (
          <div style={{ display: 'flex', gap: 8 }}>
            <label style={{ flex: 1 }}>
              <span>Sets</span>
              <input
                type="number"
                value={sanitizeNumber(form.sets)}
                onChange={(e) => updateField('sets', e.target.value)}
              />
            </label>
            <label style={{ flex: 1 }}>
              <span>Reps</span>
              <input
                type="number"
                value={sanitizeNumber(form.reps)}
                onChange={(e) => updateField('reps', e.target.value)}
              />
            </label>
          </div>
        )}

        {isCardio && (
          <label>
            <span>Distance (mi)</span>
            <input
              type="number"
              inputMode="decimal"
              value={sanitizeNumber(form.distance)}
              onChange={(e) => updateField('distance', e.target.value)}
            />
          </label>
        )}
        {isCardio && (
          <label>
            <span>Pace (min/mi)</span>
            <input
              type="number"
              inputMode="decimal"
              value={sanitizeNumber(form.pace)}
              onChange={(e) => updateField('pace', e.target.value)}
            />
          </label>
        )}

        {error && <div className="muted" style={{ color: 'var(--danger, #b42318)' }}>{error}</div>}
        <button className="btn btn-primary" disabled={!canSubmit || saving} type="submit">
          {saving ? 'Saving...' : 'Log Exercise'}
        </button>
      </form>

      <div>
        <div className="planner-head">Logged entries</div>
        {logs.length === 0 && <div className="muted">No logs yet for this workout.</div>}
        {logs.length > 0 && (
          <ul className="list" style={{ marginTop: 8 }}>
            {logs.map((log) => (
              <li key={log.id} className="list-row">
                <span>{log.exerciseName}</span>
                <span className="muted">{formatLog(log)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
