'use client';

import { useState } from 'react';

export default function SaveMealToLibraryButton({ meal }) {
  const [status, setStatus] = useState('idle');

  async function handleSave() {
    if (!meal || status === 'saving' || status === 'saved') return;

    setStatus('saving');
    try {
      const res = await fetch('/api/mealLibrary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'MEAL',
          name: meal.name,
          defaultMealType: meal.type,
          calories: meal.calories,
          costPerServing: meal.costPerServing,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          ingredients: meal.ingredients || [],
          recipe: meal.recipe || '',
        }),
      });
      if (!res.ok) throw new Error('Failed to save meal');
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }

  const label = status === 'saving'
    ? 'Saving…'
    : status === 'saved'
      ? 'Saved to library'
      : status === 'error'
        ? 'Try again'
        : 'Save recipe';

  return (
    <button
      type="button"
      className={`btn btn-ghost meal-library-save${status === 'saved' ? ' meal-library-save-done' : ''}`}
      onClick={handleSave}
      disabled={status === 'saving' || status === 'saved'}
    >
      {label}
    </button>
  );
}
