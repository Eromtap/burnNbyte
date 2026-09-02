'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RawGroceryList from '@/components/RawGroceryList';
import StoreReadyList from '@/components/StoreReadyList';

export default function GroceryListView({
  selectedISO,
  rawItems = [],
  rangeLabel,
  summary = null,
  shouldPrepare = false,
}) {
  const router = useRouter();
  const [view, setView] = useState('store');

  useEffect(() => {
    if (!shouldPrepare) return undefined;
    // The meal action owns the AI job. This only checks the saved result; it never
    // starts another conversion when the user opens or revisits this page.
    const refreshTimer = window.setInterval(() => router.refresh(), 8000);
    return () => window.clearInterval(refreshTimer);
  }, [router, shouldPrepare]);

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

      {view === 'store' && summary && (
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

      {view === 'store' && shouldPrepare && (
        <article className="card bn-route-stage"><div className="muted">Your store purchases are updating in the background. You can use the raw ingredient list while they finish.</div></article>
      )}

      {view === 'store' && !summary && !rawItems.length && (
        <article className="card bn-route-stage"><div className="muted">No meal ingredients are planned for this week yet.</div></article>
      )}

      {view === 'raw' && <RawGroceryList items={rawItems} rangeLabel={rangeLabel} />}
    </section>
  );
}
