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
    <StepLayout
      stepNumber={1}
      totalSteps={3}
      title="Body profile"
      description="Start with the numbers that change calorie targets, workout intensity, and the way the app personalizes your plan."
    >
      <div className="onboard-grid onboard-grid-2">
        <label>
          <span>First name</span>
          <input
            type="text"
            className="input"
            value={formData.firstName}
            onChange={(e) => updateForm({ firstName: e.target.value })}
            required
          />
        </label>
        <label>
          <span>Last name</span>
          <input
            type="text"
            className="input"
            value={formData.lastName}
            onChange={(e) => updateForm({ lastName: e.target.value })}
            required
          />
        </label>
      </div>

      <div className="onboard-grid onboard-grid-2">
        <label>
          <span>Birthday</span>
          <input
            type="date"
            className="input"
            value={formData.birthday || ''}
            onChange={(e) => updateForm({ birthday: e.target.value })}
            required
          />
        </label>
        <div className="onboard-info-card">
          <div className="metric-label">Age preview</div>
          <div className="metric-value" style={{ fontSize: '1.6rem' }}>{age || '--'}</div>
          <div className="metric-detail">Used to tailor recommendations and pacing.</div>
        </div>
      </div>

      <div className="onboard-grid onboard-grid-2">
        <label>
          <span>Gender</span>
          <select
            className="input"
            value={formData.gender}
            onChange={(e) => updateForm({ gender: e.target.value })}
            required
          >
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          <span>Activity level</span>
          <select
            className="input"
            value={formData.activityLevel}
            onChange={(e) => updateForm({ activityLevel: e.target.value })}
            required
          >
            <option value="">Select</option>
            <option value="sedentary">Sedentary</option>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="active">Active</option>
            <option value="very active">Very active</option>
          </select>
        </label>
      </div>

      <div className="onboard-grid onboard-grid-2">
        <div className="onboard-inline-fields">
          <label>
            <span>Height (ft)</span>
            <input
              type="number"
              className="input"
              placeholder="5"
              value={formData.heightFt}
              onChange={(e) => updateForm({ heightFt: e.target.value })}
              required
            />
          </label>
          <label>
            <span>Height (in)</span>
            <input
              type="number"
              className="input"
              placeholder="10"
              value={formData.heightIn}
              onChange={(e) => updateForm({ heightIn: e.target.value })}
              required
            />
          </label>
        </div>
        <label>
          <span>Weight (lb)</span>
          <input
            type="number"
            className="input"
            value={formData.weight}
            onChange={(e) => updateForm({ weight: e.target.value })}
            min="1"
            required
          />
        </label>
      </div>
    </StepLayout>
  );
}
