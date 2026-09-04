'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import OperationFeedback from '@/components/OperationFeedback';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

export default function PantryCapture({ initialDays = 7, initialDateISO = null }) {
  const router = useRouter();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [unit, setUnit] = useState('imperial');
  const [days, setDays] = useState(initialDays);
  const [sourcingMode, setSourcingMode] = useState('pantry_plus_groceries');
  const cameraRef = useRef(null);
  const libraryRef = useRef(null);

  const canAddMore = files.length < 3;

  function dedupeAppend(list, extras) {
    const out = [...list];
    for (const f of extras) {
      const exists = out.some(x => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified);
      if (!exists) out.push(f);
      if (out.length >= 3) break;
    }
    return out.slice(0,3);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!files || files.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      for (const f of files.slice(0,3)) fd.append('photos', f);
      fd.append('unitSystem', unit);
      fd.append('days', String(days));
      fd.append('sourcingMode', sourcingMode);
      const res = await fetchWithTimeout('/api/pantry/plan', { method: 'POST', body: fd }, 100000);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.code === 'moderation_blocked') {
          throw new Error('Image blocked by content safety checks. Please upload a food photo.');
        }
        throw new Error(data?.error || 'Failed to analyze photo');
      }
      setResult(data);
    } catch (err) {
      setResult({ error: err.message || 'Failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <form className="stack" onSubmit={onSubmit}>
        <OperationFeedback
          active={loading}
          title="Reading your pantry and building options"
          steps={['Uploading photos', 'Identifying ingredients', 'Building realistic meals', 'Checking nutrition details']}
          timeoutSeconds={100}
        />
        <div className="list-row" style={{ alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="muted">Pantry or fridge photos (up to 3)</span>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e)=> {
              const arr = Array.from(e.target.files || []);
              setFiles(prev => dedupeAppend(prev, arr));
              if (e.target) e.target.value = '';
            }}
          />
          <input
            ref={libraryRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e)=> {
              const arr = Array.from(e.target.files || []);
              setFiles(prev => dedupeAppend(prev, arr));
              if (e.target) e.target.value = '';
            }}
          />
          <button type="button" className="btn btn-secondary" onClick={()=> cameraRef.current?.click()} disabled={!canAddMore}>Take Photo</button>
          <button type="button" className="btn btn-secondary" onClick={()=> libraryRef.current?.click()} disabled={!canAddMore}>Choose from Library</button>
          {files.length > 0 && (
            <span className="muted">Selected: {files.length}/3</span>
          )}
        </div>
        {files.length > 0 && (
          <div className="list-row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {files.map((f, idx) => (
              <div key={idx} className="pill" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                <button type="button" className="btn btn-ghost" aria-label="Remove" onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}>×</button>
              </div>
            ))}
          </div>
        )}
        <div className="list-row" style={{ gap: 8, alignItems: 'center' }}>
          <label className="muted">Units</label>
          <select value={unit} onChange={(e)=> setUnit(e.target.value)}>
            <option value="imperial">Imperial</option>
            <option value="metric">Metric</option>
          </select>
          <label className="muted">Source</label>
          <select value={sourcingMode} onChange={(e)=> setSourcingMode(e.target.value)}>
            <option value="pantry_plus_groceries">What I have + groceries</option>
            <option value="pantry_only">Just what I have</option>
          </select>
          <label className="muted">Meals</label>
          <input type="number" min={1} max={7} value={days} onChange={(e)=> setDays(Number(e.target.value||3))} style={{ width: 80 }} />
          <button className="btn btn-primary" type="submit" disabled={files.length === 0 || loading}>{loading ? 'Analyzing…' : 'Analyze & Suggest Meals'}</button>
        </div>
        <div className="muted text-xs">
          {sourcingMode === 'pantry_only'
            ? 'Just what I have keeps the suggestions limited to ingredients the model can see in your pantry or fridge photos.'
            : 'What I have + groceries starts from what the model sees, but it can round out meals with a realistic shopping list.'}
        </div>
      </form>

      {result?.error && (
        <div className="list-row"><span className="muted">{String(result.error)}</span></div>
      )}

      {Array.isArray(result?.ingredients) && result.ingredients.length > 0 && (
        <div className="stack">
          <div className="planner-head">Detected Ingredients</div>
          <ul className="list" style={{ marginTop: 8 }}>
            {result.ingredients.map((ing, idx) => (
              <li key={idx} className="list-row">
                <span>{ing.name}</span>
                <span className="muted">{ing.estimatedQuantity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(result?.meals) && result.meals.length > 0 && (
        <div className="stack">
          <div className="planner-head">Suggested Meals</div>
          <div className="stack">
            {result.meals.map((m, idx) => (
              <article key={idx} className="card">
                <header className="card-head">
                  <h3>{m.name}</h3>
                  <div className="sub">{m.type}{typeof m.calories !== 'undefined' ? ` • ${m.calories} kcal` : ''}{typeof m.costPerServing !== 'undefined' ? ` • ~$${Number(m.costPerServing).toFixed(2)}/serving` : ''}</div>
                </header>
                <div className="stack">
                  {Array.isArray(m.ingredients) && m.ingredients.length > 0 && (
                    <div>
                      <div className="planner-head">Ingredients</div>
                      <ul className="list" style={{ marginTop: 8 }}>
                        {m.ingredients.map((line, i) => (<li key={i} className="list-row"><span>{line}</span></li>))}
                      </ul>
                    </div>
                  )}
                  {m.recipe && (
                    <div>
                      <div className="planner-head">Recipe</div>
                      <div className="list-row"><span style={{ whiteSpace: 'pre-wrap' }}>{m.recipe}</span></div>
                    </div>
                  )}
                  <ApplyToPlan meal={m} initialDateISO={initialDateISO} onApplied={() => router.refresh()} />
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function todayISO(){ const t = new Date(); t.setHours(0,0,0,0); const y=t.getFullYear(); const m=String(t.getMonth()+1).padStart(2,'0'); const d=String(t.getDate()).padStart(2,'0'); return `${y}-${m}-${d}`; }

function ApplyToPlan({ meal, initialDateISO = null, onApplied }){
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(initialDateISO || todayISO());
  const [type, setType] = useState((meal?.type || 'dinner').toLowerCase());
  const [mode, setMode] = useState('replace');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function apply(){
    setLoading(true); setError(null);
    try {
      const res = await fetchWithTimeout('/api/mealPlans/apply', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ date, type, mode, meal }) }, 30000);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to apply meal');
      setOpen(false);
      if (onApplied) onApplied();
    } catch(e){ setError(e.message || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="stack" style={{ marginTop: 8 }}>
      <button className="btn btn-primary" onClick={()=> setOpen(o=>!o)}>{open ? 'Cancel' : 'Apply to Plan'}</button>
      {open && (
        <div className="stack" style={{ padding: 8, border: '1px solid color-mix(in oklab, var(--elev) 60%, transparent)', borderRadius: 8 }}>
          <div className="list-row" style={{ gap: 8, alignItems:'center', flexWrap:'wrap' }}>
            <label className="muted">Date</label>
            <input type="date" value={date} onChange={e=> setDate(e.target.value)} />
            <label className="muted">Meal</label>
            <select value={type} onChange={e=> setType(e.target.value)}>
              {['breakfast','lunch','dinner','snack'].map(t => (<option key={t} value={t}>{t}</option>))}
            </select>
            <label className="muted">Mode</label>
            <select value={mode} onChange={e=> setMode(e.target.value)}>
              <option value="replace">Replace same type</option>
              <option value="add">Add as extra</option>
            </select>
          </div>
          {error && <div className="list-row"><span className="muted">{String(error)}</span></div>}
          <div className="list-row" style={{ justifyContent:'flex-end' }}>
            <button className="btn btn-primary" disabled={loading} onClick={apply}>{loading ? 'Applying…' : 'Apply'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
