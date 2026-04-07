'use client';

import DateStrip from '@/components/DateStrip';
import GenerateMealPlan from '@/components/GenerateMealPlan';
import MealsReplacerSingle from '@/components/MealsReplacerSingle';
import { sumMealMacros, formatMacro } from '@/lib/macros';
import MealPhotoReplace from '@/components/MealPhotoReplace';
import ReplaceMealButton from '@/components/ReplaceMealButton';
import MealCompletionToggle from '@/components/MealCompletionToggle';
import { useState } from 'react';
import MobileDisclosure from '@/components/MobileDisclosure';

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

export default function MealsPageClient({
  profile,
  initialSelectedISO,
  initialMealPlan = null,
}){
  const [selectedISO, setSelectedISO] = useState(initialSelectedISO);
  const [mealPlan, setMealPlan] = useState(initialMealPlan);
  const [loadingDay, setLoadingDay] = useState(false);
  const [loadError, setLoadError] = useState(null);

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
      setMealPlan(data?.mealPlan || null);
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

  return (
    <>
      <section className="hero-card page-hero">
        <div className="page-hero-copy">
          <div className="eyebrow">Meal planning</div>
          <div>
            <h1 className="page-hero-title">A nutrition plan that feels organized, not stitched together.</h1>
            <p className="page-hero-text">
              Generate a full day, swap specific meals, and pull in photo-based replacements without losing sight of your daily macro totals.
            </p>
          </div>
          <div className="page-hero-actions">
            <a href="#planner" className="btn btn-primary">Open planner</a>
            <a href="#replace" className="btn btn-outline">Replace a meal</a>
          </div>
        </div>
        <aside className="hero-panel hero-metrics">
          <div className="metric-card">
            <div className="metric-label">Selected day</div>
            <div className="metric-value">{selectedISO}</div>
            <div className="metric-detail">{mealPlan ? 'Meal plan loaded.' : 'No plan saved yet.'}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Today&apos;s plan</div>
            <div className="metric-value">{mealMacros.calories}<span className="unit">kcal</span></div>
            <div className="metric-detail">{formatMacro(mealMacros.protein)}g protein • {formatMacro(mealMacros.carbs)}g carbs • {formatMacro(mealMacros.fat)}g fat</div>
          </div>
        </aside>
      </section>

      <DateStrip
        basePath="/meals"
        selectedISO={selectedISO}
        onSelectDate={refreshSelectedDay}
        onShiftWeek={handleShiftWeek}
      />

      <section className="section-grid">
        <article className="card section-side">
          <header className="card-head">
            <div>
              <h3>Plan my meals</h3>
              <div className="sub">Create and save the plan for the selected date.</div>
            </div>
          </header>
          <GenerateMealPlan
            initialPreferences={profile}
            selectedISO={selectedISO}
            onGenerated={() => refreshSelectedDay()}
          />
          <div className="page-hero-actions" style={{ marginTop: 12 }}>
            <a className="btn btn-secondary" href="/pantry">Use pantry photo</a>
          </div>
        </article>

        <article id="planner" className="card section-main">
          <header className="card-head">
            <div>
              <h3>Today&apos;s meals</h3>
              <div className="sub">
                {loadingDay ? 'Loading my meals...' : 'Browse each meal block and swap anything that does not fit the day.'}
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
                    defaultOpenMobile={type === 'breakfast'}
                    summary={
                      <>
                        <div className="planner-head" style={{ textTransform: 'capitalize' }}>{type}</div>
                        <span className="mobile-disclosure-meta">{(grouped[type] || []).length} item{(grouped[type] || []).length === 1 ? '' : 's'}</span>
                      </>
                    }
                  >
                      <div className="planner-col-row meal-group-head">
                        <div className="planner-head" style={{ textTransform: 'capitalize' }}>{type}</div>
                        <ReplaceMealButton
                          dateISO={selectedISO}
                          type={type}
                          className="btn btn-secondary"
                          label="Swap it"
                          onReplaced={() => refreshSelectedDay()}
                        />
                      </div>
                      {(grouped[type] || []).length ? (
                        grouped[type].map((meal) => (
                          <article key={meal.id} className="card meal-entry">
                            <header className="card-head">
                              <div>
                                <h3>{meal.name}</h3>
                                <div className="sub">{meal.calories ?? 0} kcal • {formatMacro(meal.protein)}g protein • {formatMacro(meal.carbs)}g carbs • {formatMacro(meal.fat)}g fat</div>
                              </div>
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
                            </header>
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

      <section className="section-grid">
        <article id="replace" className="card section-side">
          <header className="card-head">
            <div>
              <h3>Swap one meal</h3>
              <div className="sub">Change one meal on the selected date.</div>
            </div>
          </header>
          <MealsReplacerSingle selectedISO={selectedISO} onReplaced={() => refreshSelectedDay()} />
        </article>

        <article className="card section-main">
          <header className="card-head">
            <div>
              <h3>Swap from a photo</h3>
              <div className="sub">Upload a meal photo, estimate macros, and drop it into the plan.</div>
            </div>
          </header>
          <MealPhotoReplace selectedISO={selectedISO} onReplaced={() => refreshSelectedDay()} />
        </article>
      </section>
    </>
  );
}
