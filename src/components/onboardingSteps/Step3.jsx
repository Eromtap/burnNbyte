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

  const removePreference = (value) => {
    updateForm({ dietaryPreferences: preferences.filter((pref) => pref !== value) });
  };

  const addCustomPreference = () => {
    const cleaned = customPref.trim();
    if (!cleaned) return;
    if (preferences.includes(cleaned)) {
      setCustomPref('');
      return;
    }
    updateForm({ dietaryPreferences: [...preferences, cleaned] });
    setCustomPref('');
  };

  const onCustomKey = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addCustomPreference();
    }
  };

  const addDislike = () => {
    const cleaned = customDislike.trim();
    if (!cleaned) return;
    if (dislikes.includes(cleaned)) {
      setCustomDislike('');
      return;
    }
    updateForm({ dislikedFoods: [...dislikes, cleaned] });
    setCustomDislike('');
  };
  const removeDislike = (value) => {
    updateForm({ dislikedFoods: dislikes.filter((d) => d !== value) });
  };
  const onDislikeKey = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addDislike();
    }
  };

  return (
    <StepLayout stepNumber={3} totalSteps={3} title="Nutrition & Focus Areas">
      <div className="block planner-head">
        <div className="flex justify-between items-center">
          <span>Dietary Preferences</span>
          <span className="text-xs muted">Pick anything you love</span>
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
        <label className="block mt-3">
          <span className="text-sm">Custom preferences</span>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <input
              type="text"
              className="input"
              style={{ flex: 1 }}
              placeholder="Add custom preference (press Enter)"
              value={customPref}
              onChange={(e) => setCustomPref(e.target.value)}
              onKeyDown={onCustomKey}
            />
            <button type="button" className="btn btn-secondary" onClick={addCustomPreference}>
              Add
            </button>
          </div>
        </label>
        {preferences.length > 0 && (
          <div className="selected-prefs mt-3">
            {preferences.map((pref) => (
              <span key={pref} className="pref-pill">
                {labelForDietaryPreference(pref)}
                <button type="button" onClick={() => removePreference(pref)} aria-label={`Remove ${pref}`}>
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
        {preferences.length === 0 && <p className="text-xs muted mt-2">Leave blank if you are open to anything.</p>}
      </div>

      <div className="block planner-head mt-4">
        <span>Foods you dislike</span>
        <p className="text-xs muted">Optional: list items you prefer to avoid (soft avoid).</p>
        <div className="mt-2" style={{ display: 'flex', gap: 12 }}>
          <input
            type="text"
            className="input"
            style={{ flex: 1 }}
            placeholder="e.g. olives, cottage cheese, mushrooms"
            value={customDislike}
            onChange={(e) => setCustomDislike(e.target.value)}
            onKeyDown={onDislikeKey}
          />
          <button type="button" className="btn btn-secondary" onClick={addDislike}>Add</button>
        </div>
        {dislikes.length > 0 && (
          <div className="selected-prefs mt-3">
            {dislikes.map((item) => (
              <span key={item} className="pref-pill">
                {item}
                <button type="button" onClick={() => removeDislike(item)} aria-label={`Remove ${item}`}>&times;</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <label className="block planner-head">
        Allergies:
        <input
          type="text"
          placeholder="e.g. peanuts, dairy"
          className="input mt-1"
          value={formData.allergies || ''}
          onChange={(e) => updateForm({ allergies: e.target.value })}
        />
      </label>

      <label className="block planner-head">
        Meals Per Day:
        <input
          type="number"
          placeholder="e.g. 3"
          className="input mt-1"
          value={formData.mealsPerDay}
          onChange={(e) => updateForm({ mealsPerDay: e.target.value })}
          min="1"
          required
        />
      </label>
    </StepLayout>
  );
}
