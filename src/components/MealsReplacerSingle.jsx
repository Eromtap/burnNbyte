'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

export default function MealsReplacerSingle({ selectedISO, onReplaced }){
  const router = useRouter();
  const [type, setType] = useState('dinner');
  const [rebalance, setRebalance] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function replaceOne(){
    setLoading(true); setError(null);
    try {
      const res = await fetchWithTimeout('/api/mealPlans/replace', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ items: [{ date: selectedISO, types: [type] }], rebalance })
      }, 100000);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to replace');
      if (typeof onReplaced === 'function') {
        await onReplaced();
      } else {
        router.refresh();
      }
    } catch(e){ setError(e.message || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="stack">
      <div className="planner-head">Replace Meal (Selected Day)</div>
      <div className="list-row" style={{ alignItems:'center', gap:8, flexWrap:'wrap' }}>
        <label className="muted">Meal</label>
        <select value={type} onChange={e=> setType(e.target.value)}>
          {['breakfast','lunch','dinner','snack'].map(t => (<option key={t} value={t}>{t}</option>))}
        </select>
        <label className="muted" style={{ display:'flex', alignItems:'center', gap:8 }}>
          <input type="checkbox" checked={rebalance} onChange={e=> setRebalance(e.target.checked)} />
          Rebalance the rest of the day
        </label>
        <button className="btn btn-primary" onClick={replaceOne} disabled={loading}>
          {loading ? 'Replacing…' : 'Replace Meal'}
        </button>
      </div>
      {error && <div className="list-row"><span className="muted">{String(error)}</span></div>}
    </div>
  );
}
