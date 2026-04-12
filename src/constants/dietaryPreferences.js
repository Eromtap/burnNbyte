export const DIETARY_PREFERENCES = [
  {
    id: "balanced",
    label: "Balanced",
    description: "General whole foods & macro balance",
  },
  {
    id: "high_protein",
    label: "High Protein",
    description: "Lean meats, legumes, Greek yogurt",
  },
  {
    id: "low_carb",
    label: "Low Carb",
    description: "Keep starches lower, focus on veg + protein",
  },
  {
    id: "keto",
    label: "Keto",
    description: "Very low carbs, high fat",
  },
  {
    id: "paleo",
    label: "Paleo",
    description: "Whole foods, no grains or dairy",
  },
  {
    id: "vegetarian",
    label: "Vegetarian",
    description: "No meat or fish",
  },
  {
    id: "vegan",
    label: "Vegan",
    description: "No animal products at all",
  },
  {
    id: "pescatarian",
    label: "Pescatarian",
    description: "Seafood + plants, no other meats",
  },
  {
    id: "mediterranean",
    label: "Mediterranean",
    description: "Olive oil, fish, legumes, veg",
  },
  {
    id: "gluten_free",
    label: "Gluten Free",
    description: "Avoid wheat, barley, rye",
  },
  {
    id: "dairy_free",
    label: "Dairy Free",
    description: "Avoid milk products",
  },
  {
    id: "low_fodmap",
    label: "Low FODMAP",
    description: "Gentle on digestion",
  },
  {
    id: "low_sodium",
    label: "Low Sodium",
    description: "Limit added salt",
  },
  {
    id: "anti_inflammatory",
    label: "Anti-Inflammatory",
    description: "Focus on berries, greens, omega-3s",
  },
  {
    id: "cost_conscious",
    label: "Cost Conscious",
    description: "Favor lower-cost ingredients and budget-friendly meals",
  },
];

const PREF_LOOKUP = DIETARY_PREFERENCES.reduce((acc, pref) => {
  acc[pref.id] = pref;
  return acc;
}, {});

export function normalizeDietaryPreferences(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function describeDietaryPreferences(values) {
  const arr = Array.isArray(values) ? values : [];
  if (!arr.length) return [];
  return arr.map((val) => {
    const pref = PREF_LOOKUP[val];
    if (pref) return pref.description ? `${pref.label} (${pref.description})` : pref.label;
    return val;
  });
}

export function labelForDietaryPreference(value) {
  if (!value) return "";
  return PREF_LOOKUP[value]?.label ?? value;
}
