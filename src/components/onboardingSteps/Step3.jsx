'use client';
import StepLayout from './StepLayout';

export default function Step3({ formData, updateForm }) {
  const dietaryOptions = ["Vegan", "Keto", "Vegetarian", "Gluten-Free"];

  return (
    <StepLayout stepNumber={3} totalSteps={3} title="Nutrition & Focus Areas">
      <label className="block mb-2 planner-head">Dietary Preferences:</label>
      <div className="flex flex-col gap-2 mb-6">
        {dietaryOptions.map((opt) => (
          <label key={opt} className="block" style={{ color: 'var(--text)' }}>
            <input
              type="checkbox"
              checked={formData.dietaryPreferences.includes(opt)}
              onChange={(e) => {
                const newPrefs = e.target.checked
                  ? [...formData.dietaryPreferences, opt]
                  : formData.dietaryPreferences.filter((d) => d !== opt);
                updateForm({ dietaryPreferences: newPrefs });
              }}
            />
            {opt}
          </label>
        ))}
      </div>
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
        />
      </label>   
</StepLayout>
  );
}
