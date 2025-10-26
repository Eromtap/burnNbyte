'use client';

import { useMemo, useRef, useState } from 'react';

export default function PantryCapture() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [unit, setUnit] = useState('imperial');
  const [days, setDays] = useState(3);
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
      const res = await fetch('/api/pantry/plan', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to analyze photo');
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
        <div className="list-row" style={{ alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="muted">Pantry/Fridge Photos (up to 3)</span>
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
          <label className="muted">Meals</label>
          <input type="number" min={1} max={7} value={days} onChange={(e)=> setDays(Number(e.target.value||3))} style={{ width: 80 }} />
          <button className="btn btn-primary" type="submit" disabled={files.length === 0 || loading}>{loading ? 'Analyzing…' : 'Analyze & Suggest Meals'}</button>
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
                  <div className="sub">{m.type}{typeof m.calories !== 'undefined' ? ` • ${m.calories} kcal` : ''}</div>
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
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
