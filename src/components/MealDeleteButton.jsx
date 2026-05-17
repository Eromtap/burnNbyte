'use client';

import { useState } from 'react';

export default function MealDeleteButton({ mealId, mealName = 'this meal', className = 'btn btn-outline meal-delete-btn', onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    if (!mealId || loading) return;
    const confirmed = window.confirm(`Delete ${mealName}?`);
    if (!confirmed) return;

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
    } catch (err) {
      setError(err.message || 'Failed to delete meal.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 6 }}>
      <button type="button" className={className} onClick={handleDelete} disabled={loading}>
        {loading ? 'Deleting…' : 'Delete'}
      </button>
      {error && <span className="muted" style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</span>}
    </div>
  );
}
