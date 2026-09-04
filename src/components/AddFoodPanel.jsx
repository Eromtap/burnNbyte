'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatMacro } from '@/lib/macros';
import { MEAL_TYPES } from '@/lib/mealPlanUtils';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

const MODES = [
  { id: 'text', label: 'Describe food' },
  { id: 'photo', label: 'Take photo' },
  { id: 'pantry', label: 'Pantry / fridge' },
  { id: 'saved', label: 'Add from library' },
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

function scaleSavedValue(value, servings, decimals = 1) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  const scaled = numericValue * servings;
  const factor = 10 ** decimals;
  return Math.round(scaled * factor) / factor;
}

export default function AddFoodPanel({
  open = false,
  onClose,
  selectedISO,
  initialType = 'snack',
  typeSignal = 0,
  initialLibraryItems = [],
  onSaved,
  purpose = 'log',
}) {
  const fileInputRef = useRef(null);
  const photoUploadInputRef = useRef(null);
  const photoStatusRef = useRef(null);
  const reviewSectionRef = useRef(null);
  const pantryCameraRef = useRef(null);
  const pantryLibraryRef = useRef(null);
  const [mode, setMode] = useState('text');
  const [draft, setDraft] = useState(() => emptyDraft(initialType));
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [photoSourceOpen, setPhotoSourceOpen] = useState(false);
  const [servings, setServings] = useState('1');
  const [estimateBase, setEstimateBase] = useState(null);
  const [pantryFiles, setPantryFiles] = useState([]);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [estimateNotes, setEstimateNotes] = useState('');
  const [hasEstimateResult, setHasEstimateResult] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [error, setError] = useState('');
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [includeInGroceries, setIncludeInGroceries] = useState(purpose === 'plan');
  const [libraryKind, setLibraryKind] = useState('FOOD');
  const [markCompleted, setMarkCompleted] = useState(true);
  const [libraryItems, setLibraryItems] = useState(initialLibraryItems);
  const [libraryFilter, setLibraryFilter] = useState('ALL');
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedLibraryItemId, setSelectedLibraryItemId] = useState('');
  const [savedServings, setSavedServings] = useState('1');

  const resetComposer = useCallback((nextType = 'snack') => {
    setMode('text');
    setDraft(emptyDraft(nextType));
    setPhotoFile(null);
    setPhotoSourceOpen(false);
    setServings('1');
    setEstimateBase(null);
    setPantryFiles([]);
    setEstimateNotes('');
    setHasEstimateResult(false);
    setSaveAttempted(false);
    setError('');
    setSaveToLibrary(false);
    setIncludeInGroceries(purpose === 'plan');
    setLibraryKind('FOOD');
    setMarkCompleted(purpose === 'log');
    setLibraryFilter('ALL');
    setLibrarySearch('');
    setSelectedLibraryItemId('');
    setSavedServings('1');
  }, [purpose]);

  useEffect(() => {
    setLibraryItems(initialLibraryItems);
  }, [initialLibraryItems]);

  useEffect(() => {
    if (open) {
      resetComposer(initialType || 'snack');
    }
  }, [initialType, typeSignal, open, resetComposer]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl('');
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [photoFile]);

  useEffect(() => {
    if (!photoFile) return;
    photoStatusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [photoFile]);

  useEffect(() => {
    if (mode === 'saved' || !hasEstimateResult) return;
    reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hasEstimateResult, mode]);

  useEffect(() => {
    const servingCount = Number(servings);
    if (!estimateBase || !Number.isFinite(servingCount) || servingCount <= 0) return;

    setDraft((current) => ({
      ...current,
      calories: Math.round(estimateBase.calories * servingCount),
      costPerServing: Math.round(estimateBase.costPerServing * servingCount * 100) / 100,
      protein: Math.round(estimateBase.protein * servingCount * 10) / 10,
      carbs: Math.round(estimateBase.carbs * servingCount * 10) / 10,
      fat: Math.round(estimateBase.fat * servingCount * 10) / 10,
    }));
  }, [estimateBase, servings]);

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
      setEstimateBase(null);
    }
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handlePhotoSelected(event) {
    const nextFile = event.target.files?.[0] || null;
    setPhotoFile(nextFile);
    setPhotoSourceOpen(false);
    setHasEstimateResult(false);
    setSaveAttempted(false);
    setEstimateBase(null);
    if (event.target) event.target.value = '';
  }

  async function handleEstimate(photo = photoFile) {
    setEstimateLoading(true);
    setError('');
    setEstimateNotes('');

    try {
      const formData = new FormData();
      if (photo) formData.append('photo', photo);
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
        calories: Math.round((Number(data?.calories) || 0) * Number(servings)),
        costPerServing: Math.round((Number(data?.costPerServing) || 0) * Number(servings) * 100) / 100,
        protein: Math.round((Number(data?.protein) || 0) * Number(servings) * 10) / 10,
        carbs: Math.round((Number(data?.carbs) || 0) * Number(servings) * 10) / 10,
        fat: Math.round((Number(data?.fat) || 0) * Number(servings) * 10) / 10,
        ingredientsText: Array.isArray(data?.ingredients) ? data.ingredients.join('\n') : current.ingredientsText,
        recipe: data?.recipe ?? current.recipe,
      }));
      setEstimateBase({
        calories: Number(data?.calories) || 0,
        costPerServing: Number(data?.costPerServing) || 0,
        protein: Number(data?.protein) || 0,
        carbs: Number(data?.carbs) || 0,
        fat: Number(data?.fat) || 0,
      });
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
    const res = await fetch(purpose === 'log' ? '/api/foodLogs' : '/api/mealPlans/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: selectedISO,
        meal: mealPayload,
        saveToLibrary,
        libraryKind,
        libraryDescription: draft.description,
        completed: markCompleted,
        includeInGroceries,
        ...options,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to save meal.');
    return data;
  }

  async function handleSave(options = {}) {
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
      }, options);

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
      const servings = Number(savedServings);
      if (!Number.isFinite(servings) || servings <= 0) {
        throw new Error('Enter a serving amount greater than zero.');
      }

      const data = await saveMeal({
        type: draft.type,
        name: selectedLibraryItem.name,
        calories: Math.round(scaleSavedValue(selectedLibraryItem.calories, servings, 0)),
        costPerServing: scaleSavedValue(selectedLibraryItem.costPerServing, servings, 2),
        protein: scaleSavedValue(selectedLibraryItem.protein, servings),
        carbs: scaleSavedValue(selectedLibraryItem.carbs, servings),
        fat: scaleSavedValue(selectedLibraryItem.fat, servings),
        ingredients: selectedLibraryItem.ingredients || [],
        recipe: selectedLibraryItem.recipe || '',
        recipeYield: selectedLibraryItem.recipeYield ?? null,
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
      <div className="modal-dialog tracker-modal tracker-modal-add-food">
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
              {purpose === 'log' && (
                <div className="tracker-inline-toggle">
                  <input id="food-log-ate-it" type="checkbox" checked={markCompleted} onChange={(event) => setMarkCompleted(event.target.checked)} />
                  <label htmlFor="food-log-ate-it">Ate it</label>
                </div>
              )}
              {purpose === 'plan' && (
                <div className="tracker-inline-toggle">
                  <input id="planned-meal-groceries" type="checkbox" checked={includeInGroceries} onChange={(event) => setIncludeInGroceries(event.target.checked)} />
                  <label htmlFor="planned-meal-groceries">Add ingredients to grocery list</label>
                </div>
              )}
          </section>

          <section className="tracker-section">
            <div className="planner-head">2. How do you want to log it?</div>
            <div className="tracker-mode-grid">
              {MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`exercise-pill ${mode === item.id ? 'exercise-pill-active' : ''}`}
                  onClick={() => {
                    if (item.id === 'photo') {
                      setMode('photo');
                      setPhotoSourceOpen(true);
                      return;
                    }
                    setMode(item.id);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handlePhotoSelected}
            />
            <input
              ref={photoUploadInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoSelected}
            />

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

            {mode === 'photo' && !photoFile && photoSourceOpen && (
              <div className="tracker-capture-card">
                <div className="planner-head">Add a meal photo</div>
                <div className="page-hero-actions">
                  <button type="button" className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                    Take photo
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => photoUploadInputRef.current?.click()}>
                    Upload image
                  </button>
                </div>
              </div>
            )}

            {mode === 'photo' && photoFile && (
              <div className="tracker-capture-card">
                <div
                  ref={photoStatusRef}
                  className={`tracker-photo-status${estimateLoading ? ' tracker-photo-status-loading' : ''}`}
                  aria-live="polite"
                >
                  <strong>{estimateLoading ? 'Analyzing your photo…' : hasEstimateResult ? 'Your estimate is ready' : 'Photo selected'}</strong>
                  <span>
                    {estimateLoading
                      ? 'We’re identifying the food and estimating portions.'
                      : hasEstimateResult
                        ? 'Review the nutrition below, then save it to your day.'
                        : 'Add a name or serving count if you know it, or let us estimate the plate.'}
                  </span>
                </div>
                {photoPreviewUrl && <img className="tracker-photo-preview" src={photoPreviewUrl} alt="Selected meal" />}
                <div className="page-hero-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoSourceOpen(true);
                      setEstimateBase(null);
                    }}
                  >
                    Change photo
                  </button>
                  <span className="muted">{photoFile.name}</span>
                </div>
                <input
                  type="text"
                  placeholder="What is this? (optional — e.g. McDonald’s Double Cheeseburger)"
                  value={draft.description}
                  onChange={(event) => updateDraft('description', event.target.value)}
                />
                <div className="tracker-photo-servings">
                  <label htmlFor="photoServings">Servings</label>
                  <input
                    id="photoServings"
                    type="number"
                    min="0.1"
                    step="0.1"
                    inputMode="decimal"
                    value={servings}
                    onChange={(event) => setServings(event.target.value)}
                  />
                </div>
                {!hasEstimateResult && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleEstimate()}
                    disabled={estimateLoading || !Number.isFinite(Number(servings)) || Number(servings) <= 0}
                  >
                    {estimateLoading ? 'Analyzing photo…' : 'Analyze meal'}
                  </button>
                )}
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
                      <div className="sub">Nutrition is calculated directly from the saved serving.</div>
                    </div>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      inputMode="decimal"
                      aria-label="Number of saved servings"
                      value={savedServings}
                      onChange={(event) => setSavedServings(event.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {mode !== 'saved' && (
            <>
              <section ref={reviewSectionRef} className="tracker-section">
                <div className="tracker-label-row">
                  <span className="planner-head">3. Review before saving</span>
                  <div className="tracker-review-actions">
                    {estimateNotes && <span className="muted text-xs">{estimateNotes}</span>}
                    <button
                      type="button"
                      className={`tracker-library-toggle${saveToLibrary ? ' tracker-library-toggle-active' : ''}`}
                      onClick={() => setSaveToLibrary((current) => !current)}
                    >
                      {saveToLibrary ? 'Will save to library' : 'Also save to library'}
                    </button>
                  </div>
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

            </>
          )}

          {error && <div className="muted" style={{ color: 'var(--danger)' }}>{error}</div>}
        </div>

        <footer className="modal-foot tracker-modal-foot">
          <button type="button" className="btn btn-ghost" onClick={() => resetComposer(draft.type)}>Reset</button>
          <div className="tracker-footer-actions">
            {saveAttempted && needsEstimateBeforeSave && (
              <div className="tracker-save-hint">
                {mode === 'photo' && photoFile
                  ? <>Let the photo finish analyzing so you can review it before saving.</>
                  : <>Hit <strong>Estimate meal</strong> first so you can review it before saving.</>}
              </div>
            )}
            <button
              type="button"
              className="btn btn-primary"
              disabled={saveLoading || (mode === 'saved' ? !selectedLibraryItem : false)}
              onClick={mode === 'saved' ? handleAddSavedItem : () => handleSave()}
            >
              {saveLoading ? 'Saving…' : mode === 'saved' ? 'Add to day' : saveToLibrary ? 'Save to day + library' : 'Save to day'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
