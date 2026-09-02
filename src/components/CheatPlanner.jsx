'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import OperationFeedback from '@/components/OperationFeedback';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

export default function CheatPlanner({ currentDateISO }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [adjustWeek, setAdjustWeek] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    if (!description.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetchWithTimeout('/api/cheat-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          adjustWeek,
          currentDateISO,
        }),
      }, 100000);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to build cheat plan');
      setResult(data);
      router.refresh();
    } catch (err) {
      setError(err?.message || 'Failed to build cheat plan');
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    if (loading) return;
    setOpen(false);
    setError(null);
  }

  return (
    <>
      <article className="card span-4 cheat-card">
        <div className="card-head cheat-card-head">
          <div className="cheat-card-copy">
            <div className="section-badge">Flex planning</div>
            <h3>I&apos;m gonna cheat</h3>
            <div className="sub">Everyone gets to treat themselves sometimes. The key is being honest about it, tracking it, and deciding whether you want the rest of the plan to absorb the extra calories.</div>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            Plan the cheat
          </button>
        </div>
      </article>

      <div className="modal" aria-hidden={!open} role="dialog" aria-modal="true" aria-labelledby="cheatModalTitle">
        <div className="modal-backdrop" onClick={closeModal} />
        <div className="modal-dialog cheat-modal">
          <header className="modal-head cheat-modal-head">
            <div className="cheat-modal-copy">
              <h3 id="cheatModalTitle">Plan around the cheat</h3>
              <div className="sub">A treat doesn&apos;t ruin anything. Log what you&apos;re planning, get a realistic calorie estimate, and decide whether you want upcoming planned days to quietly balance it out.</div>
            </div>
            <button type="button" className="btn btn-ghost" onClick={closeModal} aria-label="Close" disabled={loading}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6.225 4.811 12 10.586l5.775-5.775a1 1 0 1 1 1.414 1.414L13.414 12l5.775 5.775a1 1 0 0 1-1.414 1.414L12 13.414l-5.775 5.775a1 1 0 0 1-1.414-1.414L10.586 12 4.81 6.225A1 1 0 0 1 6.225 4.81Z"/></svg>
            </button>
          </header>
          <form className="modal-body cheat-modal-body" onSubmit={onSubmit}>
            <OperationFeedback
              active={loading}
              title="Estimating and balancing your plan"
              steps={['Estimating the meal', 'Reviewing upcoming days', 'Balancing meals and training', 'Saving plan adjustments']}
              timeoutSeconds={100}
            />
            <label className="cheat-input-block">
              <span className="planner-head">What are you about to have?</span>
              <textarea
                rows={5}
                className="cheat-textarea"
                placeholder="Example: 3 slices of pepperoni pizza, 4 wings, 2 beers, and a brownie"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className="cheat-checkbox cheat-toggle-card">
              <input
                type="checkbox"
                checked={adjustWeek}
                onChange={(e) => setAdjustWeek(e.target.checked)}
              />
              <span>Augment diet and exercise across the user&apos;s upcoming planned days to account for it.</span>
            </label>
            {error && <div className="muted" style={{ color: 'var(--danger)' }}>{error}</div>}
            {result && (
              <div className="card cheat-result-card">
                <div className={`cheat-status-pill ${result.adjustment && (result.adjustment.mealPlansUpdated > 0 || result.adjustment.workoutsUpdated > 0) ? 'cheat-status-pill-success' : ''}`}>
                  {result.adjustment && (result.adjustment.mealPlansUpdated > 0 || result.adjustment.workoutsUpdated > 0)
                    ? 'Plan updated: portions and future workout add-ons were adjusted.'
                    : 'Estimate complete: no future plans were changed.'}
                </div>
                <div className="list-row">
                  <span>Estimated calories</span>
                  <strong>{result.estimate?.calories ?? 0} kcal</strong>
                </div>
                <div className="list-row">
                  <span>Estimate summary</span>
                  <span className="muted">{result.estimate?.summary || description}</span>
                </div>
                {result.adjustment && (
                  <>
                    <div className="list-row">
                      <span>Plan adjustment</span>
                      <span className="muted">
                        {result.adjustment.remainingDays} day(s) to balance, about {result.adjustment.dailyMealReduction} kcal less food and {result.adjustment.dailyWorkoutMinutes} extra workout min per day.
                      </span>
                    </div>
                    <div className="list-row">
                      <span>Daily target</span>
                      <span className="muted">Updated for {result.adjustment.targetDaysUpdated || 0} day(s){result.adjustment.adjustedDailyTarget ? `, starting around ${result.adjustment.adjustedDailyTarget} kcal/day.` : '.'}</span>
                    </div>
                    {result.adjustment.scopeLabel && (
                      <div className="list-row">
                        <span>Scope</span>
                        <span className="muted">{result.adjustment.scopeLabel}</span>
                      </div>
                    )}
                    <div className="list-row">
                      <span>Changes applied</span>
                      <span className="muted">
                        Added visible portion guidance on {result.adjustment.mealPlansUpdated} meal day(s) and cardio add-ons on {result.adjustment.workoutsUpdated} workout day(s)
                      </span>
                    </div>
                    {result.adjustment.portionAdjustments?.length > 0 && (
                      <div className="cheat-portion-preview">
                        <strong>What to eat</strong>
                        <span className="muted">Each adjusted meal now shows its exact serving on your Food page.</span>
                        {result.adjustment.portionAdjustments.slice(0, 4).map((item) => (
                          <div key={`${item.date}-${item.mealName}`} className="list-row">
                            <span>{item.mealName}</span>
                            <strong>{item.portionPercent}% ({item.servings} serving)</strong>
                          </div>
                        ))}
                        {result.adjustment.portionAdjustments.length > 4 && (
                          <span className="muted">Plus {result.adjustment.portionAdjustments.length - 4} more adjusted meal{result.adjustment.portionAdjustments.length - 4 === 1 ? '' : 's'}.</span>
                        )}
                      </div>
                    )}
                  </>
                )}
                {!result.adjustment && (
                  <div className="list-row">
                    <span>Plan adjustment</span>
                    <span className="muted">Estimate only. No meal or workout plans were changed.</span>
                  </div>
                )}
              </div>
            )}
            <footer className="modal-foot cheat-modal-foot" style={{ padding: 0 }}>
              <button type="button" className="btn btn-outline" onClick={closeModal} disabled={loading}>Close</button>
              {!result && (
                <button type="submit" className="btn btn-primary" disabled={!description.trim() || loading}>
                  {loading ? 'Planning…' : 'Run the plan'}
                </button>
              )}
              {result && (
                <button type="button" className="btn btn-primary" onClick={closeModal}>
                  Done
                </button>
              )}
            </footer>
          </form>
        </div>
      </div>
    </>
  );
}
