'use client';

import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import StepLayout, { FieldError } from './StepLayout';
import { EQUIPMENT_OPTIONS, labelForEquipmentOption } from '@/constants/equipmentAccess';
import { WORKOUT_SPLITS } from '@/constants/workoutSplits';

const ALL_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LABEL = { SUN: 'Sun', MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat' };
const DURATIONS = [20, 30, 45, 60, 75];

export default function Step3({ formData, updateForm, errors = {} }) {
  const workoutDays = Array.isArray(formData.workoutDays) ? formData.workoutDays : [];
  const equipmentAccess = Array.isArray(formData.equipmentAccess) ? formData.equipmentAccess : [];
  const [customEquipment, setCustomEquipment] = useState('');

  const toggleDay = (day) => {
    const next = workoutDays.includes(day)
      ? workoutDays.filter((item) => item !== day)
      : [...workoutDays, day];
    updateForm({ workoutDays: next, workoutsPerWeek: next.length });
  };

  const toggleEquipment = (value) => {
    const next = equipmentAccess.includes(value)
      ? equipmentAccess.filter((item) => item !== value)
      : [...equipmentAccess, value];
    updateForm({ equipmentAccess: next });
  };

  const addCustomEquipment = () => {
    const cleaned = customEquipment.trim();
    if (!cleaned) return;
    if (!equipmentAccess.includes(cleaned)) updateForm({ equipmentAccess: [...equipmentAccess, cleaned] });
    setCustomEquipment('');
  };

  return (
    <StepLayout
      stepNumber={3}
      totalSteps={5}
      title="Build around your real week"
      description="Choose a schedule and equipment setup you can consistently use."
    >
      <fieldset className="onboard-fieldset">
        <legend>Days you can usually train</legend>
        <div className="days-grid onboard-days" data-onboard-invalid={Boolean(errors.workoutDays)} aria-describedby={errors.workoutDays ? 'workout-days-error' : undefined}>
          {ALL_DAYS.map((day) => {
            const active = workoutDays.includes(day);
            return (
              <button key={day} type="button" aria-pressed={active} className={`btn-chip ${active ? 'btn-chip-active' : ''}`} onClick={() => toggleDay(day)}>
                {DAY_LABEL[day]}
              </button>
            );
          })}
        </div>
        <small className="onboard-field-help">Your first plan will place workouts on these days.</small>
        <FieldError id="workout-days-error">{errors.workoutDays}</FieldError>
      </fieldset>

      <fieldset className="onboard-fieldset">
        <legend>Time available per workout</legend>
        <div className="onboard-segmented onboard-duration" data-onboard-invalid={Boolean(errors.workoutDuration)} aria-describedby={errors.workoutDuration ? 'duration-error' : undefined}>
          {DURATIONS.map((duration) => (
            <button key={duration} type="button" aria-pressed={Number(formData.workoutDuration) === duration} className={Number(formData.workoutDuration) === duration ? 'active' : ''} onClick={() => updateForm({ workoutDuration: String(duration) })}>
              {duration} min
            </button>
          ))}
        </div>
        <FieldError id="duration-error">{errors.workoutDuration}</FieldError>
      </fieldset>

      <div className="onboard-section">
        <div className="onboard-section-head">
          <div>
            <div className="planner-head">Equipment you can use</div>
            <div className="muted text-xs">Select every setup that is reliably available.</div>
          </div>
        </div>
        <div className="prefs-grid onboard-choice-grid mt-2" data-onboard-invalid={Boolean(errors.equipmentAccess)} aria-describedby={errors.equipmentAccess ? 'equipment-error' : undefined}>
          {EQUIPMENT_OPTIONS.map((item) => {
            const active = equipmentAccess.includes(item.id);
            return (
              <button key={item.id} type="button" aria-pressed={active} className={`pref-card ${active ? 'pref-card-active' : ''}`} onClick={() => toggleEquipment(item.id)}>
                <span>{item.label}{active ? <Check size={16} aria-hidden /> : null}</span>
                <small>{item.description}</small>
              </button>
            );
          })}
        </div>
        <FieldError id="equipment-error">{errors.equipmentAccess}</FieldError>
        <div className="onboard-inline-fields mt-4">
          <input
            type="text"
            className="input"
            placeholder="Add equipment not listed"
            value={customEquipment}
            onChange={(event) => setCustomEquipment(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addCustomEquipment();
              }
            }}
          />
          <button type="button" className="btn btn-secondary" onClick={addCustomEquipment}>
            <Plus size={16} aria-hidden /> Add
          </button>
        </div>
        {equipmentAccess.length ? (
          <div className="selected-prefs mt-4">
            {equipmentAccess.map((item) => <span key={item} className="pref-pill">{labelForEquipmentOption(item)}</span>)}
          </div>
        ) : null}
      </div>

      <label className="onboard-compact-field">
        <span>Preferred workout structure</span>
        <select className="input" value={formData.workoutPreference || 'auto'} onChange={(event) => updateForm({ workoutPreference: event.target.value })}>
          {WORKOUT_SPLITS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <small className="onboard-field-help">Choose Automatic when you want burnNbyte to match the split to your schedule.</small>
      </label>
    </StepLayout>
  );
}
