'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatMacro } from '@/lib/macros';
import { MEAL_TYPES } from '@/lib/mealPlanUtils';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

const MODES = [
  { id: 'text', label: 'Describe food' },
  { id: 'photo', label: 'Take photo' },
  { id: 'pantry', label: 'Pantry / fridge' },
  { id: 'saved', label: 'Quick add saved' },
];

function emptyDraft(type = 'snack') {
  return {
    type,
    name: '',
    description: '',
    portionNote: '',
    calories: '',
    costPerServing: '',
    protein: '',
    carbs: '',
    fat: '',
    ingredientsText: '',
    recipe: '',
  };
}

function libraryKindLabel(kind) {
  return kind === 'FOOD' ? 'Food' : 'Meal';
}

export default function AddFoodPanel({
  open = false,
  onClose,
  selectedISO,
  initialType = 'snack',
  typeSignal = 0,
  initialLibraryItems = [],
  onSaved,
}) {
  const fileInputRef = useRef(null);
  const pantryCameraRef = useRef(null);
  const pantryLibraryRef = useRef(null);
  const [mode, setMode] = useState('text');
  const [draft, setDraft] = useState(() => emptyDraft(initialType));
  const [photoFile, setPhotoFile] = useState(null);
  const [pantryFiles, setPantryFiles] = useState([]);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [estimateNotes, setEstimateNotes] = useState('');
  const [hasEstimateResult, setHasEstimateResult] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [error, setError] = useState('');
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [libraryKind, setLibraryKind] = useState('FOOD');
  const [markCompleted, setMarkCompleted] = useState(true);
  const [libraryItems, setLibraryItems] = useState(initialLibraryItems);
  const [libraryFilter, setLibraryFilter] = useState('ALL');
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedLibraryItemId, setSelectedLibraryItemId] = useState('');
  const [savedPortionNote, setSavedPortionNote] = useState('');

  const resetComposer = useCallback((nextType = 'snack') => {
    setMode('text');
    setDraft(emptyDraft(nextType));
    setPhotoFile(null);
    setPantryFiles([]);
    setEstimateNotes('');
    setHasEstimateResult(false);
    setSaveAttempted(false);
    setError('');
    setSaveToLibrary(false);
    setLibraryKind('FOOD');
    setMarkCompleted(true);
    setLibraryFilter('ALL');
    setLibrarySearch('');
    setSelectedLibraryItemId('');
    setSavedPortionNote('');
  }, []);

  useEffect(() => {
    setLibraryItems(initialLibraryItems);
  }, [initialLibraryItems]);

  useEffect(() => {
    if (open) {
      resetComposer(initialType || 'snack');
    }
  }, [initialType, typeSignal, open, resetComposer]);

  const filteredLibraryItems = useMemo(() => (
    libraryItems.filter((item) => {
      if (libraryFilter !== 'ALL' && item.kind !== libraryFilter) return false;
      const search = librarySearch.trim().toLowerCase();
      if (!search) return true;
      const haystack = [
        item?.name,
        item?.description,
        Array.isArray(item?.ingredients) ? item.ingredients.join(' ') : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    })
  ), [libraryFilter, libraryItems, librarySearch]);
  const selectedLibraryItem = useMemo(
    () => libraryItems.find((item) => item.id === selectedLibraryItemId) || null,
    [libraryItems, selectedLibraryItemId]
  );

  const hasEstimateInput = Boolean(photoFile || draft.description.trim());
  const showNameField = mode === 'saved' || Boolean(draft.name.trim());
  const reviewReady = hasEstimateResult && Boolean(draft.name.trim());
  const needsEstimateBeforeSave = mode !== 'saved' && !hasEstimateResult;

  function updateDraft(key, value) {
    if (['type', 'description', 'portionNote'].includes(key)) {
      setHasEstimateResult(false);
      setSaveAttempted(false);
    }
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleEstimate() {
    setEstimateLoading(true);
    setError('');
    setEstimateNotes('');

    try {
      const formData = new FormData();
      if (photoFile) formData.append('photo', photoFile);
      if (draft.description.trim()) formData.append('description', draft.description.trim());
      if (draft.portionNote.trim()) formData.append('portionNote', draft.portionNote.trim());
      formData.append('type', draft.type);

      const res = await fetchWithTimeout('/api/mealPlans/estimate', {
        method: 'POST',
        body: formData,
      }, 100000);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to estimate meal.');

      setDraft((current) => ({
        ...current,
        name: data?.name || current.name,
        calories: data?.calories ?? current.calories,
        costPerServing: data?.costPerServing ?? current.costPerServing,
        protein: data?.protein ?? current.protein,
        carbs: data?.carbs ?? current.carbs,
        fat: data?.fat ?? current.fat,
        ingredientsText: Array.isArray(data?.ingredients) ? data.ingredients.join('\n') : current.ingredientsText,
        recipe: data?.recipe ?? current.recipe,
      }));
      setEstimateNotes(data?.notes || '');
      setHasEstimateResult(true);
      setSaveAttempted(false);
    } catch (err) {
      setError(err.message || 'Failed to estimate meal.');
    } finally {
      setEstimateLoading(false);
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
    setEstimateLoading(true);
    setError('');
    setEstimateNotes('');

    try {
      const formData = new FormData();
      pantryFiles.slice(0, 3).forEach((file) => formData.append('photos', file));
      formData.append('type', draft.type);

      const res = await fetchWithTimeout('/api/pantry/meal', {
        method: 'POST',
        body: formData,
      }, 100000);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to generate pantry or fridge meal.');
      }

      const meal = data?.meal || {};
      setDraft((current) => ({
        ...current,
        name: meal?.name || current.name,
        calories: meal?.calories ?? current.calories,
        costPerServing: meal?.costPerServing ?? current.costPerServing,
        protein: meal?.protein ?? current.protein,
        carbs: meal?.carbs ?? current.carbs,
        fat: meal?.fat ?? current.fat,
        ingredientsText: Array.isArray(meal?.ingredients) ? meal.ingredients.join('\n') : current.ingredientsText,
        recipe: meal?.recipe ?? current.recipe,
      }));
      setEstimateNotes(`Built from ${pantryFiles.length} pantry or fridge photo${pantryFiles.length === 1 ? '' : 's'}.`);
      setHasEstimateResult(true);
      setSaveAttempted(false);
    } catch (err) {
      setError(err.message || 'Failed to generate pantry or fridge meal.');
    } finally {
      setEstimateLoading(false);
    }
  }

  async function saveMeal(mealPayload, options = {}) {
    const res = await fetch('/api/mealPlans/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: selectedISO,
        meal: mealPayload,
        saveToLibrary,
        libraryKind,
        libraryDescription: draft.description,
        completed: markCompleted,
        ...options,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to save meal.');
    return data;
  }

  async function handleSave() {
    if (!reviewReady) {
      setSaveAttempted(true);
      return;
    }

    setSaveLoading(true);
    setError('');

    try {
      const data = await saveMeal({
        type: draft.type,
        name: draft.name,
        calories: draft.calories,
        costPerServing: draft.costPerServing,
        protein: draft.protein,
        carbs: draft.carbs,
        fat: draft.fat,
        ingredients: draft.ingredientsText,
        recipe: draft.recipe,
      });

      if (data?.libraryItem) {
        setLibraryItems((current) => [data.libraryItem, ...current.filter((item) => item.id !== data.libraryItem.id)]);
      }
      if (typeof onSaved === 'function') {
        await onSaved(data);
      }
      resetComposer(draft.type);
    } catch (err) {
      setError(err.message || 'Failed to save meal.');
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleAddSavedItem() {
    if (!selectedLibraryItem) {
      setError('Choose a saved food or meal first.');
      return;
    }

    setSaveLoading(true);
    setError('');
    setEstimateNotes('');

    try {
      const descriptionParts = [
        `Saved ${libraryKindLabel(selectedLibraryItem.kind).toLowerCase()}: ${selectedLibraryItem.name}.`,
        selectedLibraryItem.description ? `Saved description: ${selectedLibraryItem.description}.` : '',
        `Reference nutrition for the usual saved portion: ${selectedLibraryItem.calories ?? 0} kcal, ${formatMacro(selectedLibraryItem.protein)}g protein, ${formatMacro(selectedLibraryItem.carbs)}g carbs, ${formatMacro(selectedLibraryItem.fat)}g fat.`,
        Array.isArray(selectedLibraryItem.ingredients) && selectedLibraryItem.ingredients.length
          ? `Likely ingredients: ${selectedLibraryItem.ingredients.join(', ')}.`
          : '',
      ].filter(Boolean).join(' ');

      const formData = new FormData();
      formData.append('description', descriptionParts);
      formData.append('portionNote', savedPortionNote.trim() || 'Use the standard saved portion.');
      formData.append('type', draft.type);

      const estimateRes = await fetchWithTimeout('/api/mealPlans/estimate', {
        method: 'POST',
        body: formData,
      }, 100000);
      const estimateData = await estimateRes.json().catch(() => ({}));
      if (!estimateRes.ok) {
        throw new Error(estimateData?.error || 'Failed to estimate saved item.');
      }

      const data = await saveMeal({
        type: draft.type,
        name: estimateData?.name || selectedLibraryItem.name,
        calories: estimateData?.calories ?? selectedLibraryItem.calories,
        costPerServing: estimateData?.costPerServing ?? selectedLibraryItem.costPerServing,
        protein: estimateData?.protein ?? selectedLibraryItem.protein,
        carbs: estimateData?.carbs ?? selectedLibraryItem.carbs,
        fat: estimateData?.fat ?? selectedLibraryItem.fat,
        ingredients: estimateData?.ingredients || selectedLibraryItem.ingredients || [],
        recipe: estimateData?.recipe || selectedLibraryItem.recipe || '',
      }, {
        saveToLibrary: false,
      });

      if (typeof onSaved === 'function') {
        await onSaved(data);
      }
      resetComposer(draft.type);
    } catch (err) {
      setError(err.message || 'Failed to add saved item.');
    } finally {
      setSaveLoading(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="modal" aria-hidden={!open} role="dialog" aria-modal="true" aria-labelledby="addFoodModalTitle">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog tracker-modal">
        <header className="modal-head tracker-modal-head">
          <div>
            <div className="eyebrow">Meal tracker</div>
            <h3 id="addFoodModalTitle">Add to {draft.type}</h3>
            <div className="sub">Log fast, let the AI estimate, then save if it looks right.</div>
          </div>
          <button type="button" className="modal-close-icon" onClick={onClose} aria-label="Close add food">
            <span aria-hidden="true">✕</span>
          </button>
        </header>

        <div className="modal-body tracker-modal-body">
          <section className="tracker-section">
            <div className="tracker-label-row">
              <span className="planner-head">1. Where should this go?</span>
              <select value={draft.type} onChange={(event) => updateDraft('type', event.target.value)} style={{ minWidth: 140 }}>
                {MEAL_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="tracker-section">
            <div className="planner-head">2. How do you want to log it?</div>
            <div className="tracker-mode-grid">
              {MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`exercise-pill ${mode === item.id ? 'exercise-pill-active' : ''}`}
                  onClick={() => setMode(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {mode === 'text' && (
              <div className="tracker-capture-card">
                <input
                  type="text"
                  placeholder="Describe what you ate"
                  value={draft.description}
                  onChange={(event) => updateDraft('description', event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Optional portion note"
                  value={draft.portionNote}
                  onChange={(event) => updateDraft('portionNote', event.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleEstimate}
                  disabled={estimateLoading || !hasEstimateInput}
                >
                  {estimateLoading ? 'Estimating…' : 'Estimate meal'}
                </button>
              </div>
            )}

            {mode === 'photo' && (
              <div className="tracker-capture-card">
                <div className="page-hero-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
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
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] || null;
                    setPhotoFile(nextFile);
                    setHasEstimateResult(false);
                    setSaveAttempted(false);
                    if (event.target) event.target.value = '';
                  }}
                />
                <input
                  type="text"
                  placeholder="Optional description to help the estimate"
                  value={draft.description}
                  onChange={(event) => updateDraft('description', event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Optional portion note"
                  value={draft.portionNote}
                  onChange={(event) => updateDraft('portionNote', event.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleEstimate}
                  disabled={estimateLoading || !hasEstimateInput}
                >
                  {estimateLoading ? 'Estimating…' : 'Estimate from photo'}
                </button>
              </div>
            )}

            {mode === 'pantry' && (
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
                  onChange={(event) => {
                    const nextFiles = Array.from(event.target.files || []);
                    setPantryFiles((current) => dedupeAppend(current, nextFiles));
                    setHasEstimateResult(false);
                    setSaveAttempted(false);
                    if (event.target) event.target.value = '';
                  }}
                />
                <input
                  ref={pantryLibraryRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(event) => {
                    const nextFiles = Array.from(event.target.files || []);
                    setPantryFiles((current) => dedupeAppend(current, nextFiles));
                    setHasEstimateResult(false);
                    setSaveAttempted(false);
                    if (event.target) event.target.value = '';
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
                <div className="muted text-xs">Use 1-3 pantry or fridge photos. The selected meal type above tells the model what to build.</div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handlePantryEstimate}
                  disabled={estimateLoading || pantryFiles.length === 0}
                >
                  {estimateLoading ? 'Generating…' : `Build ${draft.type} from pantry / fridge`}
                </button>
              </div>
            )}

            {mode === 'saved' && (
              <div className="tracker-capture-card">
                <div className="tracker-label-row">
                  <span className="muted">Filter saved items</span>
                  <select value={libraryFilter} onChange={(event) => setLibraryFilter(event.target.value)} style={{ minWidth: 120 }}>
                    <option value="ALL">All</option>
                    <option value="FOOD">Foods</option>
                    <option value="MEAL">Meals</option>
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Search saved foods and meals"
                  value={librarySearch}
                  onChange={(event) => setLibrarySearch(event.target.value)}
                />
                <div className="tracker-library-list tracker-library-list-scroll">
                  {filteredLibraryItems.length ? filteredLibraryItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`tracker-library-item tracker-library-item-select${selectedLibraryItemId === item.id ? ' tracker-library-item-active' : ''}`}
                      onClick={() => setSelectedLibraryItemId(item.id)}
                    >
                      <div>
                        <div className="planner-head">{item.name}</div>
                        <div className="sub">{libraryKindLabel(item.kind)}</div>
                        <div className="muted text-xs">
                          {item.calories ?? 0} kcal • {formatMacro(item.protein)}g protein • {formatMacro(item.carbs)}g carbs • {formatMacro(item.fat)}g fat
                        </div>
                      </div>
                    </button>
                  )) : (
                    <div className="muted">
                      {librarySearch.trim()
                        ? 'No saved foods or meals match that search.'
                        : 'Save foods or meals during logging and they will appear here.'}
                    </div>
                  )}
                </div>
                {selectedLibraryItem && (
                  <div className="tracker-saved-action-card">
                    <div>
                      <div className="planner-head">{selectedLibraryItem.name}</div>
                      <div className="sub">Optional portion note if you ate more or less than the usual saved amount.</div>
                    </div>
                    <input
                      type="text"
                      placeholder="Optional portion note, for example 1.5 servings or half portion"
                      value={savedPortionNote}
                      onChange={(event) => setSavedPortionNote(event.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {mode !== 'saved' && (
            <>
              <section className="tracker-section">
                <div className="tracker-label-row">
                  <span className="planner-head">3. Review before saving</span>
                  {estimateNotes && <span className="muted text-xs">{estimateNotes}</span>}
                </div>

                <div className="tracker-review-card">
                  {showNameField ? (
                    <input
                      type="text"
                      placeholder="Meal name"
                      value={draft.name}
                      onChange={(event) => updateDraft('name', event.target.value)}
                    />
                  ) : (
                    <div className="muted text-xs">
                      Run the estimate first and you can rename the saved meal before it gets logged.
                    </div>
                  )}
                  <div className="tracker-macro-row">
                    <div className="tracker-metric">
                      <span className="metric-label">Calories</span>
                      <strong>{draft.calories || 0}</strong>
                    </div>
                    <div className="tracker-metric">
                      <span className="metric-label">Protein</span>
                      <strong>{formatMacro(draft.protein)}g</strong>
                    </div>
                    <div className="tracker-metric">
                      <span className="metric-label">Carbs</span>
                      <strong>{formatMacro(draft.carbs)}g</strong>
                    </div>
                    <div className="tracker-metric">
                      <span className="metric-label">Fat</span>
                      <strong>{formatMacro(draft.fat)}g</strong>
                    </div>
                  </div>

                  {reviewReady && (
                    <details className="tracker-advanced">
                      <summary>Edit nutrition manually</summary>
                      <div className="tracker-advanced-grid">
                        <input
                          type="number"
                          step="1"
                          placeholder="Calories"
                          value={draft.calories}
                          onChange={(event) => updateDraft('calories', event.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Cost"
                          value={draft.costPerServing}
                          onChange={(event) => updateDraft('costPerServing', event.target.value)}
                        />
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Protein (g)"
                          value={draft.protein}
                          onChange={(event) => updateDraft('protein', event.target.value)}
                        />
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Carbs (g)"
                          value={draft.carbs}
                          onChange={(event) => updateDraft('carbs', event.target.value)}
                        />
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Fat (g)"
                          value={draft.fat}
                          onChange={(event) => updateDraft('fat', event.target.value)}
                        />
                        <textarea
                          placeholder="Ingredients, one per line"
                          value={draft.ingredientsText}
                          onChange={(event) => updateDraft('ingredientsText', event.target.value)}
                          rows={5}
                        />
                        <textarea
                          placeholder="Recipe or prep notes"
                          value={draft.recipe}
                          onChange={(event) => updateDraft('recipe', event.target.value)}
                          rows={5}
                        />
                      </div>
                    </details>
                  )}
                </div>
              </section>

              <section className="tracker-section">
                <div className="tracker-save-row">
                  <label className="tracker-toggle-card">
                    <input
                      type="checkbox"
                      checked={markCompleted}
                      onChange={(event) => setMarkCompleted(event.target.checked)}
                    />
                    <span>
                      <strong>Count as eaten now</strong>
                      <small>Include it in today&apos;s progress immediately.</small>
                    </span>
                  </label>

                  <label className="tracker-toggle-card">
                    <input
                      type="checkbox"
                      checked={saveToLibrary}
                      onChange={(event) => setSaveToLibrary(event.target.checked)}
                    />
                    <span>
                      <strong>Save to library</strong>
                      <small>Reuse it later without re-entering everything.</small>
                    </span>
                  </label>
                </div>

                {saveToLibrary && (
                  <select value={libraryKind} onChange={(event) => setLibraryKind(event.target.value)} style={{ minWidth: 140 }}>
                    <option value="FOOD">Save as food</option>
                    <option value="MEAL">Save as meal</option>
                  </select>
                )}
              </section>
            </>
          )}

          {mode === 'saved' && (
            <section className="tracker-section">
              <div className="tracker-save-row tracker-save-row-single">
                <label className="tracker-toggle-card">
                  <input
                    type="checkbox"
                    checked={markCompleted}
                    onChange={(event) => setMarkCompleted(event.target.checked)}
                  />
                  <span>
                    <strong>Count as eaten now</strong>
                    <small>Include it in today&apos;s progress immediately.</small>
                  </span>
                </label>
              </div>
            </section>
          )}

          {error && <div className="muted" style={{ color: 'var(--danger)' }}>{error}</div>}
        </div>

        <footer className="modal-foot tracker-modal-foot">
          <button type="button" className="btn btn-ghost" onClick={() => resetComposer(draft.type)}>Reset</button>
          <div className="tracker-footer-actions">
            {saveAttempted && needsEstimateBeforeSave && (
              <div className="tracker-save-hint">
                Hit <strong>Estimate meal</strong> first so you can review it before saving.
              </div>
            )}
            <button
              type="button"
              className="btn btn-primary"
              disabled={saveLoading || (mode === 'saved' ? !selectedLibraryItem : false)}
              onClick={mode === 'saved' ? handleAddSavedItem : handleSave}
            >
              {saveLoading ? 'Saving…' : mode === 'saved' ? 'Estimate and save' : 'Save to day'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
