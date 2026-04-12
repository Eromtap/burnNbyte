export const MEAL_REPEAT_COOLDOWN_DAYS = 14;

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function normalizeMealIdentity({ mealName, mealType, name, type }) {
  const resolvedName = normalizeText(mealName || name);
  const resolvedType = normalizeText(mealType || type);
  return `${resolvedName}::${resolvedType}`;
}

export function buildMealFeedbackMap(feedbackRows = []) {
  return (Array.isArray(feedbackRows) ? feedbackRows : []).reduce((acc, row) => {
    const key = normalizeMealIdentity(row);
    if (!key || acc[key]) return acc;
    acc[key] = {
      feedback: row.feedback,
      mealName: row.mealName,
      mealType: row.mealType || null,
      createdAt: row.createdAt,
    };
    return acc;
  }, {});
}

export function summarizeMealFeedbackForPrompt(feedbackRows = [], { now = new Date(), cooldownDays = MEAL_REPEAT_COOLDOWN_DAYS } = {}) {
  const latestByMeal = [];
  const seen = new Set();
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - cooldownDays);

  for (const row of Array.isArray(feedbackRows) ? feedbackRows : []) {
    const key = normalizeMealIdentity(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    latestByMeal.push(row);
  }

  const toPromptItem = (row) => ({
    mealName: row.mealName,
    mealType: row.mealType || null,
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    calories: row.calories ?? null,
    protein: row.protein ?? null,
    carbs: row.carbs ?? null,
    fat: row.fat ?? null,
    createdAt: row.createdAt?.toISOString?.() || null,
  });

  return {
    dislikedMeals: latestByMeal.filter((row) => row.feedback === "dislike").map(toPromptItem),
    likedMeals: latestByMeal.filter((row) => row.feedback === "like" && row.createdAt < cutoff).map(toPromptItem),
    recentLikedMeals: latestByMeal.filter((row) => row.feedback === "like" && row.createdAt >= cutoff).map(toPromptItem),
  };
}
