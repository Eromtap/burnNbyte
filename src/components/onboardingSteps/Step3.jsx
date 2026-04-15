'use client';
import { useState } from 'react';
import StepLayout from './StepLayout';
import { DIETARY_PREFERENCES, labelForDietaryPreference } from '@/constants/dietaryPreferences';
import { deriveNutritionTargets, derivePercentageTargets, getMinimumSafeCalories } from '@/lib/nutritionTargets';

function normalizeNumber(value) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDelta(delta, unit) {
  if (delta === 0) return `On target`;
  if (delta > 0) return `${delta}${unit} over`;
  return `${Math.abs(delta)}${unit} under`;
}

export default function Step3({ formData, updateForm }) {
  const [customPref, setCustomPref] = useState('');
  const [customDislike, setCustomDislike] = useState('');
  const preferences = Array.isArray(formData.dietaryPreferences) ? formData.dietaryPreferences : [];
  const dislikes = Array.isArray(formData.dislikedFoods) ? formData.dislikedFoods : [];
  const mealPrepMode = Boolean(formData.mealPrepMode);
  const macroTargetMode = String(formData.macroTargetMode || 'grams');
  const calorieTarget = normalizeNumber(formData.calorieTarget);
  const proteinTarget = normalizeNumber(formData.proteinTarget);
  const carbsTarget = normalizeNumber(formData.carbsTarget);
  const fatTarget = normalizeNumber(formData.fatTarget);
  const proteinPctTarget = normalizeNumber(formData.proteinPctTarget);
  const carbsPctTarget = normalizeNumber(formData.carbsPctTarget);
  const fatPctTarget = normalizeNumber(formData.fatPctTarget);
  const suggestedTargets = deriveNutritionTargets(formData);
  const suggestedPctTargets = derivePercentageTargets(formData);
  const minimumCalories = getMinimumSafeCalories(formData.gender);
  const hasAnyMacroTarget = [proteinTarget, carbsTarget, fatTarget].some((value) => value != null);
  const hasAnyPctTarget = [proteinPctTarget, carbsPctTarget, fatPctTarget].some((value) => value != null);
  const macroCalories = hasAnyMacroTarget ? ((proteinTarget || 0) * 4) + ((carbsTarget || 0) * 4) + ((fatTarget || 0) * 9) : null;
  const macroPctTotal = hasAnyPctTarget ? (proteinPctTarget || 0) + (carbsPctTarget || 0) + (fatPctTarget || 0) : null;
  const calorieDelta = calorieTarget != null && macroCalories != null ? macroCalories - calorieTarget : null;
  const percentageDelta = macroPctTotal != null ? macroPctTotal - 100 : null;
  const allowedCalorieDelta = calorieTarget != null ? calorieTarget * 0.05 : null;
  const macroValidationMessage = calorieTarget == null
    ? ((hasAnyMacroTarget || hasAnyPctTarget) ? 'Add a calorie target to use macro targets.' : null)
    : (calorieTarget < minimumCalories
      ? `Calorie targets cannot go below ${minimumCalories}.`
    : (macroTargetMode === 'percentages'
      ? ([proteinPctTarget, carbsPctTarget, fatPctTarget].some((value) => value == null)
        ? 'Protein, carbs, and fat percentages all need values when using percentage targets.'
        : (macroPctTotal !== 100
          ? `Current macro percentages: ${macroPctTotal}%. That is ${formatDelta(percentageDelta, '%')} from 100%.`
          : null))
    : ([proteinTarget, carbsTarget, fatTarget].some((value) => value == null)
      ? 'Protein, carbs, and fat all need values when using calorie targets.'
      : (Math.abs(calorieDelta) > allowedCalorieDelta
        ? `Current macro calories: ${macroCalories}. That is ${formatDelta(calorieDelta, ' calories')} versus the ${calorieTarget} calorie target, which is outside the allowed 5% range.`
        : null))));

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
      description="Set food preferences, soft avoids, and optional macro targets so the meal planner feels personalized from day one."
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
          <label className="list-row" style={{ alignItems: 'flex-start', gap: 12 }}>
            <input
              type="checkbox"
              checked={mealPrepMode}
              onChange={(e) => updateForm({ mealPrepMode: e.target.checked })}
              style={{ marginTop: 4 }}
            />
            <span>
              <strong>Meal prep mode</strong>
              <span className="muted text-xs" style={{ display: 'block', marginTop: 4 }}>
                Bias toward batch-cook meals that can be repeated across the work week.
              </span>
            </span>
          </label>
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
          <div>
            <div className="planner-head">Optional daily targets</div>
            <div className="muted text-xs">
              Leave blank to let the planner infer calories and macros from your goals. If you set gram targets, protein and carbs count as 4 cal/g and fat counts as 9 cal/g, and the total should land within 5% of calories. Percentage mode still needs to total 100%, and calories cannot go below {minimumCalories}.
            </div>
            <div className="inline-field-row" style={{ marginTop: 12 }}>
              <button type="button" className={`btn ${macroTargetMode === 'grams' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => updateForm({ macroTargetMode: 'grams' })}>Use grams</button>
              <button type="button" className={`btn ${macroTargetMode === 'percentages' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => updateForm({ macroTargetMode: 'percentages' })}>Use percentages</button>
            </div>
            <div className="onboard-grid onboard-grid-2 mt-4">
              <label>
                <span>Calories</span>
                <input
                  type="number"
                  className="input"
                  placeholder={`e.g. ${suggestedTargets.calories}`}
                  value={formData.calorieTarget || ''}
                  onChange={(e) => updateForm({ calorieTarget: e.target.value })}
                  min={minimumCalories}
                />
              </label>
              {macroTargetMode === 'percentages' ? (
                <>
                  <label>
                    <span>Protein (%)</span>
                    <input type="number" className="input" placeholder={`e.g. ${suggestedPctTargets.proteinPct}`} value={formData.proteinPctTarget || ''} onChange={(e) => updateForm({ proteinPctTarget: e.target.value })} min="0" max="100" />
                  </label>
                  <label>
                    <span>Carbs (%)</span>
                    <input type="number" className="input" placeholder={`e.g. ${suggestedPctTargets.carbsPct}`} value={formData.carbsPctTarget || ''} onChange={(e) => updateForm({ carbsPctTarget: e.target.value })} min="0" max="100" />
                  </label>
                  <label>
                    <span>Fat (%)</span>
                    <input type="number" className="input" placeholder={`e.g. ${suggestedPctTargets.fatPct}`} value={formData.fatPctTarget || ''} onChange={(e) => updateForm({ fatPctTarget: e.target.value })} min="0" max="100" />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    <span>Protein (g)</span>
                    <input type="number" className="input" placeholder={`e.g. ${suggestedTargets.protein}`} value={formData.proteinTarget || ''} onChange={(e) => updateForm({ proteinTarget: e.target.value })} min="0" />
                  </label>
                  <label>
                    <span>Carbs (g)</span>
                    <input type="number" className="input" placeholder={`e.g. ${suggestedTargets.carbs}`} value={formData.carbsTarget || ''} onChange={(e) => updateForm({ carbsTarget: e.target.value })} min="0" />
                  </label>
                  <label>
                    <span>Fat (g)</span>
                    <input type="number" className="input" placeholder={`e.g. ${suggestedTargets.fat}`} value={formData.fatTarget || ''} onChange={(e) => updateForm({ fatTarget: e.target.value })} min="0" />
                  </label>
                </>
              )}
            </div>
            {!formData.calorieTarget && !formData.proteinTarget && !formData.carbsTarget && !formData.fatTarget && !formData.proteinPctTarget && !formData.carbsPctTarget && !formData.fatPctTarget && (
              <div className="list-row" style={{ marginTop: 12 }}>
                <span>Suggested default</span>
                <span className="muted">
                  {macroTargetMode === 'percentages'
                    ? `${suggestedPctTargets.calories} kcal • ${suggestedPctTargets.proteinPct}% protein • ${suggestedPctTargets.carbsPct}% carbs • ${suggestedPctTargets.fatPct}% fat`
                    : `${suggestedTargets.calories} kcal • ${suggestedTargets.protein}g protein • ${suggestedTargets.carbs}g carbs • ${suggestedTargets.fat}g fat`}
                </span>
              </div>
            )}
            {macroTargetMode === 'grams' && calorieTarget != null && macroCalories != null && (
              <div className="list-row" style={{ marginTop: 12 }}>
                <span>Current macro calories</span>
                <span className="muted">{macroCalories} kcal • {formatDelta(calorieDelta, ' calories')}</span>
              </div>
            )}
            {macroTargetMode === 'percentages' && macroPctTotal != null && (
              <div className="list-row" style={{ marginTop: 12 }}>
                <span>Current macro percentages</span>
                <span className="muted">{macroPctTotal}% • {formatDelta(percentageDelta, '%')}</span>
              </div>
            )}
            {macroTargetMode === 'grams' && calorieTarget != null && proteinTarget != null && carbsTarget != null && fatTarget != null && !macroValidationMessage && (
              <div className="alert alert-success" style={{ marginTop: 12 }}>
                Macro calories are within 5% of target: {proteinTarget}g protein, {carbsTarget}g carbs, {fatTarget}g fat = {macroCalories} calories.
              </div>
            )}
            {macroTargetMode === 'percentages' && calorieTarget != null && proteinPctTarget != null && carbsPctTarget != null && fatPctTarget != null && !macroValidationMessage && (
              <div className="alert alert-success" style={{ marginTop: 12 }}>
                Macro percentages match the target exactly: {proteinPctTarget}% protein, {carbsPctTarget}% carbs, {fatPctTarget}% fat = 100%.
              </div>
            )}
            {macroValidationMessage && (
              <div className="alert alert-error" style={{ marginTop: 12 }}>
                {macroValidationMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </StepLayout>
  );
}
