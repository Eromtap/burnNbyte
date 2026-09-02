export function mealPortionMultiplier(meal) {
  const multiplier = Number(meal?.portionMultiplier);
  return Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
}

export function scaledMealValue(meal, field) {
  return (Number(meal?.[field]) || 0) * mealPortionMultiplier(meal);
}

export function portionGuidance(meal) {
  const multiplier = mealPortionMultiplier(meal);
  if (multiplier >= 0.995) return null;
  const percent = Math.round(multiplier * 100);
  const servings = Math.round(multiplier * 20) / 20;
  return `Cheat-plan portion: eat about ${percent}% of the planned serving (${servings} serving).`;
}

// Aggregate macros for a set of meals (calories, protein, carbs, fat), including
// any explicit portion adjustment without changing the original recipe values.
export function sumMealMacros(meals = []) {
  return (Array.isArray(meals) ? meals : []).reduce(
    (totals, meal) => ({
      calories: totals.calories + scaledMealValue(meal, 'calories'),
      protein: totals.protein + scaledMealValue(meal, 'protein'),
      carbs: totals.carbs + scaledMealValue(meal, 'carbs'),
      fat: totals.fat + scaledMealValue(meal, 'fat'),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

// Format macros with a single decimal when needed
export function formatMacro(value) {
  const numeric = Number(value) || 0;
  return Number.isInteger(numeric) ? numeric : Math.round(numeric * 10) / 10;
}
