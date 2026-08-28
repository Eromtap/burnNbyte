'use client';

import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import StepLayout, { FieldError } from './StepLayout';
import { FITNESS_GOALS, labelForFitnessGoal } from '@/constants/fitnessGoals';

export default function Step1({ formData, updateForm, errors = {} }) {
  const goals = Array.isArray(formData.fitnessGoals) ? formData.fitnessGoals : [];
  const primaryGoal = formData.fitnessGoal || goals[0] || '';
  const [customGoal, setCustomGoal] = useState('');

  const choosePrimary = (goal) => {
    updateForm({
      fitnessGoal: goal,
      fitnessGoals: [goal, ...goals.filter((item) => item !== goal)],
    });
  };

  const toggleSecondary = (goal) => {
    const next = goals.includes(goal)
      ? goals.filter((item) => item !== goal)
      : [...goals, goal];
    updateForm({ fitnessGoals: [primaryGoal, ...next.filter((item) => item !== primaryGoal)] });
  };

  const addCustomGoal = () => {
    const cleaned = customGoal.trim();
    if (!cleaned) return;
    if (!primaryGoal) choosePrimary(cleaned);
    else if (!goals.includes(cleaned)) updateForm({ fitnessGoals: [...goals, cleaned] });
    setCustomGoal('');
  };

  return (
    <StepLayout
      stepNumber={1}
      totalSteps={5}
      title="What are you working toward?"
      description="Choose the outcome that should lead your training and nutrition plan."
    >
      <div className="onboard-section">
        <div className="onboard-section-head">
          <div>
            <div className="planner-head">Primary goal</div>
            <div className="muted text-xs">Pick the result that matters most right now.</div>
          </div>
        </div>
        <div className="prefs-grid onboard-choice-grid mt-2" role="radiogroup" data-onboard-invalid={Boolean(errors.fitnessGoal)} aria-describedby={errors.fitnessGoal ? 'fitness-goal-error' : undefined}>
          {FITNESS_GOALS.map((goal) => {
            const active = primaryGoal === goal.id;
            return (
              <button
                key={goal.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`pref-card ${active ? 'pref-card-active' : ''}`}
                onClick={() => choosePrimary(goal.id)}
              >
                <span>{goal.label}{active ? <Check size={16} aria-hidden /> : null}</span>
                <small>{goal.description}</small>
              </button>
            );
          })}
        </div>
        <FieldError id="fitness-goal-error">{errors.fitnessGoal}</FieldError>
      </div>

      {primaryGoal ? (
        <details className="onboard-optional">
          <summary>Secondary goals <span>Optional</span></summary>
          <div className="prefs-grid onboard-choice-grid mt-4">
            {FITNESS_GOALS.filter((goal) => goal.id !== primaryGoal).map((goal) => {
              const active = goals.includes(goal.id);
              return (
                <button
                  key={goal.id}
                  type="button"
                  aria-pressed={active}
                  className={`pref-card ${active ? 'pref-card-active' : ''}`}
                  onClick={() => toggleSecondary(goal.id)}
                >
                  <span>{goal.label}{active ? <Check size={16} aria-hidden /> : null}</span>
                  <small>{goal.description}</small>
                </button>
              );
            })}
          </div>
          <div className="onboard-inline-fields mt-4">
            <input
              type="text"
              className="input"
              placeholder="Add another goal"
              value={customGoal}
              onChange={(event) => setCustomGoal(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addCustomGoal();
                }
              }}
            />
            <button type="button" className="btn btn-secondary" onClick={addCustomGoal}>
              <Plus size={16} aria-hidden /> Add
            </button>
          </div>
          {goals.length > 1 ? (
            <div className="selected-prefs mt-4">
              {goals.filter((goal) => goal !== primaryGoal).map((goal) => (
                <span key={goal} className="pref-pill">{labelForFitnessGoal(goal)}</span>
              ))}
            </div>
          ) : null}
        </details>
      ) : null}
    </StepLayout>
  );
}
