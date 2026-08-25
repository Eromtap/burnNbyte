'use client';

import { useState } from 'react';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

export default function ReplaceExerciseButton({ workoutId, instructionIndex, currentInstruction, onReplaced }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('custom');
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function close() {
    if (loading) return;
    setOpen(false);
    setInstruction('');
    setError('');
    setMode('custom');
  }

  async function replace() {
    if (mode === 'custom' && !instruction.trim()) {
      setError('Enter the exercise instruction you want to use.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithTimeout('/api/workouts/replace-instruction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId, instructionIndex, mode, instruction }),
      }, 70000);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Unable to replace exercise.');
      onReplaced?.(data.workout);
      close();
    } catch (err) {
      setError(err?.message || 'Unable to replace exercise.');
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete this instruction?\n\n${currentInstruction}`)) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithTimeout('/api/workouts/replace-instruction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId, instructionIndex, mode: 'delete' }),
      }, 30000);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Unable to delete exercise.');
      onReplaced?.(data.workout);
    } catch (err) {
      setError(err?.message || 'Unable to delete exercise.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-secondary btn-compact" onClick={() => setOpen(true)}>
        Edit
      </button>
      <div className="modal modal-soft" aria-hidden={!open} role="dialog" aria-modal="true" aria-labelledby={`replaceExercise-${instructionIndex}`}>
        <div className="modal-backdrop" onClick={close} />
        <div className="modal-dialog tracker-modal tracker-modal-soft">
          <header className="modal-head tracker-modal-head">
            <div>
              <div className="eyebrow">Exercise swap</div>
              <h3 id={`replaceExercise-${instructionIndex}`}>Replace exercise</h3>
              <div className="sub">Current: {currentInstruction}</div>
            </div>
            <button type="button" className="modal-close-icon" onClick={close} aria-label="Close exercise replacement">✕</button>
          </header>
          <div className="modal-body tracker-modal-body">
            <div className="tracker-mode-grid">
              <button type="button" className={`exercise-pill ${mode === 'custom' ? 'exercise-pill-active' : ''}`} onClick={() => setMode('custom')}>Use mine</button>
              <button type="button" className={`exercise-pill ${mode === 'ai' ? 'exercise-pill-active' : ''}`} onClick={() => setMode('ai')}>Ask AI</button>
            </div>
            <div className="tracker-capture-card">
              <label className="planner-head" htmlFor={`replacement-${instructionIndex}`}>
                {mode === 'custom' ? 'Replacement instruction' : 'Optional preference'}
              </label>
              <input
                id={`replacement-${instructionIndex}`}
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                placeholder={mode === 'custom' ? 'e.g. Goblet squat: 3 sets of 10 reps.' : 'e.g. no machines, knee-friendly'}
              />
              <button type="button" className="btn btn-primary" onClick={replace} disabled={loading}>
                {loading ? 'Replacing…' : mode === 'custom' ? 'Use this exercise' : 'Get AI alternative'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={remove} disabled={loading}>
                Delete exercise
              </button>
              {error && <div className="alert alert-error">{error}</div>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
