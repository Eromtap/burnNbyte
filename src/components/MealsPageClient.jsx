'use client';

import DateStrip from '@/components/DateStrip';
import GenerateMealPlan from '@/components/GenerateMealPlan';
import { sumMealMacros, formatMacro } from '@/lib/macros';
import ReplaceMealButton from '@/components/ReplaceMealButton';
import MealCompletionToggle from '@/components/MealCompletionToggle';
import MealDeleteButton from '@/components/MealDeleteButton';
import { useState } from 'react';
import MobileDisclosure from '@/components/MobileDisclosure';
import MealFeedbackButtons from '@/components/MealFeedbackButtons';
import { normalizeMealIdentity } from '@/lib/mealFeedback';
import AddFoodPanel from '@/components/AddFoodPanel';

function toYMDLocal(d){
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYMDLocal(ymd){
  if (!ymd) return new Date();
  const [y, m, d] = String(ymd).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addDaysLocal(d, n){
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function groupMeals(meals){
  return (Array.isArray(meals) ? meals : []).reduce((acc, meal) => {
    const type = String(meal?.type || '').toLowerCase();
    acc[type] = acc[type] || [];
    acc[type].push(meal);
    return acc;
  }, {});
}

function getInitialOpenMealType(groupedMeals) {
  const orderedTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  const firstIncomplete = orderedTypes.find((type) =>
    (groupedMeals[type] || []).some((meal) => !meal?.isCompleted)
  );
  if (firstIncomplete) return firstIncomplete;

  const firstAvailable = orderedTypes.find((type) => (groupedMeals[type] || []).length > 0);
  return firstAvailable || 'breakfast';
}

function formatCost(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return `$${Number(value).toFixed(2)}`;
}

export default function MealsPageClient({
  profile,
  initialSelectedISO,
  initialMealPlan = null,
  initialMealFeedback = {},
  initialLibraryItems = [],
}){
  const [selectedISO, setSelectedISO] = useState(initialSelectedISO);
  const [mealPlan, setMealPlan] = useState(initialMealPlan);
  const [mealFeedback, setMealFeedback] = useState(initialMealFeedback || {});
  const [loadingDay, setLoadingDay] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [composerType, setComposerType] = useState('snack');
  const [composerSignal, setComposerSignal] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [defaultOpenMealType, setDefaultOpenMealType] = useState(
    getInitialOpenMealType(groupMeals(initialMealPlan?.meals || []))
  );

  const meals = mealPlan?.meals || [];
  const mealMacros = sumMealMacros(meals);
  const grouped = groupMeals(meals);

  function syncUrl(nextISO){
    window.history.replaceState(null, '', `/meals?date=${nextISO}`);
  }

  async function refreshSelectedDay(nextISO = selectedISO){
    setLoadingDay(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/mealPlans?date=${encodeURIComponent(nextISO)}`, {
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load meal plan');
      if (nextISO !== selectedISO) {
        syncUrl(nextISO);
        setSelectedISO(nextISO);
      }
      const nextMealPlan = data?.mealPlan || null;
      setMealPlan(nextMealPlan);
      setMealFeedback(data?.mealFeedback || {});
      setDefaultOpenMealType(getInitialOpenMealType(groupMeals(nextMealPlan?.meals || [])));
    } catch (err) {
      setLoadError(err?.message || 'Failed to load meal plan');
    } finally {
      setLoadingDay(false);
    }
  }

  function handleShiftWeek(direction){
    const shifted = addDaysLocal(parseYMDLocal(selectedISO), direction * 7);
    refreshSelectedDay(toYMDLocal(shifted));
  }

  function openAddFood(type = 'snack') {
    setComposerType(type);
    setComposerSignal((current) => current + 1);
    setComposerOpen(true);
  }

  return (
    <>
      <section className="hero-card page-hero page-hero-compact">
        <div className="page-hero-copy">
          <div className="eyebrow">Meal planning</div>
          <div>
            <h1 className="page-hero-title">Meals</h1>
            <p className="page-hero-text">
              View the day, add what you ate, and swap anything that no longer fits.
            </p>
          </div>
          <div className="meal-page-summary">
            <div className="metric-card meal-summary-card">
              <div className="metric-label">Selected day</div>
              <div className="metric-value">{selectedISO}</div>
              <div className="metric-detail">{mealPlan ? 'Meal plan loaded.' : 'No plan saved yet.'}</div>
            </div>
            <div className="metric-card meal-summary-card">
              <div className="metric-label">Today&apos;s plan</div>
              <div className="metric-value">{mealMacros.calories}<span className="unit">kcal</span></div>
              <div className="metric-detail">{formatMacro(mealMacros.protein)}g protein • {formatMacro(mealMacros.carbs)}g carbs • {formatMacro(mealMacros.fat)}g fat</div>
            </div>
          </div>
          <div className="page-hero-actions meals-page-actions">
            <button type="button" className="btn btn-primary" onClick={() => openAddFood('snack')}>Add food</button>
            <ReplaceMealButton
              dateISO={selectedISO}
              className="btn btn-outline"
              label="Swap meal"
              onReplaced={() => refreshSelectedDay()}
            />
            <GenerateMealPlan
              initialPreferences={profile}
              selectedISO={selectedISO}
              onGenerated={() => refreshSelectedDay()}
            />
          </div>
        </div>
      </section>

      <DateStrip
        basePath="/meals"
        selectedISO={selectedISO}
        onSelectDate={refreshSelectedDay}
        onShiftWeek={handleShiftWeek}
      />

      <section className="section-grid meal-page-layout">
        <article id="planner" className="card span-full meals-stage">
          <header className="card-head">
            <div>
              <h3>Today&apos;s meals</h3>
              <div className="sub">
                {loadingDay ? 'Loading my meals...' : null}
              </div>
            </div>
            {mealPlan && <div className="section-badge section-badge-meal">{meals.length} items</div>}
          </header>
          {loadError && <div className="list-row"><span className="muted">{loadError}</span></div>}
          {!loadError && !mealPlan && !loadingDay && (
            <div className="list-row"><span className="muted">No meal plan for this date yet. Build one to populate this view.</span></div>
          )}
          {mealPlan && (
            <div className="stack">
              <div className="list-row">
                <span>Plan total</span>
                <span className="muted">{mealMacros.calories} kcal • {formatMacro(mealMacros.protein)}g protein • {formatMacro(mealMacros.carbs)}g carbs • {formatMacro(mealMacros.fat)}g fat</span>
              </div>
              <div className="planner">
                {["breakfast", "lunch", "dinner", "snack"].map((type) => (
                  <MobileDisclosure
                    key={type}
                    className="meal-group mobile-disclosure"
                    summaryClassName="mobile-disclosure-summary meal-group-summary"
                    panelClassName="mobile-disclosure-panel"
                    defaultOpenMobile={type === defaultOpenMealType}
                    anchorId={`meal-${type}`}
                    summary={
                      <>
                        <div className="planner-head" style={{ textTransform: 'capitalize' }}>{type}</div>
                        <span className="mobile-disclosure-meta">{(grouped[type] || []).length} item{(grouped[type] || []).length === 1 ? '' : 's'}</span>
                      </>
                    }
                  >
                      {(grouped[type] || []).length ? (
                        grouped[type].map((meal) => (
                          <article key={meal.id} className="card meal-entry">
                            <header className="card-head">
                              <div>
                                <h3>{meal.name}</h3>
                                <div className="sub">{meal.calories ?? 0} kcal • {formatMacro(meal.protein)}g protein • {formatMacro(meal.carbs)}g carbs • {formatMacro(meal.fat)}g fat{formatCost(meal.costPerServing) ? ` • ~${formatCost(meal.costPerServing)}/serving` : ''}</div>
                              </div>
                              <div className="page-hero-actions" style={{ alignItems: 'center' }}>
                                <MealCompletionToggle
                                  mealId={meal.id}
                                  initialCompleted={meal.isCompleted}
                                  className="meal-entry-toggle"
                                  onUpdated={(updatedMeal) => {
                                    if (!updatedMeal) return;
                                    setMealPlan((prev) => {
                                      if (!prev) return prev;
                                      return {
                                        ...prev,
                                        meals: (prev.meals || []).map((mealItem) => (
                                          mealItem.id === updatedMeal.id ? { ...mealItem, ...updatedMeal } : mealItem
                                        )),
                                      };
                                    });
                                  }}
                                />
                                <MealDeleteButton
                                  mealId={meal.id}
                                  mealName={meal.name}
                                  onDeleted={() => refreshSelectedDay()}
                                />
                              </div>
                            </header>
                            <div className="list-row" style={{ justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                              <span className="muted" style={{ fontSize: 12 }}>
                                Teach the planner what to bring back and what to stop suggesting.
                              </span>
                              <MealFeedbackButtons
                                mealId={meal.id}
                                initialFeedback={mealFeedback[normalizeMealIdentity({ mealName: meal.name, mealType: meal.type })]?.feedback || null}
                                onUpdated={(savedFeedback) => {
                                  if (!savedFeedback) return;
                                  const key = normalizeMealIdentity(savedFeedback);
                                  setMealFeedback((prev) => ({
                                    ...prev,
                                    [key]: {
                                      feedback: savedFeedback.feedback,
                                      mealName: savedFeedback.mealName,
                                      mealType: savedFeedback.mealType || null,
                                      createdAt: savedFeedback.createdAt,
                                    },
                                  }));
                                }}
                              />
                            </div>
                            <div className="stack">
                              {Array.isArray(meal.ingredients) && meal.ingredients.length > 0 && (
                                <MobileDisclosure
                                  className="mobile-disclosure detail-disclosure"
                                  summaryClassName="mobile-disclosure-summary detail-disclosure-summary"
                                  panelClassName="mobile-disclosure-panel"
                                  summary={
                                    <>
                                      <span className="planner-head">Ingredients</span>
                                      <span className="mobile-disclosure-meta">{meal.ingredients.length}</span>
                                    </>
                                  }
                                >
                                    <ul className="list">
                                      {meal.ingredients.map((ingredient, index) => (
                                        <li key={index} className="list-row"><span>{ingredient}</span></li>
                                      ))}
                                    </ul>
                                </MobileDisclosure>
                              )}
                              {meal.recipe && (
                                <MobileDisclosure
                                  className="mobile-disclosure detail-disclosure"
                                  summaryClassName="mobile-disclosure-summary detail-disclosure-summary"
                                  panelClassName="mobile-disclosure-panel"
                                  summary={
                                    <>
                                      <span className="planner-head">Recipe</span>
                                      <span className="mobile-disclosure-meta">Steps</span>
                                    </>
                                  }
                                >
                                    <div className="list-row meal-entry-recipe"><span style={{ whiteSpace: 'pre-wrap' }}>{meal.recipe}</span></div>
                                </MobileDisclosure>
                              )}
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="list-row"><span className="muted">No {type} planned.</span></div>
                      )}
                  </MobileDisclosure>
                ))}
              </div>
            </div>
          )}
        </article>
      </section>

      <AddFoodPanel
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        selectedISO={selectedISO}
        initialType={composerType}
        typeSignal={composerSignal}
        initialLibraryItems={initialLibraryItems}
        onSaved={async () => {
          await refreshSelectedDay();
          setComposerOpen(false);
        }}
      />
    </>
  );
}
