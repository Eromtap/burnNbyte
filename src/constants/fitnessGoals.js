export const FITNESS_GOALS = [
  {
    id: "fat_loss",
    label: "Fat Loss / Recomp",
    description: "Cut body fat while keeping strength and energy high",
  },
  {
    id: "muscle_gain",
    label: "Muscle Gain",
    description: "Hypertrophy focus with progressive overload",
  },
  {
    id: "general_fitness",
    label: "General Fitness",
    description: "Move more, feel better, build a balanced base",
  },
  {
    id: "run_5k_10k",
    label: "5K / 10K Race",
    description: "Base building and speed work for short races",
  },
  {
    id: "half_marathon",
    label: "Half Marathon",
    description: "12-16 week endurance build with fueling practice",
  },
  {
    id: "marathon",
    label: "Marathon",
    description: "Long runs, pace work, and recovery blocks",
  },
  {
    id: "cycling_event",
    label: "Cycling Event",
    description: "Century, fondo, or long ride preparation",
  },
  {
    id: "triathlon",
    label: "Triathlon",
    description: "Balance swim/bike/run plus brick workouts",
  },
  {
    id: "powerlifting_meet",
    label: "Powerlifting Meet",
    description: "Peak squat/bench/deadlift for a competition",
  },
  {
    id: "weightlifting_meet",
    label: "Olympic Lifting Meet",
    description: "Snatch and clean & jerk technique and strength",
  },
  {
    id: "mobility_return",
    label: "Mobility / Return to Training",
    description: "Low-impact rebuild, rehab, and movement quality",
  },
];

const GOAL_LOOKUP = FITNESS_GOALS.reduce((acc, goal) => {
  acc[goal.id] = goal;
  return acc;
}, {});

export function normalizeFitnessGoals(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => v?.toString().trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function describeFitnessGoals(values) {
  const arr = Array.isArray(values) ? values : [];
  if (!arr.length) return [];
  return arr.map((val) => {
    const goal = GOAL_LOOKUP[val];
    if (goal) return goal.description ? `${goal.label} (${goal.description})` : goal.label;
    return val;
  });
}

export function labelForFitnessGoal(value) {
  if (!value) return "";
  return GOAL_LOOKUP[value]?.label ?? value;
}
