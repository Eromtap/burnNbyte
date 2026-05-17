'use client';

import { useState } from 'react';

export default function MealDeleteButton({ mealId, mealName = 'this meal', className = 'btn btn-outline meal-delete-btn', onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete() {
    if (!mealId || loading) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/mealPlans/entries/${mealId}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to delete meal.');
      }

      if (typeof onDeleted === 'function') {
        await onDeleted(mealId);
      }
      setConfirmOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to delete meal.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 6 }}>
      <button type="button" className={className} onClick={() => setConfirmOpen(true)} disabled={loading}>
        {loading ? 'Deleting…' : 'Delete'}
      </button>
      {error && <span className="muted" style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</span>}
      <div className="modal modal-soft" aria-hidden={!confirmOpen} role="dialog" aria-modal="true" aria-labelledby={`deleteMealTitle-${mealId}`}>
        <div className="modal-backdrop" onClick={() => setConfirmOpen(false)} />
        <div className="modal-dialog tracker-modal tracker-modal-soft meal-delete-modal">
          <header className="modal-head tracker-modal-head">
            <div>
              <div className="eyebrow">Delete meal</div>
              <h3 id={`deleteMealTitle-${mealId}`}>Remove this entry?</h3>
              <div className="sub">{mealName} will be removed from this day.</div>
            </div>
            <button type="button" className="modal-close-icon" onClick={() => setConfirmOpen(false)} aria-label="Close delete meal">
              <span aria-hidden="true">✕</span>
            </button>
          </header>
          <div className="modal-body tracker-modal-body">
            <div className="tracker-capture-card">
              <div className="sub">This only deletes this logged meal entry. It does not remove the saved food or meal from your library.</div>
            </div>
          </div>
          <footer className="modal-foot tracker-modal-foot">
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmOpen(false)} disabled={loading}>
              Cancel
            </button>
            <button type="button" className="btn btn-outline meal-delete-btn" onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting…' : 'Delete meal'}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
