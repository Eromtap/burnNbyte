'use client';

import { useState } from 'react';

export default function StoreReadyList({ items = [], unitSystem = 'imperial', updatedAt }) {
  const [open, setOpen] = useState(true);

  const updatedLabel = updatedAt ? new Date(updatedAt).toLocaleString() : '';

  return (
    <article className="card">
      <header className="card-head" style={{ alignItems: 'center' }}>
        <div>
          <h3>Store-ready List</h3>
          <div className="sub">{unitSystem} • updated {updatedLabel}</div>
        </div>
        <button className="btn btn-ghost" onClick={() => setOpen(o => !o)}>
          {open ? 'Hide' : 'Show'}
        </button>
      </header>
      {open && (
        Array.isArray(items) && items.length > 0 ? (
          <ul className="list" style={{ marginTop: 8 }}>
            {items.map((it, idx) => (
              <li key={idx} className="list-row">
                <span>{it.name}</span>
                <span className="muted">{it.quantity} {it.unit}{it.packageSize ? ` · ${it.packageSize}` : ''}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="muted">No items saved for this week.</div>
        )
      )}
    </article>
  );
}

