'use client';

import { useEffect, useState, useTransition } from 'react';

export default function MealFeedbackButtons({ mealId, initialFeedback = null, onUpdated, className = '' }) {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setFeedback(initialFeedback || null);
    setError(null);
  }, [mealId, initialFeedback]);

  function submit(nextFeedback) {
    if (!mealId || pending || feedback === nextFeedback) return;
    setFeedback(nextFeedback);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/progress/meal-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mealId, feedback: nextFeedback }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to save meal feedback');
        if (typeof onUpdated === 'function') onUpdated(data?.feedback || null);
      } catch (err) {
        setFeedback(initialFeedback || null);
        setError(err?.message || 'Failed to save meal feedback');
      }
    });
  }

  const likeClass = `btn ${feedback === 'like' ? 'btn-primary' : 'btn-secondary'}`;
  const dislikeClass = `btn ${feedback === 'dislike' ? 'btn-primary' : 'btn-secondary'}`;

  return (
    <div className={className} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <button type="button" className={likeClass} disabled={pending} onClick={() => submit('like')}>
        Like
      </button>
      <button type="button" className={dislikeClass} disabled={pending} onClick={() => submit('dislike')}>
        Dislike
      </button>
      {error && <span className="muted" style={{ color: 'var(--danger, #b42318)', fontSize: 12 }}>{error}</span>}
    </div>
  );
}
