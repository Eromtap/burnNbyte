const ACTIVITY_MULTIPLIERS = {
  sedentary: 12,
  light: 13,
  moderate: 14,
  active: 15,
  'very active': 16,
};

const GOAL_PRESETS = {
  fat_loss: { proteinPerLb: 1.0, fatPerLb: 0.3, minProtein: 180, minFat: 60, minCarbs: 160, calorieAdjustment: -250 },
  muscle_gain: { proteinPerLb: 0.9, fatPerLb: 0.35, minProtein: 180, minFat: 70, minCarbs: 240, calorieAdjustment: 250 },
  general_fitness: { proteinPerLb: 0.8, fatPerLb: 0.35, minProtein: 160, minFat: 65, minCarbs: 220, calorieAdjustment: 0 },
  run_5k_10k: { proteinPerLb: 0.75, fatPerLb: 0.3, minProtein: 150, minFat: 60, minCarbs: 260, calorieAdjustment: 150 },
  half_marathon: { proteinPerLb: 0.75, fatPerLb: 0.3, minProtein: 150, minFat: 60, minCarbs: 300, calorieAdjustment: 250 },
  marathon: { proteinPerLb: 0.75, fatPerLb: 0.3, minProtein: 155, minFat: 60, minCarbs: 340, calorieAdjustment: 350 },
  cycling_event: { proteinPerLb: 0.75, fatPerLb: 0.3, minProtein: 150, minFat: 60, minCarbs: 320, calorieAdjustment: 300 },
  triathlon: { proteinPerLb: 0.8, fatPerLb: 0.3, minProtein: 160, minFat: 60, minCarbs: 320, calorieAdjustment: 325 },
  powerlifting_meet: { proteinPerLb: 0.95, fatPerLb: 0.35, minProtein: 185, minFat: 70, minCarbs: 220, calorieAdjustment: 200 },
  weightlifting_meet: { proteinPerLb: 0.9, fatPerLb: 0.35, minProtein: 180, minFat: 70, minCarbs: 220, calorieAdjustment: 150 },
  mobility_return: { proteinPerLb: 0.8, fatPerLb: 0.35, minProtein: 155, minFat: 65, minCarbs: 170, calorieAdjustment: -150 },
};

export function getMinimumSafeCalories(gender) {
  const normalized = String(gender || '').toLowerCase();
  if (normalized === 'male') return 1500;
  if (normalized === 'female') return 1200;
  return 1200;
}

function normalizeNumber(value) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundToWhole(value, minimum = 0) {
  return Math.max(minimum, Math.round(value));
}

function percentagesFromCalories({ calories, protein, carbs, fat }) {
  const proteinPct = Math.round(((protein * 4) / calories) * 100);
  const carbsPct = Math.round(((carbs * 4) / calories) * 100);
  const fatPct = Math.max(0, 100 - proteinPct - carbsPct);
  return { proteinPct, carbsPct, fatPct };
}

export function derivePercentageTargets(profile = {}) {
  const derived = deriveNutritionTargets({ ...profile, macroTargetMode: 'grams' });
  const explicitProteinPct = normalizeNumber(profile.proteinPctTarget);
  const explicitCarbsPct = normalizeNumber(profile.carbsPctTarget);
  const explicitFatPct = normalizeNumber(profile.fatPctTarget);
  const explicitCalories = normalizeNumber(profile.calorieTarget);
  const mode = String(profile.macroTargetMode || 'grams');

  if (
    mode === 'percentages' &&
    explicitCalories != null &&
    explicitProteinPct != null &&
    explicitCarbsPct != null &&
    explicitFatPct != null
  ) {
    return {
      calories: explicitCalories,
      proteinPct: explicitProteinPct,
      carbsPct: explicitCarbsPct,
      fatPct: explicitFatPct,
      source: 'explicit',
    };
  }

  return {
    calories: derived.calories,
    ...percentagesFromCalories(derived),
    source: 'derived',
  };
}

