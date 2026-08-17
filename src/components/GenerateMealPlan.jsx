'use client';

import { useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { deriveNutritionTargets } from '@/lib/nutritionTargets';
import OperationFeedback from '@/components/OperationFeedback';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

const SOURCE_OPTIONS = [
  { id: 'standard', label: 'Planner suggestions' },
  { id: 'pantry', label: 'Pantry / fridge assisted' },
];

function parseYMDLocal(ymd) {
  const [year, month, day] = String(ymd || '').split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function toYMDLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysLocal(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeekLocal(date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export default function GenerateMealPlan({
  initialPreferences = null,
  selectedISO,
  hasMealPlan = false,
  onGenerated,
}) {
  const { data: session, update } = useSession();
  const pantryCameraRef = useRef(null);
  const pantryLibraryRef = useRef(null);
  const anchorISO = selectedISO || toYMDLocal(new Date());
  const plannerStartDate = useMemo(
    () => startOfWeekLocal(parseYMDLocal(anchorISO)),
    [anchorISO]
  );
  const plannerStartISO = toYMDLocal(plannerStartDate);
  const plannerDateOptions = useMemo(
    () => Array.from({ length: 14 }, (_, index) => toYMDLocal(addDaysLocal(plannerStartDate, index))),
    [plannerStartDate]
  );
  const dayPlannerDateOptions = useMemo(
    () => Array.from({ length: 14 }, (_, index) => toYMDLocal(addDaysLocal(parseYMDLocal(anchorISO), index))),
    [anchorISO]
  );
  const plannerWeekDates = useMemo(
    () => plannerDateOptions.slice(0, 7),
    [plannerDateOptions]
  );
  const [open, setOpen] = useState(false);
  const [planningScope, setPlanningScope] = useState('week');
  const [sourceMode, setSourceMode] = useState('standard');
  const [selectedDates, setSelectedDates] = useState(plannerWeekDates);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pantryFiles, setPantryFiles] = useState([]);
  const [sourcingMode, setSourcingMode] = useState('pantry_plus_groceries');
  const activeDateOptions = planningScope === 'day' ? dayPlannerDateOptions : plannerDateOptions;

  const selectedLabel = new Date(`${plannerStartISO}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  function openPlanner(scope) {
    setPlanningScope(scope);
    setSelectedDates(scope === 'day' ? [anchorISO] : plannerWeekDates);
    setError('');
    setOpen(true);
  }

  function toggleDate(dateISO) {
    setSelectedDates((current) => (
      current.includes(dateISO)
        ? current.filter((item) => item !== dateISO)
        : activeDateOptions.filter((item) => current.includes(item) || item === dateISO)
    ));
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

  function resetState() {
    setSourceMode('standard');
    setSelectedDates(planningScope === 'day' ? [anchorISO] : plannerWeekDates);
    setLoading(false);
    setError('');
    setPantryFiles([]);
    setSourcingMode('pantry_plus_groceries');
  }

  async function handleGenerate() {
    setLoading(true);
    setError('');

    try {
      if (!selectedDates.length) {
        throw new Error('Select at least one day in the two-week window.');
      }

      if (sourceMode === 'standard') {
        let prefs = session?.user?.preferences || initialPreferences || {};
        if (!Object.keys(prefs).length) {
          try {
            const fresh = await update();
            prefs = fresh?.user?.preferences || prefs;
          } catch {}
        }
        const targets = deriveNutritionTargets(prefs);
        const goalList = Array.isArray(prefs.fitnessGoals)
          ? prefs.fitnessGoals
          : (prefs.fitnessGoal ? [prefs.fitnessGoal] : []);

        const res = await fetchWithTimeout('/api/generateMealPlan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gender: prefs.gender,
            heightFt: prefs.heightFt,
            heightIn: prefs.heightIn,
            weight: prefs.weight,
            activityLevel: prefs.activityLevel,
            fitnessGoal: prefs.fitnessGoal || goalList[0],
            fitnessGoals: goalList,
            mealsPerDay: prefs.mealsPerDay || 3,
            macroTargetMode: prefs.macroTargetMode || targets.mode || 'grams',
            calorieTarget: targets.calories,
            proteinTarget: targets.protein,
            carbsTarget: targets.carbs,
            fatTarget: targets.fat,
            proteinPctTarget: targets.proteinPct,
            carbsPctTarget: targets.carbsPct,
            fatPctTarget: targets.fatPct,
            dietaryPreferences: prefs.dietaryPreferences || [],
            dislikedFoods: prefs.dislikedFoods || [],
            mealPrepMode: Boolean(prefs.mealPrepMode),
            allergies: prefs.allergies || [],
            targetDates: selectedDates,
          }),
        }, 150000);

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to generate meal plan.');
        if (typeof onGenerated === 'function') {
          await onGenerated({
            ...data,
            startDate: selectedDates[0],
            endDate: selectedDates[selectedDates.length - 1],
            targetDates: selectedDates,
          });
        }
      } else {
        if (!pantryFiles.length) {
          throw new Error('Add 1-3 pantry or fridge photos first.');
        }
        const formData = new FormData();
        pantryFiles.slice(0, 3).forEach((file) => formData.append('photos', file));
        selectedDates.forEach((dateISO) => formData.append('targetDates', dateISO));
        formData.append('sourcingMode', sourcingMode);
        formData.append('unitSystem', 'imperial');

        const res = await fetchWithTimeout('/api/pantry/generateMealPlan', {
          method: 'POST',
          body: formData,
        }, 180000);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (data?.code === 'moderation_blocked') {
            throw new Error('Image blocked by content safety checks. Please upload pantry or fridge photos.');
          }
          throw new Error(data?.error || 'Failed to generate pantry or fridge meal plan.');
        }
        if (typeof onGenerated === 'function') {
          await onGenerated({
            ...data,
            startDate: selectedDates[0],
            endDate: selectedDates[selectedDates.length - 1],
            targetDates: selectedDates,
          });
        }
      }

      setOpen(false);
      resetState();
    } catch (err) {
      setError(
        err?.name === 'TimeoutError'
          ? 'Meal generation took longer than expected and was stopped. Try fewer days or retry the request.'
          : (err.message || 'Failed to generate meal plan.')
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-hero-actions meal-plan-scope-actions">
        <button type="button" className="btn btn-secondary" onClick={() => openPlanner('week')}>
          {hasMealPlan ? 'Regenerate week' : 'Plan this week'}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => openPlanner('day')}>
          {hasMealPlan ? 'Regenerate this day' : 'Plan this day'}
        </button>
      </div>

      <div className="modal" aria-hidden={!open} role="dialog" aria-modal="true" aria-labelledby="generateMealPlanTitle">
        <div className="modal-backdrop" onClick={() => { if (!loading) setOpen(false); }} />
        <div className="modal-dialog tracker-modal tracker-modal-soft">
          <header className="modal-head tracker-modal-head">
            <div>
              <div className="eyebrow">Meal planner</div>
              <h3 id="generateMealPlanTitle">{planningScope === 'day' ? 'Plan this day' : 'Plan this week'}</h3>
              <div className="sub">
                {planningScope === 'day'
                  ? `Build meals for ${anchorISO}. Add other days from the next two weeks if you want to expand the plan.`
                  : `Build the selected calendar week starting ${selectedLabel}. You can also choose dates from the following week.`}
              </div>
            </div>
            <button type="button" className="modal-close-icon" onClick={() => setOpen(false)} aria-label="Close meal planner" disabled={loading}>
              <span aria-hidden="true">✕</span>
            </button>
          </header>

          <div className="modal-body tracker-modal-body">
            <OperationFeedback
              active={loading}
              title={sourceMode === 'pantry' ? 'Reading your pantry and building meals' : 'Building your meal plan'}
              steps={['Checking nutrition targets', 'Choosing meals for each day', 'Balancing calories and macros', 'Saving meals to your plan']}
              timeoutSeconds={sourceMode === 'pantry' ? 180 : 150}
            />
            <section className="tracker-section">
              <div className="tracker-label-row">
                <span className="planner-head">Which days? <span className="muted text-xs">{planningScope === 'day' ? 'Next 14 days' : 'This week + next week'}</span></span>
                <span className="muted text-xs">{selectedDates.length} of 14 selected</span>
              </div>
              <div className="planner-date-strip-scroll">
                {activeDateOptions.map((dateISO) => {
                  const active = selectedDates.includes(dateISO);
                  const date = new Date(`${dateISO}T00:00:00`);
                  const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
                  const dayNumber = date.toLocaleDateString(undefined, { day: 'numeric' });
                  return (
                    <button
                      key={dateISO}
                      type="button"
                      className={`planner-date-pill${active ? ' planner-date-pill-active' : ''}`}
                      onClick={() => toggleDate(dateISO)}
                      aria-pressed={active}
                    >
                      <span className="dow">{weekday}</span>
                      <span className="dom">{dayNumber}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="tracker-section">
              <div className="planner-head">What should this plan use?</div>
              <div className="tracker-mode-grid">
                {SOURCE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`exercise-pill ${sourceMode === option.id ? 'exercise-pill-active' : ''}`}
                    onClick={() => setSourceMode(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="muted text-xs">
                Both options still use your saved calorie, macro, and food preferences. Pantry / fridge assisted also looks at your uploaded photos.
              </div>
            </section>

            {sourceMode === 'pantry' && (
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

                  <div className="tracker-label-row">
                    <span className="muted">Source ingredients</span>
                    <select value={sourcingMode} onChange={(e) => setSourcingMode(e.target.value)} style={{ minWidth: 200 }}>
                      <option value="pantry_plus_groceries">What I have + groceries</option>
                      <option value="pantry_only">Just what I have</option>
                    </select>
                  </div>
                  <div className="muted text-xs">
                    {sourcingMode === 'pantry_only'
                      ? 'Just what I have keeps the plan constrained to visible pantry or fridge items, plus only minimal staples when necessary.'
                      : 'What I have + groceries starts with visible pantry or fridge items and lets the planner round out meals with realistic shopping.'}
                  </div>
                </div>
              </section>
            )}

            {error && <div className="muted" style={{ color: 'var(--danger)' }}>{error}</div>}
          </div>

          <footer className="modal-foot tracker-modal-foot">
            <button type="button" className="btn btn-ghost" onClick={resetState} disabled={loading}>Reset</button>
            <button type="button" className="btn btn-primary" disabled={loading} onClick={handleGenerate}>
              {loading ? 'Generating…' : `Generate ${selectedDates.length} ${selectedDates.length === 1 ? 'day' : 'days'}`}
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}
