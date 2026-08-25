'use client';

import { useState } from 'react';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

export default function ReplaceWorkoutButton({ workoutId, workoutName, onReplaced }) {
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function close() {
    if (loading) return;
    setOpen(false);
    setRequest('');
    setError('');
  }

  async function replaceWorkout() {
    if (!request.trim()) {
      setError('Tell us what you need instead.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithTimeout('/api/workouts/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId, request }),
      }, 110000);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Unable to change workout.');
      onReplaced?.(data.workout);
      close();
    } catch (err) {
      setError(err?.message || 'Unable to change workout.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>Change workout</button>
      <div className="modal modal-soft" aria-hidden={!open} role="dialog" aria-modal="true" aria-labelledby="replaceWorkoutTitle">
        <div className="modal-backdrop" onClick={close} />
        <div className="modal-dialog tracker-modal tracker-modal-soft">
          <header className="modal-head tracker-modal-head">
            <div>
              <div className="eyebrow">Workout change</div>
              <h3 id="replaceWorkoutTitle">Change today&apos;s workout</h3>
              <div className="sub">Current: {workoutName}</div>
            </div>
            <button type="button" className="modal-close-icon" onClick={close} aria-label="Close workout change">✕</button>
          </header>
          <div className="modal-body tracker-modal-body">
            <div className="tracker-capture-card">
              <label className="planner-head" htmlFor="workoutChangeRequest">What would work better today?</label>
              <input
                id="workoutChangeRequest"
                value={request}
                onChange={(event) => setRequest(event.target.value)}
                placeholder="e.g. Arms only, or knee-friendly upper body"
              />
              <button type="button" className="btn btn-primary" onClick={replaceWorkout} disabled={loading}>
                {loading ? 'Building workout…' : 'Create replacement workout'}
              </button>
              {error && <div className="alert alert-error">{error}</div>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
