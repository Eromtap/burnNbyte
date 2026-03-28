'use client';
import { useState } from 'react';
import StepLayout from './StepLayout';
import { FITNESS_GOALS, labelForFitnessGoal } from '@/constants/fitnessGoals';
import { EQUIPMENT_OPTIONS, labelForEquipmentOption } from '@/constants/equipmentAccess';

const ALL_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LABEL = { SUN: 'Sun', MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat' };

export default function Step2({ formData, updateForm }) {
  const workoutDays = Array.isArray(formData.workoutDays) ? formData.workoutDays : [];
  const goals = Array.isArray(formData.fitnessGoals) ? formData.fitnessGoals : [];
  const equipmentAccess = Array.isArray(formData.equipmentAccess) ? formData.equipmentAccess : [];
  const [customGoal, setCustomGoal] = useState('');
  const [customEquipment, setCustomEquipment] = useState('');

  const toggleDay = (day) => {
    const next = workoutDays.includes(day)
      ? workoutDays.filter((d) => d !== day)
      : [...workoutDays, day];
    updateForm({ workoutDays: next });
  };

  const toggleGoal = (value) => {
    const exists = goals.includes(value);
    const next = exists ? goals.filter((g) => g !== value) : [...goals, value];
    updateForm({ fitnessGoals: next, fitnessGoal: next[0] || '' });
  };

  const addCustomGoal = () => {
    const cleaned = customGoal.trim();
    if (!cleaned || goals.includes(cleaned)) {
      setCustomGoal('');
      return;
    }
    const next = [...goals, cleaned];
    updateForm({ fitnessGoals: next, fitnessGoal: next[0] || '' });
    setCustomGoal('');
  };

  const toggleEquipment = (value) => {
    const exists = equipmentAccess.includes(value);
    const next = exists ? equipmentAccess.filter((e) => e !== value) : [...equipmentAccess, value];
    updateForm({ equipmentAccess: next });
  };

  const addCustomEquipment = () => {
    const cleaned = customEquipment.trim();
    if (!cleaned || equipmentAccess.includes(cleaned)) {
      setCustomEquipment('');
      return;
    }
    updateForm({ equipmentAccess: [...equipmentAccess, cleaned] });
    setCustomEquipment('');
  };

  return (
    <StepLayout
      stepNumber={2}
      totalSteps={3}
      title="Training setup"
      description="Choose the kind of outcome you want and what tools you actually have access to so workouts stop feeling generic."
    >
      <div className="onboard-section">
        <div className="onboard-section-head">
          <div>
            <div className="planner-head">Fitness goals</div>
            <div className="muted text-xs">Pick one or more targets.</div>
          </div>
        </div>
        <div className="prefs-grid mt-2">
          {FITNESS_GOALS.map((goal) => {
            const active = goals.includes(goal.id);
            return (
              <button
                key={goal.id}
                type="button"
                className={`pref-card ${active ? 'pref-card-active' : ''}`}
                onClick={() => toggleGoal(goal.id)}
              >
                <span>{goal.label}</span>
                <small>{goal.description}</small>
              </button>
            );
          })}
        </div>
        <div className="onboard-inline-fields mt-4">
          <input
            type="text"
            className="input"
            placeholder="Add a custom goal"
            value={customGoal}
            onChange={(e) => setCustomGoal(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addCustomGoal();
              }
            }}
          />
          <button type="button" className="btn btn-secondary" onClick={addCustomGoal}>Add</button>
        </div>
        {goals.length > 0 && (
          <div className="selected-prefs mt-4">
            {goals.map((goal) => (
              <span key={goal} className="pref-pill">{labelForFitnessGoal(goal)}</span>
            ))}
          </div>
        )}
      </div>

      <div className="onboard-section">
        <div className="onboard-section-head">
          <div>
            <div className="planner-head">Equipment access</div>
            <div className="muted text-xs">Tell the app what you can actually train with.</div>
          </div>
        </div>
        <div className="prefs-grid mt-2">
          {EQUIPMENT_OPTIONS.map((item) => {
            const active = equipmentAccess.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`pref-card ${active ? 'pref-card-active' : ''}`}
                onClick={() => toggleEquipment(item.id)}
              >
                <span>{item.label}</span>
                <small>{item.description}</small>
              </button>
            );
          })}
        </div>
        <div className="onboard-inline-fields mt-4">
          <input
            type="text"
            className="input"
            placeholder="Add custom equipment"
            value={customEquipment}
            onChange={(e) => setCustomEquipment(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addCustomEquipment();
              }
            }}
          />
          <button type="button" className="btn btn-secondary" onClick={addCustomEquipment}>Add</button>
        </div>
        {equipmentAccess.length > 0 && (
          <div className="selected-prefs mt-4">
            {equipmentAccess.map((item) => (
              <span key={item} className="pref-pill">{labelForEquipmentOption(item)}</span>
            ))}
          </div>
        )}
      </div>

      <div className="onboard-grid onboard-grid-2">
        <label>
          <span>Workout duration (min)</span>
          <input
            type="number"
            className="input"
            value={formData.workoutDuration ?? ''}
            onChange={(e) => updateForm({ workoutDuration: e.target.value })}
            min="1"
            required
          />
        </label>
        <div className="onboard-info-card">
          <div className="metric-label">Workout days</div>
          <div className="days-grid mt-2">
            {ALL_DAYS.map((day) => {
              const active = workoutDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`btn-chip ${active ? 'btn-chip-active' : ''}`}
                  aria-pressed={active}
                >
                  {DAY_LABEL[day]}
                </button>
              );
            })}
          </div>
          <div className="metric-detail" style={{ marginTop: 10 }}>
            {workoutDays.length ? workoutDays.map((day) => DAY_LABEL[day]).join(', ') : 'No days selected yet.'}
          </div>
        </div>
      </div>
    </StepLayout>
  );
}
