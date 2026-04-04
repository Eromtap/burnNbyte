'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function WorkoutCompletionToggle({ workoutId, initialCompleted = false, onUpdated }) {
  const router = useRouter();
  const [checked, setChecked] = useState(Boolean(initialCompleted));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  useEffect(() => {
    setChecked(Boolean(initialCompleted));
    setError(null);
  }, [workoutId, initialCompleted]);

  const toggle = (next) => {
    setChecked(next);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/progress/workout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workoutId, completed: next }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to update workout');
        if (typeof onUpdated === 'function') {
          onUpdated(data?.workout || null);
        } else {
          router.refresh();
        }
      } catch (e) {
        setChecked(!next);
        setError(e.message || 'Failed to update workout');
      }
    });
  };

  return (
    <div className="list-row" style={{ gap: 8, alignItems: 'center' }}>
      <label className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="checkbox" checked={checked} disabled={pending} onChange={(e) => toggle(e.target.checked)} />
        <span>Completed</span>
      </label>
      {error && <span className="muted" style={{ color: 'var(--danger, #b91c1c)', fontSize: 12 }}>{error}</span>}
    </div>
  );
}
