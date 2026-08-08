'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReplaceMealButton from '@/components/ReplaceMealButton';
import MealCompletionToggle from '@/components/MealCompletionToggle';
import MealDeleteButton from '@/components/MealDeleteButton';
import MobileDisclosure from '@/components/MobileDisclosure';
import AddFoodPanel from '@/components/AddFoodPanel';
import { formatMacro } from '@/lib/macros';
import { deriveNutritionTargets } from '@/lib/nutritionTargets';

function groupMeals(meals) {
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

export default function HomeMealsCard({
  todayISO,
  isToday = true,
  profile = null,
  initialMealPlan = null,
  initialLibraryItems = [],
}) {
  const router = useRouter();
  const [mealPlan, setMealPlan] = useState(initialMealPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState('snack');
  const [composerSignal, setComposerSignal] = useState(0);
  const [refreshPending, startRefreshTransition] = useTransition();

  const grouped = groupMeals(mealPlan?.meals || []);
  const initialOpenMealType = getInitialOpenMealType(grouped);
  const macroTargets = deriveNutritionTargets(profile || {});

  useEffect(() => {
    setMealPlan(initialMealPlan);
  }, [initialMealPlan]);

  async function refreshMeals() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/mealPlans?date=${encodeURIComponent(todayISO)}`, {
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load today’s meals.');
      setMealPlan(data?.mealPlan || null);
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
              <h3>{isToday ? "What I'm eating today" : "Meals for this day"}</h3>
              <div className="sub">Log food, swap a meal block, or delete something without leaving home. Daily target: {formatMacro(macroTargets.calories)} kcal • {formatMacro(macroTargets.protein)}P • {formatMacro(macroTargets.carbs)}C • {formatMacro(macroTargets.fat)}F.</div>
            </div>
            <div className="page-hero-actions home-meals-actions">
              <button type="button" className="btn btn-primary" onClick={() => openAddFood('snack')}>
                Add food
              </button>
              <ReplaceMealButton
                dateISO={todayISO}
                className="btn btn-outline"
                label="Swap meal"
                onReplaced={syncDashboard}
              />
              <Link href={`/meals?date=${todayISO}`} className="btn btn-secondary">Meal page</Link>
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
                defaultOpenMobile={type === initialOpenMealType}
                summary={
                  <>
                    <span className="planner-head" style={{ textTransform: 'capitalize' }}>{type}</span>
                    <span className="mobile-disclosure-meta">{(grouped[type] || []).length} item{(grouped[type] || []).length === 1 ? '' : 's'}</span>
                  </>
                }
              >
                {(grouped[type] || []).length ? (
                  (grouped[type] || []).map((meal) => (
                    <div key={meal.id} className="list-row brand-feed-row">
                      <Link href={`/meals?date=${todayISO}#meal-${type}`} className="brand-feed-link">
                        <strong>{meal.name}</strong>
                        <div className="muted brand-feed-meta">
                          {meal.calories ?? 0} kcal • {formatMacro(meal.protein)}g protein • {formatMacro(meal.carbs)}g carbs • {formatMacro(meal.fat)}g fat{formatCost(meal.costPerServing) ? ` • ~${formatCost(meal.costPerServing)}/serving` : ''}
                        </div>
                      </Link>
                      <div className="home-meal-row-actions">
                        <MealCompletionToggle
                          mealId={meal.id}
                          initialCompleted={meal.isCompleted}
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
                            startRefreshTransition(() => {
                              router.refresh();
                            });
                          }}
                        />
                        <MealDeleteButton mealId={meal.id} mealName={meal.name} onDeleted={syncDashboard} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="list-row brand-feed-row brand-feed-empty-row">
                    <span className="muted">No {type} planned.</span>
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
