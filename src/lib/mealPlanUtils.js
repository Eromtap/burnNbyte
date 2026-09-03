export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

export function toUTCDateFromLocalYMD(ymd) {
  const [year, month, day] = String(ymd || "").split("-").map(Number);
  return new Date(Date.UTC(year || 0, (month || 1) - 1, day || 1));
}

export function isMealType(value) {
  return MEAL_TYPES.includes(String(value || "").toLowerCase());
}

export function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toNullableFloat(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toNullableInt(value) {
  const parsed = toNullableFloat(value);
  return parsed == null ? null : Math.round(parsed);
}

export function buildMealPlanTitle(dateISO) {
  return `Meals for ${String(dateISO || "").slice(0, 10)}`;
}

export async function ensureMealPlanForDate(tx, { userId, dateISO }) {
  const date = toUTCDateFromLocalYMD(dateISO);
  let mealPlan = await tx.mealPlan.findFirst({
    where: { userId, date },
    include: { meals: true },
  });

  if (!mealPlan) {
    mealPlan = await tx.mealPlan.create({
      data: {
        userId,
        title: buildMealPlanTitle(dateISO),
        date,
      },
      include: { meals: true },
    });
  }

  return mealPlan;
}

export async function refreshMealPlanCalories(tx, mealPlanId) {
  const totals = await tx.meal.aggregate({
    where: { mealPlanId },
    _sum: { calories: true },
  });

  return tx.mealPlan.update({
    where: { id: mealPlanId },
    data: { totalCalories: totals?._sum?.calories ?? null },
  });
}

export function sanitizeMealPayload(input = {}) {
  const type = String(input.type || "").toLowerCase();

  if (!isMealType(type)) {
    throw new Error("Choose breakfast, lunch, dinner, or snack.");
  }

  const name = String(input.name || "").trim();
  if (!name) {
    throw new Error("Add a name before saving.");
  }

  return {
    name,
    type,
    calories: toNullableInt(input.calories),
    costPerServing: toNullableFloat(input.costPerServing),
    protein: toNullableFloat(input.protein),
    carbs: toNullableFloat(input.carbs),
    fat: toNullableFloat(input.fat),
    ingredients: normalizeStringList(input.ingredients).slice(0, 24),
    recipe: String(input.recipe || "").trim(),
    recipeYield: (() => {
      const value = toNullableInt(input.recipeYield);
      // A manually logged food is one serving unless a recipe yield is supplied.
      // This also keeps the value valid for databases that enforce a recipe yield.
      return value == null ? 1 : Math.max(1, value);
    })(),
  };
}
