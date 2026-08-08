'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function StoreReadyList({
  summaryId,
  items = [],
  archivedItems = [],
  unitSystem = 'imperial',
  updatedAt,
  clearedAt,
  archivedAt,
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [localItems, setLocalItems] = useState(items);
  const [localArchived, setLocalArchived] = useState(archivedItems);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [clearing, startClearing] = useTransition();
  const [restoring, startRestoring] = useTransition();

  useEffect(() => setLocalItems(items), [items]);
  useEffect(() => setLocalArchived(archivedItems), [archivedItems]);

  const updatedLabel = updatedAt ? new Date(updatedAt).toLocaleString() : '';
  const clearedLabel = clearedAt ? new Date(clearedAt).toLocaleString() : null;
  const archivedLabel = archivedAt ? new Date(archivedAt).toLocaleString() : null;
  const checkedCount = (localItems || []).filter((it) => it.checked).length;

  async function toggleItem(itemId, nextChecked) {
    if (!summaryId || !itemId) return;
    setError(null);
    setSavingId(itemId);
    setLocalItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, checked: nextChecked } : it)));
    try {
      const res = await fetch('/api/groceries/checklist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summaryId, itemId, checked: nextChecked }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to update item');
      if (Array.isArray(data.items)) {
        setLocalItems(data.items);
      }
    } catch (e) {
      setError(e.message || 'Failed to update item');
      setLocalItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, checked: !nextChecked } : it)));
    } finally {
      setSavingId(null);
      router.refresh();
    }
  }

  function handleCompleteList() {
    if (!summaryId) return;
    setError(null);
    startClearing(async () => {
      try {
        const res = await fetch('/api/groceries/checklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ summaryId, action: 'completeList' }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to complete list');
        setLocalItems([]);
        if (Array.isArray(data.archivedItems)) {
          setLocalArchived(data.archivedItems);
        }
      } catch (e) {
        setError(e.message || 'Failed to complete list');
      } finally {
        router.refresh();
      }
    });
  }

  function handleRestore() {
    if (!summaryId) return;
    setError(null);
    startRestoring(async () => {
      try {
        const res = await fetch('/api/groceries/checklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ summaryId, action: 'restore' }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to restore list');
        if (Array.isArray(data.items)) {
          setLocalItems(data.items);
        }
        setLocalArchived([]);
      } catch (e) {
        setError(e.message || 'Failed to restore list');
      } finally {
        router.refresh();
      }
    });
  }

  return (
    <article className="card">
      <header className="card-head" style={{ alignItems: 'center' }}>
        <div>
          <h3>Store-ready List</h3>
          <div className="sub">
            {unitSystem} • updated {updatedLabel}
            {clearedLabel ? ` • cleared ${clearedLabel}` : ''}
            {archivedLabel ? ` • archived ${archivedLabel}` : ''}
          </div>
        </div>
        <div className="list-row" style={{ gap: 8, alignItems: 'center' }}>
          {Array.isArray(localItems) && localItems.length > 0 && (
            <span className="muted">{checkedCount}/{localItems.length} checked</span>
          )}
          <button className="btn btn-ghost" onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide' : 'Show'}
          </button>
        </div>
      </header>

      {error && <div className="muted" style={{ color: 'var(--danger, #b91c1c)' }}>{error}</div>}

      {open && (
        Array.isArray(localItems) && localItems.length > 0 ? (
          <div className="stack" style={{ marginTop: 8 }}>
            <ul className="list">
              {localItems.map((it) => (
                <li key={it.id} className={`list-row store-ready-item${it.checked ? ' store-ready-item-checked' : ''}`}>
                  <label className="store-ready-item-label">
                    <input
                      className="store-ready-checkbox"
                      type="checkbox"
                      checked={Boolean(it.checked)}
                      disabled={!summaryId || savingId === it.id}
                      onChange={(e) => toggleItem(it.id, e.target.checked)}
                    />
                    <div className="store-ready-item-copy">
                      <div className="store-ready-item-name">{it.name}</div>
                      <div className="muted store-ready-item-meta">
                        {it.quantity} {it.unit}{it.packageSize ? ` • ${it.packageSize}` : ''}{it.notes ? ` • ${it.notes}` : ''}
                      </div>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
            <div className="list-row" style={{ justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={handleCompleteList} disabled={clearing || !summaryId}>
                {clearing ? 'Clearing…' : 'Mark List Complete & Clear'}
              </button>
              {!!localArchived.length && (
                <button className="btn btn-outline" onClick={handleRestore} disabled={restoring || !summaryId}>
                  {restoring ? 'Restoring…' : 'Restore Last List'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="stack">
            <div className="muted">No items saved for this week.</div>
            {!!localArchived.length && (
              <div className="list-row" style={{ justifyContent: 'flex-start' }}>
                <button className="btn btn-outline" onClick={handleRestore} disabled={restoring || !summaryId}>
                  {restoring ? 'Restoring…' : 'Restore Last List'}
                </button>
              </div>
            )}
          </div>
        )
      )}
    </article>
  );
}

