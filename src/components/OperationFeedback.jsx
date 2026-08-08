'use client';

import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

export default function OperationFeedback({
  active,
  title,
  steps = [],
  timeoutSeconds = 120,
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return undefined;
    }

    const startedAt = Date.now();
    setElapsed(0);
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  const currentStep = useMemo(() => {
    if (!steps.length) return 'Working…';
    const stepLength = Math.max(7, Math.floor(timeoutSeconds / (steps.length + 2)));
    const index = Math.min(steps.length - 1, Math.floor(elapsed / stepLength));
    return steps[index];
  }, [elapsed, steps, timeoutSeconds]);

  if (!active) return null;

  const progress = Math.min(94, 8 + (elapsed / timeoutSeconds) * 86);

  return (
    <section className="bn-operation-feedback" role="status" aria-live="polite">
      <header>
        <LoaderCircle size={18} aria-hidden />
        <span><strong>{title}</strong><small>{elapsed}s elapsed</small></span>
      </header>
      <div className="bn-operation-track" aria-hidden><span style={{ width: `${progress}%` }} /></div>
      <p>{currentStep}</p>
      {elapsed >= 35 ? (
        <small className="bn-operation-slow-note">
          Still working—AI planning can take a little longer for multi-day plans. You can leave this window open.
        </small>
      ) : null}
    </section>
  );
}
