'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FoodLogCompletionToggle from '@/components/FoodLogCompletionToggle';
import MealCompletionToggle from '@/components/MealCompletionToggle';
import MealDeleteButton from '@/components/MealDeleteButton';
import MobileDisclosure from '@/components/MobileDisclosure';
import AddFoodPanel from '@/components/AddFoodPanel';
import ReplaceMealButton from '@/components/ReplaceMealButton';
import { formatMacro, portionGuidance, scaledMealValue } from '@/lib/macros';
import { deriveNutritionTargets } from '@/lib/nutritionTargets';

function groupMeals(meals) {
  return (Array.isArray(meals) ? meals : []).reduce((acc, meal) => {
    const type = String(meal?.type || '').toLowerCase();
    acc[type] = acc[type] || [];
    acc[type].push(meal);
    return acc;
  }, {});
}

function formatCost(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return `$${Number(value).toFixed(2)}`;
}

function servingGuidance(meal) {
  const yieldCount = Number(meal?.recipeYield);
  return Number.isFinite(yieldCount) && yieldCount >= 1
    ? `Makes ${yieldCount} serving${yieldCount === 1 ? '' : 's'} • nutrition per serving`
    : 'Serving yield needs review • nutrition per serving';
}

export default function HomeMealsCard({
  todayISO,
  isToday = true,
  profile = null,
  macroTargets: suppliedMacroTargets = null,
  initialMealPlan = null,
  initialFoodLogs = [],
  initialLibraryItems = [],
}) {
  const router = useRouter();
  const [mealPlan, setMealPlan] = useState(initialMealPlan);
  const [foodLogs, setFoodLogs] = useState(initialFoodLogs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState('snack');
  const [composerSignal, setComposerSignal] = useState(0);
  const [refreshPending, startRefreshTransition] = useTransition();

  const grouped = groupMeals(mealPlan?.meals || []);
  const groupedLogs = groupMeals(foodLogs || []);
  const macroTargets = suppliedMacroTargets || deriveNutritionTargets(profile || {});

  useEffect(() => {
    setMealPlan(initialMealPlan);
  }, [initialMealPlan]);
  useEffect(() => { setFoodLogs(initialFoodLogs); }, [initialFoodLogs]);

  async function refreshMeals() {
    setLoading(true);
    setError('');
    try {
      const [planRes, logRes] = await Promise.all([
        fetch(`/api/mealPlans?date=${encodeURIComponent(todayISO)}`, { credentials: 'same-origin' }),
        fetch(`/api/foodLogs?date=${encodeURIComponent(todayISO)}`, { credentials: 'same-origin' }),
      ]);
      const [planData, logData] = await Promise.all([planRes.json().catch(() => ({})), logRes.json().catch(() => ({}))]);
      if (!planRes.ok || !logRes.ok) throw new Error(planData?.error || logData?.error || 'Failed to load today’s food.');
      setMealPlan(planData?.mealPlan || null);
      setFoodLogs(logData?.entries || []);
    } catch (err) {
      setError(err?.message || 'Failed to load today’s meals.');
    } finally {
      setLoading(false);
    }
  }

  async function syncDashboard() {
    await refreshMeals();
    startRefreshTransition(() => {
      router.refresh();
    });
  }

  function openAddFood(type = 'snack') {
    setComposerType(type);
    setComposerSignal((current) => current + 1);
    setComposerOpen(true);
  }

  return (
    <>
      <article className="card span-2 brand-feed-card">
          <header className="card-head">
            <div>
              <h3>{isToday ? "Today’s meals" : "Meals for this day"}</h3>
              <div className="sub">Planned meals and food you log today, in one place. Daily target: {formatMacro(macroTargets.calories)} kcal • {formatMacro(macroTargets.protein)}P • {formatMacro(macroTargets.carbs)}C • {formatMacro(macroTargets.fat)}F{macroTargets.source === 'cheat-adjusted' ? ' • cheat-plan adjusted' : ''}.</div>
            </div>
            <div className="page-hero-actions home-meals-actions">
              <button type="button" className="btn btn-primary" onClick={() => openAddFood('snack')}>
                Add food
              </button>
            </div>
          </header>
          {error && <div className="list-row"><span className="muted" style={{ color: 'var(--danger)' }}>{error}</span></div>}
          <div className="planner brand-feed-grid">
            {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
              <MobileDisclosure
                key={type}
                className="brand-feed-item mobile-disclosure"
                summaryClassName="mobile-disclosure-summary brand-feed-item-summary"
                panelClassName="mobile-disclosure-panel"
                defaultOpenMobile={false}
                summary={
                  <>
                    <span className="planner-head" style={{ textTransform: 'capitalize' }}>{type}</span>
                    <span className="mobile-disclosure-meta">{(grouped[type] || []).length + (groupedLogs[type] || []).length} item{(grouped[type] || []).length + (groupedLogs[type] || []).length === 1 ? '' : 's'}</span>
                  </>
                }
              >
                {[...(grouped[type] || []).map((meal) => ({ ...meal, entrySource: 'plan' })), ...(groupedLogs[type] || []).map((meal) => ({ ...meal, entrySource: 'log' }))].length ? (
                  [...(grouped[type] || []).map((meal) => ({ ...meal, entrySource: 'plan' })), ...(groupedLogs[type] || []).map((meal) => ({ ...meal, entrySource: 'log' }))].map((meal) => (
                    <div key={meal.id} className="list-row brand-feed-row">
                      <Link href={meal.entrySource === 'plan' ? `/meals?date=${todayISO}#meal-${type}` : '#'} className="brand-feed-link">
                        <strong>{meal.name}</strong>
                        <div className="muted brand-feed-meta">
                          {formatMacro(scaledMealValue(meal, 'calories'))} kcal • {formatMacro(scaledMealValue(meal, 'protein'))}g protein • {formatMacro(scaledMealValue(meal, 'carbs'))}g carbs • {formatMacro(scaledMealValue(meal, 'fat'))}g fat{formatCost(meal.costPerServing) ? ` • ~${formatCost(meal.costPerServing)}/serving` : ''}
                          {meal.entrySource === 'plan' && <div className="meal-serving-guidance">{servingGuidance(meal)}</div>}
                          {meal.entrySource === 'plan' && portionGuidance(meal) && <div className="meal-portion-guidance">{portionGuidance(meal)}</div>}
                        </div>
                      </Link>
                      <div className="home-meal-row-actions">
                        {meal.entrySource === 'plan' ? <>
                          <MealCompletionToggle
                            mealId={meal.id}
                            initialCompleted={meal.isCompleted}
                            onUpdated={syncDashboard}
                          />
                          {isToday && (
                            <>
                              <ReplaceMealButton
                                dateISO={todayISO}
                                type={type}
                                label="Swap"
                                className="btn btn-secondary"
                                allowGroceryList={false}
                                defaultIncludeInGroceries={false}
                                onReplaced={syncDashboard}
                              />
                              <MealDeleteButton
                                mealId={meal.id}
                                mealName={meal.name}
                                onDeleted={syncDashboard}
                              />
                            </>
                          )}
                        </> : <FoodLogCompletionToggle
                          entryId={meal.id}
                          initialCompleted={meal.isCompleted}
                          onUpdated={(updatedMeal) => {
                            if (!updatedMeal) return;
                            setFoodLogs((current) => current.map((entry) => entry.id === updatedMeal.id ? { ...entry, ...updatedMeal } : entry));
                            startRefreshTransition(() => {
                              router.refresh();
                            });
                          }}
                        />}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="list-row brand-feed-row brand-feed-empty-row">
                    <span className="muted">Nothing planned or logged for {type}.</span>
                    <button type="button" className="btn btn-outline" onClick={() => openAddFood(type)}>
                      Add {type}
                    </button>
                  </div>
                )}
              </MobileDisclosure>
            ))}
          </div>
          {(loading || refreshPending) && <div className="sub">Refreshing today&apos;s meals…</div>}
      </article>

      <AddFoodPanel
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        selectedISO={todayISO}
        initialType={composerType}
        typeSignal={composerSignal}
        initialLibraryItems={initialLibraryItems}
        onSaved={async () => {
          setComposerOpen(false);
          await syncDashboard();
        }}
      />
    </>
  );
}
