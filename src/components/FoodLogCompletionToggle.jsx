'use client';

import { useState } from 'react';

export default function FoodLogCompletionToggle({ entryId, initialCompleted, onUpdated }) {
  const [checked, setChecked] = useState(Boolean(initialCompleted));
  async function toggle(next) {
    setChecked(next);
    const res = await fetch(`/api/foodLogs/${entryId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed: next }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setChecked(!next); return; }
    onUpdated?.(data.entry);
  }
  return <label className={`tracker-inline-toggle ${checked ? 'is-checked' : ''}`}><input type="checkbox" checked={checked} onChange={(event) => toggle(event.target.checked)} /><span>Ate it</span></label>;
}
