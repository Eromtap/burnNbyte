'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import OperationFeedback from '@/components/OperationFeedback';
import RawGroceryList from '@/components/RawGroceryList';
import StoreReadyList from '@/components/StoreReadyList';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

export default function GroceryListView({
  selectedISO,
  rawItems = [],
  rangeLabel,
  summary = null,
  shouldPrepare = false,
}) {
  const router = useRouter();
  const requestRef = useRef(null);
  const [view, setView] = useState('store');
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');
  const unitSystem = summary?.unitSystem || 'imperial';
  const requestKey = `${selectedISO}:${unitSystem}:${shouldPrepare}`;

  useEffect(() => {
    if (!shouldPrepare || requestRef.current === requestKey) return;

    requestRef.current = requestKey;
    let active = true;
    setPreparing(true);
    setError('');

    fetchWithTimeout('/api/groceries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unitSystem,
        date: selectedISO,
        refresh: Boolean(summary),
      }),
    }, 100000)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to prepare the store list.');
        if (active) router.refresh();
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Failed to prepare the store list.');
      })
      .finally(() => {
        if (active) setPreparing(false);
      });

    return () => { active = false; };
  }, [requestKey, router, selectedISO, shouldPrepare, summary, unitSystem]);

  return (
    <section className="stack">
      <article className="card bn-route-stage">
        <header className="card-head">
          <div>
            <h3>Grocery list</h3>
            <div className="sub">Shop by store purchase or inspect the original recipe ingredients.</div>
          </div>
          <div className="grocery-list-toggle" role="group" aria-label="Grocery list view">
            <button
              type="button"
              className={view === 'store' ? 'active' : ''}
              onClick={() => setView('store')}
              aria-pressed={view === 'store'}
            >
              Store purchases
            </button>
            <button
              type="button"
              className={view === 'raw' ? 'active' : ''}
              onClick={() => setView('raw')}
              aria-pressed={view === 'raw'}
            >
              Raw ingredients
            </button>
          </div>
        </header>
      </article>

      {view === 'store' && preparing && (
        <OperationFeedback
          active
          title="Preparing your store purchases"
          steps={['Reading the meal plan', 'Combining ingredients', 'Converting package sizes', 'Saving the shopping list']}
          timeoutSeconds={100}
        />
      )}

      {view === 'store' && !preparing && summary && (
        <StoreReadyList
          summaryId={summary.id}
          items={summary.items}
          archivedItems={summary.archivedItems}
          unitSystem={summary.unitSystem}
          updatedAt={summary.updatedAt}
          clearedAt={summary.clearedAt}
          archivedAt={summary.archivedAt}
        />
      )}

      {view === 'store' && !preparing && !summary && !rawItems.length && (
        <article className="card bn-route-stage"><div className="muted">No meal ingredients are planned for this week yet.</div></article>
      )}

      {view === 'store' && error && (
        <article className="card bn-route-stage"><div className="muted" style={{ color: 'var(--danger)' }}>{error}</div></article>
      )}

      {view === 'raw' && <RawGroceryList items={rawItems} rangeLabel={rangeLabel} />}
    </section>
  );
}
