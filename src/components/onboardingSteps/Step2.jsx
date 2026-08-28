'use client';

import { useMemo } from 'react';
import { Check } from 'lucide-react';
import StepLayout, { FieldError } from './StepLayout';

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Mostly seated', description: 'Little intentional movement outside daily tasks' },
  { id: 'light', label: 'Lightly active', description: 'Regular walking or light exercise 1-2 days a week' },
  { id: 'moderate', label: 'Moderately active', description: 'Exercise or active work around 3-4 days a week' },
  { id: 'active', label: 'Very active', description: 'Hard training or active work around 5-6 days a week' },
  { id: 'very active', label: 'Highly active', description: 'Demanding training, sport, or physical work most days' },
];

function calculateAge(birthday) {
  if (!birthday) return '';
  const birthDate = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age;
}

export default function Step2({ formData, updateForm, errors = {} }) {
  const age = useMemo(() => calculateAge(formData.birthday), [formData.birthday]);

  return (
    <StepLayout
      stepNumber={2}
      totalSteps={5}
      title="Set your baseline"
      description="These details shape your starting calorie guidance and training intensity."
    >
      <div className="onboard-grid onboard-grid-2">
        <label>
          <span>First name</span>
          <input type="text" className="input" autoComplete="given-name" value={formData.firstName} onChange={(event) => updateForm({ firstName: event.target.value })} aria-invalid={Boolean(errors.firstName)} aria-describedby={errors.firstName ? 'first-name-error' : undefined} />
          <FieldError id="first-name-error">{errors.firstName}</FieldError>
        </label>
        <label>
          <span>Last name</span>
          <input type="text" className="input" autoComplete="family-name" value={formData.lastName} onChange={(event) => updateForm({ lastName: event.target.value })} aria-invalid={Boolean(errors.lastName)} aria-describedby={errors.lastName ? 'last-name-error' : undefined} />
          <FieldError id="last-name-error">{errors.lastName}</FieldError>
        </label>
      </div>

      <div className="onboard-grid onboard-grid-2">
        <label>
          <span>Birthday</span>
          <input type="date" className="input" value={formData.birthday || ''} onChange={(event) => updateForm({ birthday: event.target.value })} aria-invalid={Boolean(errors.birthday)} aria-describedby={errors.birthday ? 'birthday-error' : 'birthday-help'} />
          <small id="birthday-help" className="onboard-field-help">Used to estimate age-specific pacing.</small>
          <FieldError id="birthday-error">{errors.birthday}</FieldError>
        </label>
        <div className="onboard-signal">
          <span>Estimated age</span>
          <strong>{age || '--'}</strong>
          <small>You can update this later from Profile.</small>
        </div>
      </div>

      <fieldset className="onboard-fieldset">
        <legend>Sex used for calorie estimates</legend>
        <div className="onboard-segmented" role="radiogroup" data-onboard-invalid={Boolean(errors.gender)} aria-describedby={errors.gender ? 'gender-error' : undefined}>
          {[
            ['male', 'Male'],
            ['female', 'Female'],
            ['other', 'Another / not listed'],
          ].map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={formData.gender === value} className={formData.gender === value ? 'active' : ''} onClick={() => updateForm({ gender: value })}>
              {formData.gender === value ? <Check size={15} aria-hidden /> : null}{label}
            </button>
          ))}
        </div>
        <FieldError id="gender-error">{errors.gender}</FieldError>
      </fieldset>

      <div className="onboard-grid onboard-grid-2">
        <div className="onboard-inline-fields">
          <label>
            <span>Height (ft)</span>
            <input type="number" inputMode="numeric" className="input" placeholder="5" min="1" max="8" value={formData.heightFt} onChange={(event) => updateForm({ heightFt: event.target.value })} aria-invalid={Boolean(errors.heightFt)} aria-describedby={errors.heightFt ? 'height-ft-error' : undefined} />
            <FieldError id="height-ft-error">{errors.heightFt}</FieldError>
          </label>
          <label>
            <span>Height (in)</span>
            <input type="number" inputMode="numeric" className="input" placeholder="10" min="0" max="11" value={formData.heightIn} onChange={(event) => updateForm({ heightIn: event.target.value })} aria-invalid={Boolean(errors.heightIn)} aria-describedby={errors.heightIn ? 'height-in-error' : undefined} />
            <FieldError id="height-in-error">{errors.heightIn}</FieldError>
          </label>
        </div>
        <label>
          <span>Current weight (lb)</span>
          <input type="number" inputMode="decimal" className="input" min="1" step="0.1" value={formData.weight} onChange={(event) => updateForm({ weight: event.target.value })} aria-invalid={Boolean(errors.weight)} aria-describedby={errors.weight ? 'weight-error' : undefined} />
          <FieldError id="weight-error">{errors.weight}</FieldError>
        </label>
      </div>

      <label className="onboard-compact-field">
        <span>Goal weight (lb) <small>Optional</small></span>
        <input type="number" inputMode="decimal" className="input" min="1" step="0.1" placeholder="Add a target if weight is part of your goal" value={formData.goalWeight ?? ''} onChange={(event) => updateForm({ goalWeight: event.target.value })} aria-invalid={Boolean(errors.goalWeight)} aria-describedby={errors.goalWeight ? 'goal-weight-error' : undefined} />
        <FieldError id="goal-weight-error">{errors.goalWeight}</FieldError>
      </label>

      <fieldset className="onboard-fieldset">
        <legend>Typical activity outside planned workouts</legend>
        <div className="prefs-grid onboard-choice-grid" role="radiogroup" data-onboard-invalid={Boolean(errors.activityLevel)} aria-describedby={errors.activityLevel ? 'activity-error' : undefined}>
          {ACTIVITY_LEVELS.map((level) => {
            const active = formData.activityLevel === level.id;
            return (
              <button key={level.id} type="button" role="radio" aria-checked={active} className={`pref-card ${active ? 'pref-card-active' : ''}`} onClick={() => updateForm({ activityLevel: level.id })}>
                <span>{level.label}{active ? <Check size={16} aria-hidden /> : null}</span>
                <small>{level.description}</small>
              </button>
            );
          })}
        </div>
        <FieldError id="activity-error">{errors.activityLevel}</FieldError>
      </fieldset>
    </StepLayout>
  );
}