export function deriveNutritionTargets(profile = {}) {
  const mode = String(profile.macroTargetMode || 'grams');
  const explicitCalories = normalizeNumber(profile.calorieTarget);
  const explicitProtein = normalizeNumber(profile.proteinTarget);
  const explicitCarbs = normalizeNumber(profile.carbsTarget);
  const explicitFat = normalizeNumber(profile.fatTarget);
  const explicitProteinPct = normalizeNumber(profile.proteinPctTarget);
  const explicitCarbsPct = normalizeNumber(profile.carbsPctTarget);
  const explicitFatPct = normalizeNumber(profile.fatPctTarget);

  if (
    mode === 'percentages' &&
    explicitCalories != null &&
    explicitProteinPct != null &&
    explicitCarbsPct != null &&
    explicitFatPct != null
  ) {
    return {
      calories: explicitCalories,
      protein: (explicitCalories * (explicitProteinPct / 100)) / 4,
      carbs: (explicitCalories * (explicitCarbsPct / 100)) / 4,
      fat: (explicitCalories * (explicitFatPct / 100)) / 9,
      proteinPct: explicitProteinPct,
      carbsPct: explicitCarbsPct,
      fatPct: explicitFatPct,
      source: 'explicit',
      mode: 'percentages',
    };
  }

  if (
    explicitCalories != null &&
    explicitProtein != null &&
    explicitCarbs != null &&
    explicitFat != null
  ) {
    return {
      calories: explicitCalories,
      protein: explicitProtein,
      carbs: explicitCarbs,
      fat: explicitFat,
      ...percentagesFromCalories({
        calories: explicitCalories,
        protein: explicitProtein,
        carbs: explicitCarbs,
        fat: explicitFat,
      }),
      source: 'explicit',
      mode: 'grams',
    };
  }

  const primaryGoal = profile.fitnessGoal || (Array.isArray(profile.fitnessGoals) ? profile.fitnessGoals[0] : null) || 'general_fitness';
  const preset = GOAL_PRESETS[primaryGoal] || GOAL_PRESETS.general_fitness;
  const weight = normalizeNumber(profile.weight);
  const activityLevel = String(profile.activityLevel || '').toLowerCase();
  const activityMultiplier = ACTIVITY_MULTIPLIERS[activityLevel] || ACTIVITY_MULTIPLIERS.moderate;
  const minimumCalories = getMinimumSafeCalories(profile.gender);

  const protein = roundToWhole(
    weight ? Math.max(weight * preset.proteinPerLb, preset.minProtein) : preset.minProtein,
    preset.minProtein
  );
  const fat = roundToWhole(
    weight ? Math.max(weight * preset.fatPerLb, preset.minFat) : preset.minFat,
    preset.minFat
  );

  const estimatedCalories = roundToWhole(
    (weight ? weight * activityMultiplier : 2100) + preset.calorieAdjustment,
    Math.max(minimumCalories, protein * 4 + fat * 9)
  );
  const carbs = roundToWhole(
    Math.max(preset.minCarbs, (estimatedCalories - protein * 4 - fat * 9) / 4),
    preset.minCarbs
  );
  const calories = protein * 4 + carbs * 4 + fat * 9;

  return {
    calories,
    protein,
    carbs,
    fat,
    ...percentagesFromCalories({ calories, protein, carbs, fat }),
    source: 'derived',
    mode: 'grams',
  };
}

export function applyNutritionTargetOverride(baseTargets, override) {
  if (!override) return baseTargets;
  const calories = normalizeNumber(override.calories);
  const protein = normalizeNumber(override.protein);
  const carbs = normalizeNumber(override.carbs);
  const fat = normalizeNumber(override.fat);
  if ([calories, protein, carbs, fat].some((value) => value == null)) return baseTargets;

  return {
    ...baseTargets,
    calories,
    protein,
    carbs,
    fat,
    ...percentagesFromCalories({ calories, protein, carbs, fat }),
    source: 'cheat-adjusted',
    adjustmentReason: override.reason || 'Cheat-plan adjustment',
  };
}
