'use client';

import { useState } from 'react';

export default function GroceryOptimizer() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [unit, setUnit] = useState('imperial');

  async function optimize() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/groceries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitSystem: unit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Optimization failed');
      setResult(data);
    } catch (e) {
      setResult({ error: e.message || 'Failed to optimize list' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack" style={{ marginTop: 12 }}>
      <div className="list-row" style={{ gap: 8, alignItems: 'center' }}>
        <label className="muted">Units</label>
        <select value={unit} onChange={(e) => setUnit(e.target.value)}>
          <option value="imperial">Imperial (lb, qt)</option>
          <option value="metric">Metric (kg, L)</option>
        </select>
        <button className="btn btn-primary" onClick={optimize} disabled={loading}>
          {loading ? 'Optimizing…' : 'Convert to Store Purchases'}
        </button>
      </div>

      {result?.error && (
        <div className="list-row"><span className="muted">{String(result.error)}</span></div>
      )}

      {Array.isArray(result?.items) && result.items.length > 0 && (
        <div className="stack">
          <div className="planner-head">Store-ready List</div>
          <ul className="list" style={{ marginTop: 8 }}>
            {result.items.map((it, idx) => (
              <li key={idx} className="list-row">
                <span>{it.name}</span>
                <span className="muted">{it.quantity} {it.unit}{it.packageSize ? ` • ${it.packageSize}` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

