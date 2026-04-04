export const WORKOUT_SPLITS = [
  {
    id: 'auto',
    label: 'Auto',
    description: 'Let the planner choose the split based on your goals and schedule.',
  },
  {
    id: 'full_body',
    label: 'Full body',
    description: 'Prefer full-body sessions across the week.',
  },
  {
    id: 'push_pull_legs',
    label: 'Push / Pull / Legs',
    description: 'Lean toward a push, pull, legs rotation when the schedule supports it.',
  },
  {
    id: 'upper_lower',
    label: 'Upper / Lower',
    description: 'Prefer alternating upper-body and lower-body days.',
  },
  {
    id: 'body_part',
    label: 'Body-part split',
    description: 'Prefer dedicated focus days like chest, back, shoulders, or legs.',
  },
  {
    id: 'cardio_strength_mix',
    label: 'Cardio + strength mix',
    description: 'Blend conditioning and strength across the week instead of separating them.',
  },
];

export function labelForWorkoutSplit(value) {
  return WORKOUT_SPLITS.find((item) => item.id === value)?.label || value || 'Auto';
}
