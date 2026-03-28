'use client';
import { useState } from 'react';
import StepLayout from './StepLayout';
import { DIETARY_PREFERENCES, labelForDietaryPreference } from '@/constants/dietaryPreferences';

export default function Step3({ formData, updateForm }) {
  const [customPref, setCustomPref] = useState('');
  const [customDislike, setCustomDislike] = useState('');
  const preferences = Array.isArray(formData.dietaryPreferences) ? formData.dietaryPreferences : [];
  const dislikes = Array.isArray(formData.dislikedFoods) ? formData.dislikedFoods : [];

  const togglePreference = (value) => {
    const exists = preferences.includes(value);
    const next = exists ? preferences.filter((pref) => pref !== value) : [...preferences, value];
    updateForm({ dietaryPreferences: next });
  };

  const addCustomPreference = () => {
    const cleaned = customPref.trim();
    if (!cleaned || preferences.includes(cleaned)) {
      setCustomPref('');
      return;
    }
    updateForm({ dietaryPreferences: [...preferences, cleaned] });
    setCustomPref('');
  };

  const addDislike = () => {
    const cleaned = customDislike.trim();
    if (!cleaned || dislikes.includes(cleaned)) {
      setCustomDislike('');
      return;
    }
    updateForm({ dislikedFoods: [...dislikes, cleaned] });
    setCustomDislike('');
  };

  return (
    <StepLayout
      stepNumber={3}
      totalSteps={3}
      title="Nutrition setup"
      description="Set food preferences and soft avoids so the meal planner feels personalized from day one."
    >
      <div className="onboard-section">
        <div className="onboard-section-head">
          <div>
            <div className="planner-head">Dietary preferences</div>
            <div className="muted text-xs">Select anything the meal planner should lean toward.</div>
          </div>
        </div>
        <div className="prefs-grid mt-2">
          {DIETARY_PREFERENCES.map((pref) => {
            const active = preferences.includes(pref.id);
            return (
              <button
                key={pref.id}
                type="button"
                className={`pref-card ${active ? 'pref-card-active' : ''}`}
                onClick={() => togglePreference(pref.id)}
              >
                <span>{pref.label}</span>
                <small>{pref.description}</small>
              </button>
            );
          })}
        </div>
        <div className="onboard-inline-fields mt-4">
          <input
            type="text"
            className="input"
            placeholder="Add custom preference"
            value={customPref}
            onChange={(e) => setCustomPref(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addCustomPreference();
              }
            }}
          />
          <button type="button" className="btn btn-secondary" onClick={addCustomPreference}>Add</button>
        </div>
        {preferences.length > 0 && (
          <div className="selected-prefs mt-4">
            {preferences.map((pref) => (
              <span key={pref} className="pref-pill">{labelForDietaryPreference(pref)}</span>
            ))}
          </div>
        )}
      </div>

      <div className="onboard-grid onboard-grid-2">
        <div className="onboard-section" style={{ marginTop: 0 }}>
          <div className="planner-head">Foods you dislike</div>
          <div className="muted text-xs">Optional soft avoids for meals and grocery suggestions.</div>
          <div className="onboard-inline-fields mt-4">
            <input
              type="text"
              className="input"
              placeholder="e.g. olives, mushrooms"
              value={customDislike}
              onChange={(e) => setCustomDislike(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addDislike();
                }
              }}
            />
            <button type="button" className="btn btn-secondary" onClick={addDislike}>Add</button>
          </div>
          {dislikes.length > 0 && (
            <div className="selected-prefs mt-4">
              {dislikes.map((item) => (
                <span key={item} className="pref-pill">{item}</span>
              ))}
            </div>
          )}
        </div>

        <div className="onboard-info-stack">
          <label>
            <span>Allergies</span>
            <input
              type="text"
              className="input"
              placeholder="e.g. peanuts, dairy"
              value={formData.allergies || ''}
              onChange={(e) => updateForm({ allergies: e.target.value })}
            />
          </label>
          <label>
            <span>Meals per day</span>
            <input
              type="number"
              className="input"
              value={formData.mealsPerDay}
              onChange={(e) => updateForm({ mealsPerDay: e.target.value })}
              min="1"
              required
            />
          </label>
        </div>
      </div>
    </StepLayout>
  );
}
