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
      <div style={{ display: 'flex', gap: 8 }}>
        <label style={{ flex: 1 }}>
          <span>First Name</span>
          <input
            type="text"
            className="input"
            value={formData.firstName}
            onChange={(e) => updateForm({ firstName: e.target.value })}
          />
        </label>
        <label style={{ flex: 1 }}>
          <span>Last Name</span>
          <input
            type="text"
            className="input"
            value={formData.lastName}
            onChange={(e) => updateForm({ lastName: e.target.value })}
          />
        </label>
      </div>

      <label className="block">
        <span>Birthday</span>
        <input
          type="date"
          className="input"
          value={formData.birthday ? formData.birthday : ""}
          onChange={(e) => updateForm({ birthday: e.target.value })}
        />
      </label>
      {formData.birthday && (
        <p className="text-sm muted">Age: {age}</p>
      )}

      <label>
        <span>Gender</span>
        <select
          className="input"
          value={formData.gender}
          onChange={(e) => updateForm({ gender: e.target.value })}
        >
          <option value="">Select</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label>
        <span>Height (ft / in)</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            className="input"
            placeholder="ft"
            value={formData.heightFt}
            onChange={(e) => updateForm({ heightFt: e.target.value })}
          />
          <input
            type="number"
            className="input"
            placeholder="in"
            value={formData.heightIn}
            onChange={(e) => updateForm({ heightIn: e.target.value })}
          />
        </div>
      </label>

      <label>
        <span>Weight (lb)</span>
        <input
          type="number"
          className="input"
          value={formData.weight}
          onChange={(e) => updateForm({ weight: e.target.value })}
        />
      </label>

      <label>
        <span>Activity Level</span>
        <select
          className="input"
          value={formData.activityLevel}
          onChange={(e) => updateForm({ activityLevel: e.target.value })}
        >
          <option value="">Select</option>
          <option value="sedentary">sedentary</option>
          <option value="light">light</option>
          <option value="moderate">moderate</option>
          <option value="active">active</option>
          <option value="very active">very active</option>
        </select>
      </label>
    </StepLayout>
  );
}
