// Aggregate macros for a set of meals (calories, protein, carbs, fat)
export function sumMealMacros(meals = []) {
  return (Array.isArray(meals) ? meals : []).reduce(
    (totals, meal) => ({
      calories: totals.calories + (Number(meal?.calories) || 0),
      protein: totals.protein + (Number(meal?.protein) || 0),
      carbs: totals.carbs + (Number(meal?.carbs) || 0),
      fat: totals.fat + (Number(meal?.fat) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

// Format macros with a single decimal when needed
export function formatMacro(value) {
  const numeric = Number(value) || 0;
  return Number.isInteger(numeric) ? numeric : Math.round(numeric * 10) / 10;
}
