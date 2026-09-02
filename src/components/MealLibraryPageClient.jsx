'use client';

import { useMemo, useState } from 'react';
import { formatMacro } from '@/lib/macros';
import { normalizeStringList } from '@/lib/mealPlanUtils';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

const KIND_OPTIONS = [
  { id: 'ALL', label: 'All items' },
  { id: 'FOOD', label: 'Foods' },
  { id: 'MEAL', label: 'Meals' },
];

function emptyForm() {
  return {
    kind: 'FOOD',
    defaultMealType: 'dinner',
    name: '',
    description: '',
    calories: '',
    costPerServing: '',
    protein: '',
    carbs: '',
    fat: '',
    ingredientsText: '',
    recipe: '',
  };
}

function toForm(item) {
  return {
    kind: item?.kind || 'FOOD',
    defaultMealType: item?.defaultMealType || 'dinner',
    name: item?.name || '',
    description: item?.description || '',
    calories: item?.calories ?? '',
    costPerServing: item?.costPerServing ?? '',
    protein: item?.protein ?? '',
    carbs: item?.carbs ?? '',
    fat: item?.fat ?? '',
    ingredientsText: Array.isArray(item?.ingredients) ? item.ingredients.join('\n') : '',
    recipe: item?.recipe || '',
  };
}

function formatCost(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return `$${Number(value).toFixed(2)}`;
}

