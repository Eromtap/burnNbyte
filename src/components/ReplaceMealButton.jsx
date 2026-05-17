'use client';

import { useRef, useState } from 'react';
import { formatMacro } from '@/lib/macros';

const MODES = [
  { id: 'ai', label: 'New suggestion' },
  { id: 'text', label: 'Describe food' },
  { id: 'photo', label: 'Photo' },
  { id: 'pantry', label: 'Pantry / fridge' },
];

export default function ReplaceMealButton({ dateISO, type, label = 'Replace Meal', className = 'btn btn-secondary', onReplaced }) {
  const fileInputRef = useRef(null);
  const pantryCameraRef = useRef(null);
  const pantryLibraryRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(type || 'snack');
  const [mode, setMode] = useState('ai');
  const [rebalance, setRebalance] = useState(false);
  const [description, setDescription] = useState('');
  const [portionNote, setPortionNote] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [pantryFiles, setPantryFiles] = useState([]);
  const [estimate, setEstimate] = useState(null);
  const [estimateNotes, setEstimateNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function resetState() {
    setSelectedType(type || 'snack');
    setMode('ai');
    setRebalance(false);
    setDescription('');
    setPortionNote('');
    setPhotoFile(null);
    setPantryFiles([]);
    setEstimate(null);
    setEstimateNotes('');
    setError('');
    setLoading(false);
    setSaving(false);
  }

  function closeModal() {
    setOpen(false);
    resetState();
  }

  async function handleAiReplace() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/mealPlans/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ date: dateISO, types: [selectedType] }], rebalance }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to replace meal.');
      if (typeof onReplaced === 'function') {
        await onReplaced();
      }
      closeModal();
    } catch (err) {
      setError(err.message || 'Failed to replace meal.');
    } finally {
      setLoading(false);
    }
  }

  async function handleEstimate() {
    setLoading(true);
    setError('');
    setEstimate(null);
    setEstimateNotes('');
    try {
      const fd = new FormData();
      fd.append('type', selectedType);
      if (description.trim()) fd.append('description', description.trim());
      if (portionNote.trim()) fd.append('portionNote', portionNote.trim());
      if (photoFile) fd.append('photo', photoFile);

      const res = await fetch('/api/mealPlans/estimate', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to estimate replacement.');
      setEstimate(data);
      setEstimateNotes(data?.notes || '');
    } catch (err) {
      setError(err.message || 'Failed to estimate replacement.');
    } finally {
      setLoading(false);
    }
  }

  function dedupeAppend(list, extras) {
    const out = [...list];
    for (const file of extras) {
      const exists = out.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified);
      if (!exists) out.push(file);
      if (out.length >= 3) break;
    }
    return out.slice(0, 3);
  }

  async function handlePantryEstimate() {
    setLoading(true);
    setError('');
    setEstimate(null);
    setEstimateNotes('');
    try {
      const fd = new FormData();
      pantryFiles.slice(0, 3).forEach((file) => fd.append('photos', file));
      fd.append('type', selectedType);

      const res = await fetch('/api/pantry/meal', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to build pantry or fridge replacement.');
      setEstimate(data?.meal || null);
      setEstimateNotes(`Built from ${pantryFiles.length} pantry or fridge photo${pantryFiles.length === 1 ? '' : 's'}.`);
    } catch (err) {
      setError(err.message || 'Failed to build pantry or fridge replacement.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyEstimate() {
    if (!estimate) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/mealPlans/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateISO,
          type: selectedType,
          mode: 'replace',
          meal: {
            name: estimate.name,
            calories: estimate.calories,
            costPerServing: estimate.costPerServing,
            protein: estimate.protein,
            carbs: estimate.carbs,
            fat: estimate.fat,
            ingredients: estimate.ingredients || [],
            recipe: estimate.recipe || estimate.notes || '',
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to apply replacement.');
      if (typeof onReplaced === 'function') {
        await onReplaced();
      }
      closeModal();
    } catch (err) {
      setError(err.message || 'Failed to apply replacement.');
    } finally {
      setSaving(false);
    }
  }

  const canEstimate = Boolean((mode === 'text' && description.trim()) || (mode === 'photo' && photoFile));

  return (
    <>
      <button className={className} onClick={() => setOpen(true)} disabled={!dateISO}>
        {label}
      </button>

      <div className="modal modal-soft" aria-hidden={!open} role="dialog" aria-modal="true" aria-labelledby={`replaceMealTitle-${type || 'shared'}`}>
        <div className="modal-backdrop" onClick={closeModal} />
        <div className="modal-dialog tracker-modal tracker-modal-soft">
          <header className="modal-head tracker-modal-head">
            <div>
              <div className="eyebrow">Meal swap</div>
              <h3 id={`replaceMealTitle-${type || 'shared'}`}>Swap meal</h3>
              <div className="sub">Replace this meal block with a new suggestion, a described food, or a photo estimate.</div>
            </div>
            <button type="button" className="modal-close-icon" onClick={closeModal} aria-label="Close meal swap">
              <span aria-hidden="true">✕</span>
            </button>
          </header>

          <div className="modal-body tracker-modal-body">
            <section className="tracker-section">
              <div className="tracker-label-row">
                <span className="planner-head">Meal type</span>
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} style={{ minWidth: 140 }}>
                  {['breakfast', 'lunch', 'dinner', 'snack'].map((mealType) => (
                    <option key={mealType} value={mealType}>{mealType}</option>
                  ))}
                </select>
              </div>
            </section>

            <section className="tracker-section">
              <div className="tracker-mode-grid">
                {MODES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`exercise-pill ${mode === item.id ? 'exercise-pill-active' : ''}`}
                    onClick={() => {
                      setMode(item.id);
                      setEstimate(null);
                      setEstimateNotes('');
                      setError('');
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            {mode === 'ai' && (
              <section className="tracker-section">
                <div className="tracker-capture-card">
                  <div className="sub">Generate a new meal suggestion for this slot using the existing planner rules.</div>
                  <label className="muted tracker-toggle">
                    <input type="checkbox" checked={rebalance} onChange={(e) => setRebalance(e.target.checked)} />
                    Rebalance the rest of the day
                  </label>
                  <button type="button" className="btn btn-primary" onClick={handleAiReplace} disabled={loading}>
                    {loading ? 'Replacing…' : 'Get a new suggestion'}
                  </button>
                </div>
              </section>
            )}

            {mode === 'text' && (
              <section className="tracker-section">
                <div className="tracker-capture-card">
                  <input
                    type="text"
                    placeholder="Describe the replacement food"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Optional portion note"
                    value={portionNote}
                    onChange={(e) => setPortionNote(e.target.value)}
                  />
                  <button type="button" className="btn btn-primary" onClick={handleEstimate} disabled={!canEstimate || loading}>
                    {loading ? 'Estimating…' : 'Estimate replacement'}
                  </button>
                </div>
              </section>
            )}

            {mode === 'photo' && (
              <section className="tracker-section">
                <div className="tracker-capture-card">
                  <div className="page-hero-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                      {photoFile ? 'Change photo' : 'Take or upload photo'}
                    </button>
                    {photoFile && <span className="muted">{photoFile.name}</span>}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const nextFile = e.target.files?.[0] || null;
                      setPhotoFile(nextFile);
                      if (e.target) e.target.value = '';
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Optional food description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Optional portion note"
                    value={portionNote}
                    onChange={(e) => setPortionNote(e.target.value)}
                  />
                  <button type="button" className="btn btn-primary" onClick={handleEstimate} disabled={!canEstimate || loading}>
                    {loading ? 'Estimating…' : 'Estimate from photo'}
                  </button>
                </div>
              </section>
            )}

            {mode === 'pantry' && (
              <section className="tracker-section">
                <div className="tracker-capture-card">
                  <div className="page-hero-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => pantryCameraRef.current?.click()}
                      disabled={pantryFiles.length >= 3}
                    >
                      Take pantry / fridge photo
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => pantryLibraryRef.current?.click()}
                      disabled={pantryFiles.length >= 3}
                    >
                      Choose photos
                    </button>
                    <span className="muted text-xs">{pantryFiles.length}/3 selected</span>
                  </div>
                  <input
                    ref={pantryCameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const nextFiles = Array.from(e.target.files || []);
                      setPantryFiles((current) => dedupeAppend(current, nextFiles));
                      if (e.target) e.target.value = '';
                    }}
                  />
                  <input
                    ref={pantryLibraryRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const nextFiles = Array.from(e.target.files || []);
                      setPantryFiles((current) => dedupeAppend(current, nextFiles));
                      if (e.target) e.target.value = '';
                    }}
                  />
                  {pantryFiles.length > 0 && (
                    <div className="tracker-library-list">
                      {pantryFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="tracker-library-item">
                          <div>
                            <div className="planner-head">{file.name}</div>
                            <div className="sub">Pantry or fridge photo</div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setPantryFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="muted text-xs">Use 1-3 pantry or fridge photos. The meal type above decides what gets generated.</div>
                  <button type="button" className="btn btn-primary" onClick={handlePantryEstimate} disabled={pantryFiles.length === 0 || loading}>
                    {loading ? 'Generating…' : `Build ${selectedType} from pantry / fridge`}
                  </button>
                </div>
              </section>
            )}

            {(mode === 'text' || mode === 'photo' || mode === 'pantry') && estimate && (
              <section className="tracker-section">
                <div className="tracker-label-row">
                  <span className="planner-head">Review replacement</span>
                  {estimateNotes && <span className="muted text-xs">{estimateNotes}</span>}
                </div>
                <div className="tracker-review-card">
                  <div className="planner-head">{estimate.name}</div>
                  <div className="tracker-macro-row">
                    <div className="tracker-metric">
                      <span className="metric-label">Calories</span>
                      <strong>{estimate.calories ?? 0}</strong>
                    </div>
                    <div className="tracker-metric">
                      <span className="metric-label">Protein</span>
                      <strong>{formatMacro(estimate.protein)}g</strong>
                    </div>
                    <div className="tracker-metric">
                      <span className="metric-label">Carbs</span>
                      <strong>{formatMacro(estimate.carbs)}g</strong>
                    </div>
                    <div className="tracker-metric">
                      <span className="metric-label">Fat</span>
                      <strong>{formatMacro(estimate.fat)}g</strong>
                    </div>
                  </div>
                  <button type="button" className="btn btn-primary" onClick={handleApplyEstimate} disabled={saving}>
                    {saving ? 'Applying…' : 'Use this replacement'}
                  </button>
                </div>
              </section>
            )}

            {error && <div className="muted" style={{ color: 'var(--danger)' }}>{error}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
