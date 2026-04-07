'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function MealCompletionToggle({ mealId, initialCompleted = false, onUpdated, className = '' }) {
  const router = useRouter();
  const [checked, setChecked] = useState(Boolean(initialCompleted));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  useEffect(() => {
    setChecked(Boolean(initialCompleted));
    setError(null);
  }, [mealId, initialCompleted]);

  const toggle = (next) => {
    setChecked(next);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/progress/meal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mealId, completed: next }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to update meal');
        if (typeof onUpdated === 'function') {
          onUpdated(data?.meal || null);
        } else {
          router.refresh();
        }
      } catch (e) {
        setChecked(!next);
        setError(e.message || 'Failed to update meal');
      }
    });
  };

  return (
    <div className={className || 'list-row'} style={{ gap: 8, alignItems: 'center' }}>
      <label className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="checkbox" checked={checked} disabled={pending} onChange={(e) => toggle(e.target.checked)} />
        <span>Ate it</span>
      </label>
      {error && <span className="muted" style={{ color: 'var(--danger, #b91c1c)', fontSize: 12 }}>{error}</span>}
    </div>
  );
}
