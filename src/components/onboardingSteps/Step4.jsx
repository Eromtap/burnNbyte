'use client';

import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import StepLayout, { FieldError } from './StepLayout';
import { DIETARY_PREFERENCES, labelForDietaryPreference } from '@/constants/dietaryPreferences';

export default function Step4({ formData, updateForm, errors = {} }) {
  const preferences = Array.isArray(formData.dietaryPreferences) ? formData.dietaryPreferences : [];
  const dislikes = Array.isArray(formData.dislikedFoods) ? formData.dislikedFoods : [];
  const [customPreference, setCustomPreference] = useState('');
  const [customDislike, setCustomDislike] = useState('');

  const togglePreference = (value) => {
    const next = preferences.includes(value)
      ? preferences.filter((item) => item !== value)
      : [...preferences, value];
    updateForm({ dietaryPreferences: next });
  };

  const addItem = (value, current, key, clear) => {
    const cleaned = value.trim();
    if (cleaned && !current.includes(cleaned)) updateForm({ [key]: [...current, cleaned] });
    clear('');
  };

  return (
    <StepLayout
      stepNumber={4}
      totalSteps={5}
      title="Make food fit your life"
      description="Set the boundaries and preferences your first meal plan should respect."
    >
      <div className="onboard-safety-grid">
        <label className="onboard-compact-field">
          <span>Food allergies or medical restrictions <small>Optional</small></span>
          <input type="text" className="input" placeholder="e.g. peanuts, shellfish, dairy" value={formData.allergies || ''} onChange={(event) => updateForm({ allergies: event.target.value })} />
          <small className="onboard-field-help">Review generated meals and ingredient labels carefully before eating.</small>
        </label>
        <label className="onboard-compact-field">
          <span>Meals per day</span>
          <div className="onboard-stepper">
            <button type="button" aria-label="Decrease meals per day" onClick={() => updateForm({ mealsPerDay: Math.max(1, Number(formData.mealsPerDay || 3) - 1) })}>-</button>
            <output>{formData.mealsPerDay || 3}</output>
            <button type="button" aria-label="Increase meals per day" onClick={() => updateForm({ mealsPerDay: Math.min(6, Number(formData.mealsPerDay || 3) + 1) })}>+</button>
          </div>
          <FieldError id="meals-error">{errors.mealsPerDay}</FieldError>
        </label>
      </div>

      <div className="onboard-section">
        <div className="onboard-section-head">
          <div>
            <div className="planner-head">Eating style</div>
            <div className="muted text-xs">Optional. Select anything the planner should lean toward.</div>
          </div>
        </div>
        <div className="prefs-grid onboard-choice-grid mt-2">
          {DIETARY_PREFERENCES.map((preference) => {
            const active = preferences.includes(preference.id);
            return (
              <button key={preference.id} type="button" aria-pressed={active} className={`pref-card ${active ? 'pref-card-active' : ''}`} onClick={() => togglePreference(preference.id)}>
                <span>{preference.label}{active ? <Check size={16} aria-hidden /> : null}</span>
                <small>{preference.description}</small>
              </button>
            );
          })}
        </div>
        <div className="onboard-inline-fields mt-4">
          <input
            type="text"
            className="input"
            placeholder="Add another preference"
            value={customPreference}
            onChange={(event) => setCustomPreference(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addItem(customPreference, preferences, 'dietaryPreferences', setCustomPreference);
              }
            }}
          />
          <button type="button" className="btn btn-secondary" onClick={() => addItem(customPreference, preferences, 'dietaryPreferences', setCustomPreference)}>
            <Plus size={16} aria-hidden /> Add
          </button>
        </div>
        {preferences.length ? (
          <div className="selected-prefs mt-4">
            {preferences.map((item) => <span key={item} className="pref-pill">{labelForDietaryPreference(item)}</span>)}
          </div>
        ) : null}
      </div>

      <div className="onboard-grid onboard-grid-2">
        <div className="onboard-section" style={{ marginTop: 0 }}>
          <div className="planner-head">Foods you dislike</div>
          <div className="muted text-xs">Optional soft avoids for meals and groceries.</div>
          <div className="onboard-inline-fields mt-4">
            <input
              type="text"
              className="input"
              placeholder="e.g. olives, mushrooms"
              value={customDislike}
              onChange={(event) => setCustomDislike(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addItem(customDislike, dislikes, 'dislikedFoods', setCustomDislike);
                }
              }}
            />
            <button type="button" className="btn btn-secondary" onClick={() => addItem(customDislike, dislikes, 'dislikedFoods', setCustomDislike)}>
              <Plus size={16} aria-hidden /> Add
            </button>
          </div>
          {dislikes.length ? (
            <div className="selected-prefs mt-4">
              {dislikes.map((item) => <span key={item} className="pref-pill">{item}</span>)}
            </div>
          ) : null}
        </div>

        <label className={`onboard-toggle ${formData.mealPrepMode ? 'active' : ''}`}>
          <input type="checkbox" checked={Boolean(formData.mealPrepMode)} onChange={(event) => updateForm({ mealPrepMode: event.target.checked })} />
          <span>
            <strong>Meal prep mode</strong>
            <small>Favor batch-cook meals that can repeat across the work week.</small>
          </span>
          <i aria-hidden>{formData.mealPrepMode ? <Check size={16} /> : null}</i>
        </label>
      </div>
    </StepLayout>
  );
}