export default function MealLibraryPageClient({ initialItems = [] }) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('ALL');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create');
  const [createSource, setCreateSource] = useState('describe');
  const [editingItemId, setEditingItemId] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [portionNote, setPortionNote] = useState('');
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [hasEstimateResult, setHasEstimateResult] = useState(false);
  const [estimateNotes, setEstimateNotes] = useState('');
  const [recipeUrl, setRecipeUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (kindFilter !== 'ALL' && item.kind !== kindFilter) return false;
      const needle = search.trim().toLowerCase();
      if (!needle) return true;
      const haystack = [
        item?.name,
        item?.description,
        Array.isArray(item?.ingredients) ? item.ingredients.join(' ') : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [items, kindFilter, search]);

  function updateField(key, value) {
    if (editorMode === 'create' && ['kind', 'description'].includes(key)) {
      setHasEstimateResult(false);
      setEstimateNotes('');
    }
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setEditorMode('create');
    setEditingItemId('');
    setForm(emptyForm());
    setPortionNote('');
    setHasEstimateResult(false);
    setEstimateNotes('');
    setCreateSource('describe');
    setRecipeUrl('');
    setSaveError('');
    setEditorOpen(true);
  }

  function openImport() {
    openCreate();
    setCreateSource('url');
  }

  function openEdit(item) {
    setEditorMode('edit');
    setEditingItemId(item.id);
    setForm(toForm(item));
    setPortionNote('');
    setHasEstimateResult(true);
    setEstimateNotes('');
    setSaveError('');
    setEditorOpen(true);
  }

  async function handleRecipeImport() {
    setImportLoading(true);
    setSaveError('');
    try {
      const res = await fetchWithTimeout('/api/mealLibrary/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: recipeUrl.trim() }),
      }, 120000);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Could not import that recipe.');
      const recipe = data?.recipe;
      if (!recipe?.name) throw new Error('That page did not return a usable recipe.');
      setForm({
        kind: 'MEAL',
        defaultMealType: recipe.defaultMealType || 'dinner',
        name: recipe.name || '',
        description: recipe.description || '',
        calories: recipe.calories ?? '',
        costPerServing: recipe.costPerServing ?? '',
        protein: recipe.protein ?? '',
        carbs: recipe.carbs ?? '',
        fat: recipe.fat ?? '',
        ingredientsText: Array.isArray(recipe.ingredients) ? recipe.ingredients.join('\n') : '',
        recipe: recipe.recipe || '',
      });
      setEstimateNotes('Imported from the recipe link. Review anything you want to change before saving.');
      setHasEstimateResult(true);
    } catch (err) {
      setSaveError(err.message || 'Could not import that recipe.');
    } finally {
      setImportLoading(false);
    }
  }

  async function handleEstimate() {
    setEstimateLoading(true);
    setSaveError('');

    try {
      const description = String(form.description || '').trim();
      if (!description) {
        throw new Error('Add a description first.');
      }

      const formData = new FormData();
      formData.append('description', description);
      if (portionNote.trim()) formData.append('portionNote', portionNote.trim());
      formData.append('type', form.kind === 'MEAL' ? 'lunch' : 'snack');

      const res = await fetchWithTimeout('/api/mealPlans/estimate', {
        method: 'POST',
        body: formData,
      }, 100000);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to estimate library item.');

      setForm((current) => ({
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
    } catch (err) {
      setSaveError(err.message || 'Failed to estimate library item.');
    } finally {
      setEstimateLoading(false);
    }
  }

  async function handleSave() {
    if (editorMode === 'create' && !hasEstimateResult) {
      setSaveError('Estimate the item first so you can review it before saving.');
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      const payload = {
        kind: form.kind,
        defaultMealType: form.kind === 'MEAL' ? form.defaultMealType : '',
        name: form.name,
        description: form.description,
        calories: form.calories,
        costPerServing: form.costPerServing,
        protein: form.protein,
        carbs: form.carbs,
        fat: form.fat,
        ingredients: normalizeStringList(form.ingredientsText),
        recipe: form.recipe,
      };

      const endpoint = editorMode === 'edit'
        ? `/api/mealLibrary/${editingItemId}`
        : '/api/mealLibrary';
      const method = editorMode === 'edit' ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to save library item.');

      const savedItem = data?.item;
      if (savedItem) {
        setItems((current) => [savedItem, ...current.filter((item) => item.id !== savedItem.id)]);
      }
      setEditorOpen(false);
    } catch (err) {
      setSaveError(err.message || 'Failed to save library item.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    setDeleteError('');

    try {
      const res = await fetch(`/api/mealLibrary/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to delete library item.');
      setItems((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete library item.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <section className="hero-card page-hero page-hero-compact bn-route-hero bn-library-hero">
        <div className="page-hero-copy">
          <div className="eyebrow">Meal library</div>
          <div>
            <h1 className="page-hero-title">Saved foods and meals</h1>
            <p className="page-hero-text">
              Manage the foods and meals you eat most often.
            </p>
          </div>
          <div className="page-hero-actions home-meals-actions">
            <button type="button" className="btn btn-primary" onClick={openCreate}>Add library item</button>
            <button type="button" className="btn btn-secondary" onClick={openImport}>Import recipe link</button>
          </div>
        </div>
      </section>

      <section className="card meal-library-card bn-route-stage">
        <header className="card-head">
          <div>
            <h3>Library</h3>
            <div className="sub">Search, edit, or remove reusable foods and meals.</div>
          </div>
          <div className="section-badge section-badge-meal">{items.length} saved</div>
        </header>

        <div className="meal-library-toolbar">
          <input
            type="text"
            placeholder="Search saved foods and meals"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}>
            {KIND_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="meal-library-grid">
          {filteredItems.length ? filteredItems.map((item) => (
            <details key={item.id} className="meal-library-item-card meal-library-item-disclosure">
              <summary className="meal-library-item-summary">
                <div className="meal-library-item-summary-main">
                  <div className="section-badge section-badge-meal">{item.kind === 'FOOD' ? 'Food' : 'Meal'}</div>
                  <h3>{item.name}</h3>
                </div>
                <span className="meal-library-item-chevron" aria-hidden="true">⌄</span>
              </summary>
              <div className="meal-library-item-body">
                <div className="meal-library-item-head">
                  <div className="sub">
                    {item.calories ?? 0} kcal • {formatMacro(item.protein)}g protein • {formatMacro(item.carbs)}g carbs • {formatMacro(item.fat)}g fat
                    {formatCost(item.costPerServing) ? ` • ~${formatCost(item.costPerServing)}/serving` : ''}
                  </div>
                  <div className="meal-library-item-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => openEdit(item)}>Edit</button>
                    <button type="button" className="btn btn-outline meal-delete-btn" onClick={() => setDeleteTarget(item)}>Delete</button>
                  </div>
                </div>
                {item.description && <div className="muted">{item.description}</div>}
                {Array.isArray(item.ingredients) && item.ingredients.length > 0 && (
                  <div className="list-row meal-library-ingredients">
                    <span>{item.ingredients.slice(0, 6).join(' • ')}</span>
                  </div>
                )}
              </div>
            </details>
          )) : (
            <div className="list-row"><span className="muted">No saved library items match that search yet.</span></div>
          )}
        </div>
      </section>

      <div className="modal modal-soft" aria-hidden={!editorOpen} role="dialog" aria-modal="true" aria-labelledby="mealLibraryEditorTitle">
        <div className="modal-backdrop" onClick={() => setEditorOpen(false)} />
        <div className="modal-dialog tracker-modal tracker-modal-soft">
          <header className="modal-head tracker-modal-head">
            <div>
              <div className="eyebrow">Meal library</div>
              <h3 id="mealLibraryEditorTitle">{editorMode === 'edit' ? 'Edit library item' : 'Add library item'}</h3>
              <div className="sub">{createSource === 'url' && editorMode === 'create' ? 'Paste a public recipe link and we’ll pull in the ingredients, directions, and nutrition.' : 'Save reusable foods or meals so they are easy to find later.'}</div>
            </div>
            <button type="button" className="modal-close-icon" onClick={() => setEditorOpen(false)} aria-label="Close meal library editor">
              <span aria-hidden="true">✕</span>
            </button>
          </header>
          <div className="modal-body tracker-modal-body">
            {editorMode === 'create' ? (
              <>
                {createSource === 'url' ? (
                  <section className="tracker-section">
                    <div className="tracker-capture-card meal-library-form">
                      <label className="planner-head" htmlFor="recipeImportUrl">Recipe link</label>
                      <input
                        id="recipeImportUrl"
                        type="url"
                        inputMode="url"
                        placeholder="https://example.com/recipe"
                        value={recipeUrl}
                        onChange={(event) => {
                          setRecipeUrl(event.target.value);
                          setHasEstimateResult(false);
                          setEstimateNotes('');
                        }}
                      />
                      <div className="muted text-xs">Works best with public recipe pages. Paywalls and login-only links cannot be imported.</div>
                      <button type="button" className="btn btn-primary" onClick={handleRecipeImport} disabled={importLoading || !recipeUrl.trim()}>
                        {importLoading ? 'Importing recipe…' : 'Import recipe'}
                      </button>
                    </div>
                  </section>
                ) : (
                  <section className="tracker-section">
                    <div className="tracker-capture-card meal-library-form">
                      <select value={form.kind} onChange={(event) => updateField('kind', event.target.value)}>
                        <option value="FOOD">Food</option>
                        <option value="MEAL">Meal</option>
                      </select>
                      <input
                        type="text"
                        placeholder={form.kind === 'MEAL' ? 'Describe the meal you want to save' : 'Describe the food you want to save'}
                        value={form.description}
                        onChange={(event) => updateField('description', event.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Optional portion note"
                        value={portionNote}
                        onChange={(event) => {
                          setPortionNote(event.target.value);
                          setHasEstimateResult(false);
                          setEstimateNotes('');
                        }}
                      />
                      <button type="button" className="btn btn-primary" onClick={handleEstimate} disabled={estimateLoading || !form.description.trim()}>
                        {estimateLoading ? 'Estimating…' : 'Estimate item'}
                      </button>
                    </div>
                  </section>
                )}

                <section className="tracker-section">
                  <div className="tracker-label-row">
                    <span className="planner-head">Review before saving</span>
                    {estimateNotes && <span className="muted text-xs">{estimateNotes}</span>}
                  </div>
                  <div className="tracker-review-card meal-library-form">
                    {hasEstimateResult ? (
                      <>
                        <input type="text" placeholder="Name" value={form.name} onChange={(event) => updateField('name', event.target.value)} />
                        {form.kind === 'MEAL' && (
                          <select value={form.defaultMealType} onChange={(event) => updateField('defaultMealType', event.target.value)}>
                            {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => <option key={type} value={type}>{type}</option>)}
                          </select>
                        )}
                        <div className="tracker-macro-row">
                          <div className="tracker-metric">
                            <span className="metric-label">Calories</span>
                            <strong>{form.calories || 0}</strong>
                          </div>
                          <div className="tracker-metric">
                            <span className="metric-label">Protein</span>
                            <strong>{formatMacro(form.protein)}g</strong>
                          </div>
                          <div className="tracker-metric">
                            <span className="metric-label">Carbs</span>
                            <strong>{formatMacro(form.carbs)}g</strong>
                          </div>
                          <div className="tracker-metric">
                            <span className="metric-label">Fat</span>
                            <strong>{formatMacro(form.fat)}g</strong>
                          </div>
                        </div>
                        <details className="tracker-advanced">
                          <summary>Edit nutrition manually</summary>
                          <div className="tracker-advanced-grid">
                            <input type="number" step="1" placeholder="Calories" value={form.calories} onChange={(event) => updateField('calories', event.target.value)} />
                            <input type="number" step="0.01" placeholder="Cost" value={form.costPerServing} onChange={(event) => updateField('costPerServing', event.target.value)} />
                            <input type="number" step="0.1" placeholder="Protein" value={form.protein} onChange={(event) => updateField('protein', event.target.value)} />
                            <input type="number" step="0.1" placeholder="Carbs" value={form.carbs} onChange={(event) => updateField('carbs', event.target.value)} />
                            <input type="number" step="0.1" placeholder="Fat" value={form.fat} onChange={(event) => updateField('fat', event.target.value)} />
                            <textarea placeholder="Ingredients, one per line" rows={6} value={form.ingredientsText} onChange={(event) => updateField('ingredientsText', event.target.value)} />
                            <textarea placeholder="Recipe or prep notes" rows={6} value={form.recipe} onChange={(event) => updateField('recipe', event.target.value)} />
                          </div>
                        </details>
                      </>
                    ) : (
                      <div className="muted text-xs">Estimate the item first so you can review the name and macros before saving it to your library.</div>
                    )}
                    {saveError && <div className="muted" style={{ color: 'var(--danger)' }}>{saveError}</div>}
                  </div>
                </section>
              </>
            ) : (
              <div className="tracker-capture-card meal-library-form">
                <div className="meal-library-form-row">
                  <select value={form.kind} onChange={(event) => updateField('kind', event.target.value)}>
                    <option value="FOOD">Food</option>
                    <option value="MEAL">Meal</option>
                  </select>
                  {form.kind === 'MEAL' && (
                    <select value={form.defaultMealType} onChange={(event) => updateField('defaultMealType', event.target.value)}>
                      {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  )}
                </div>
                <input type="text" placeholder="Name" value={form.name} onChange={(event) => updateField('name', event.target.value)} />
                <input type="text" placeholder="Description" value={form.description} onChange={(event) => updateField('description', event.target.value)} />
                <div className="meal-library-form-row meal-library-form-row-metrics">
                  <input type="number" step="1" placeholder="Calories" value={form.calories} onChange={(event) => updateField('calories', event.target.value)} />
                  <input type="number" step="0.01" placeholder="Cost" value={form.costPerServing} onChange={(event) => updateField('costPerServing', event.target.value)} />
                  <input type="number" step="0.1" placeholder="Protein" value={form.protein} onChange={(event) => updateField('protein', event.target.value)} />
                  <input type="number" step="0.1" placeholder="Carbs" value={form.carbs} onChange={(event) => updateField('carbs', event.target.value)} />
                  <input type="number" step="0.1" placeholder="Fat" value={form.fat} onChange={(event) => updateField('fat', event.target.value)} />
                </div>
                <textarea
                  placeholder="Ingredients, one per line"
                  rows={6}
                  value={form.ingredientsText}
                  onChange={(event) => updateField('ingredientsText', event.target.value)}
                />
                <textarea
                  placeholder="Recipe or prep notes"
                  rows={6}
                  value={form.recipe}
                  onChange={(event) => updateField('recipe', event.target.value)}
                />
                {saveError && <div className="muted" style={{ color: 'var(--danger)' }}>{saveError}</div>}
              </div>
            )}
          </div>
          <footer className="modal-foot tracker-modal-foot">
            <button type="button" className="btn btn-ghost" onClick={() => setEditorOpen(false)} disabled={saving}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving || (editorMode === 'create' && !hasEstimateResult)}>
              {saving ? 'Saving…' : editorMode === 'edit' ? 'Save changes' : 'Save item'}
            </button>
          </footer>
        </div>
      </div>

      <div className="modal modal-soft" aria-hidden={!deleteTarget} role="dialog" aria-modal="true" aria-labelledby="mealLibraryDeleteTitle">
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)} />
        <div className="modal-dialog tracker-modal tracker-modal-soft meal-delete-modal">
          <header className="modal-head tracker-modal-head">
            <div>
              <div className="eyebrow">Delete library item</div>
              <h3 id="mealLibraryDeleteTitle">Remove this saved item?</h3>
              <div className="sub">{deleteTarget?.name || 'This item'} will be removed from your meal library.</div>
            </div>
            <button type="button" className="modal-close-icon" onClick={() => setDeleteTarget(null)} aria-label="Close library delete">
              <span aria-hidden="true">✕</span>
            </button>
          </header>
          <div className="modal-body tracker-modal-body">
            <div className="tracker-capture-card">
              <div className="sub">This does not remove any meals you have already logged on past days.</div>
              {deleteError && <div className="muted" style={{ color: 'var(--danger)' }}>{deleteError}</div>}
            </div>
          </div>
          <footer className="modal-foot tracker-modal-foot">
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
            <button type="button" className="btn btn-outline meal-delete-btn" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete item'}
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}
