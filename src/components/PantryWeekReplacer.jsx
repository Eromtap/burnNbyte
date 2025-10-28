'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

function toYMDLocal(d){ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
function startOfWeekLocal(d){ const x=new Date(d); x.setHours(0,0,0,0); const dow=x.getDay(); x.setDate(x.getDate()-dow); return x; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }

export default function PantryWeekReplacer(){
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState({}); // { 'yyyy-mm-dd': { breakfast:true, lunch:true } }
  const [rebalance, setRebalance] = useState(false);
  const today = useMemo(()=>{ const t=new Date(); t.setHours(0,0,0,0); return t; },[]);
  const sow = useMemo(()=> startOfWeekLocal(today), [today]);
  const weekDays = useMemo(()=> Array.from({length:7}, (_,i)=> addDays(sow, i)), [sow]);

  useEffect(()=>{
    let ignore=false;
    (async () => {
      try {
        const res = await fetch('/api/mealPlans');
        const data = await res.json();
        if (!ignore) setPlans(Array.isArray(data)?data:[]);
      } finally { if (!ignore) setLoading(false); }
    })();
    return ()=>{ ignore=true };
  },[]);

  const byDate = useMemo(()=>{
    const map = new Map();
    for (const p of plans){
      const key = new Date(p.date).toISOString().slice(0,10);
      map.set(key, p);
    }
    return map;
  }, [plans]);

  function toggle(date, type){
    setSelected(prev => {
      const next = { ...prev };
      const day = { ...(next[date]||{}) };
      day[type] = !day[type];
      if (!day[type]) delete day[type];
      if (Object.keys(day).length === 0) delete next[date]; else next[date] = day;
      return next;
    });
  }

  async function submit(){
    const items = Object.entries(selected).map(([date, typesObj]) => ({ date, types: Object.keys(typesObj) }));
    if (!items.length) return;
    const confirmMsg = rebalance ? 'This will regenerate full days for selected dates. Proceed?' : 'Replace only the selected meals?';
    if (!window.confirm(confirmMsg)) return;
    const res = await fetch('/api/mealPlans/replace', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ items, rebalance }) });
    const data = await res.json();
    if (!res.ok){ alert(data?.error || 'Failed to replace'); return; }
    setSelected({});
    router.refresh();
    // Re-fetch
    setLoading(true);
    const r2 = await fetch('/api/mealPlans');
    const d2 = await r2.json();
    setPlans(Array.isArray(d2) ? d2 : []);
    setLoading(false);
  }

  return (
    <div className="stack">
      <div className="planner-head">Replace Meals This Week</div>
      <div className="list-row" style={{ alignItems:'center', gap:8 }}>
        <label className="muted">
          <input type="checkbox" checked={rebalance} onChange={(e)=> setRebalance(e.target.checked)} />
          <span style={{ marginLeft: 8 }}>Regenerate full days to balance calories</span>
        </label>
        <button className="btn btn-primary" onClick={submit} disabled={loading}>Replace Selected</button>
      </div>
      <div className="stack">
        {weekDays.map(d => {
          const iso = toYMDLocal(d);
          const p = byDate.get(iso);
          return (
            <article key={iso} className="card">
              <header className="card-head">
                <h3>{d.toDateString()}</h3>
                <div className="sub">{p ? (p.title || 'Meal Plan') : 'No plan saved'}</div>
              </header>
              <div className="stack">
                {['breakfast','lunch','dinner','snack'].map(type => {
                  const meals = (p?.meals||[]).filter(m => (m.type||'').toLowerCase() === type);
                  const checked = Boolean(selected[iso]?.[type]);
                  return (
                    <label key={type} className="list-row" style={{ alignItems:'center', gap:8 }}>
                      <input type="checkbox" checked={checked} onChange={()=> toggle(iso, type)} />
                      <span style={{ textTransform:'capitalize' }}>{type}</span>
                      <span className="muted">{meals.length ? meals.map(m=>m.name).join(', ') : 'None'}</span>
                    </label>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

