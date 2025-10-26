'use client';
import { useMemo } from 'react';
import StepLayout from './StepLayout';

export default function Step1({ formData, updateForm }) {
  const calculateAge = (birthday) => {
    if (!birthday) return '';
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = useMemo(() => calculateAge(formData.birthday), [formData.birthday]);

  return (
    <StepLayout stepNumber={1} totalSteps={3} title="Basic Information">
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="First Name"
          className="input"
          value={formData.firstName}
          onChange={(e) => updateForm({ firstName: e.target.value })}
        />
        <input
          type="text"
          placeholder="Last Name"
          className="input"
          value={formData.lastName}
          onChange={(e) => updateForm({ lastName: e.target.value })}
        />
      </div>
      <label className="block">
      Birthday:
      <input
        type="date"
        placeholder="Birthday"
        className="input"
        value={formData.birthday ? formData.birthday : ""}
        onChange={(e) => updateForm({ birthday: e.target.value })}
      />
      </label>
      {formData.birthday && (
        <p className="text-sm muted"> Age: {age}</p>
      )}

      <select
        className="input"
        value={formData.gender}
        onChange={(e) => updateForm({ gender: e.target.value })}
      >
        <option value="">Gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
      </select>

      <div className="flex gap-4">
        <input
          type="number"
          className="input"
          placeholder="Height (ft)"
          value={formData.heightFt}
          onChange={(e) => updateForm({ heightFt: e.target.value })}
        />
        <input
          type="number"
          className="input"
          placeholder="Height (in)"
          value={formData.heightIn}
          onChange={(e) => updateForm({ heightIn: e.target.value })}
        />
      </div>

      <input
        type="number"
        placeholder="Weight (lbs)"
        className="input"
        value={formData.weight}
        onChange={(e) => updateForm({ weight: e.target.value })}
      />

      <select
        className="input"
        value={formData.activityLevel}
        onChange={(e) => updateForm({ activityLevel: e.target.value })}
      >
        <option value="">Activity Level</option>
        <option value="sedentary">Sedentary</option>
        <option value="light">Light</option>
        <option value="moderate">Moderate</option>
        <option value="active">Active</option>
      </select>
    </StepLayout>
  );
}
