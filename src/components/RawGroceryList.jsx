'use client';

import { useState } from 'react';

export default function RawGroceryList({ items = [], rangeLabel }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="stack">
      <div className="list-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="muted">Raw ingredients • {rangeLabel}</div>
        <button className="btn btn-outline" onClick={() => setOpen(o => !o)}>
          {open ? 'Hide Raw List' : 'Show Raw List'}
        </button>
      </div>

      {open && (
        items.length ? (
          <ul className="list">
            {items.map(({ item, count }) => (
              <li key={item.toLowerCase()} className="list-row">
                <span>{item}</span>
                <span className="muted">×{count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="muted">No meal plans found for the next week.</div>
        )
      )}
    </div>
  );
}

