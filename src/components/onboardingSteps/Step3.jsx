'use client';
import StepLayout from './StepLayout';

export default function Step3({ formData, updateForm }) {
  return (
    <StepLayout stepNumber={3} totalSteps={3} title="Nutrition & Focus Areas">
      <label className="block planner-head">
        <span>Dietary Preferences (comma separated)</span>
        <input
          type="text"
          className="input mt-1"
          placeholder="keto, pescatarian"
          value={Array.isArray(formData.dietaryPreferences) ? formData.dietaryPreferences.join(', ') : ''}
          onChange={(e) => {
            const csv = e.target.value;
            const arr = csv.split(',').map(s => s.trim()).filter(Boolean);
            updateForm({ dietaryPreferences: arr });
          }}
        />
      </label>

      <label className="block planner-head">
        Allergies:
        <input
          type="text"
          placeholder="e.g. peanuts, dairy"
          className="input mt-1"
          value={formData.allergies}
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
