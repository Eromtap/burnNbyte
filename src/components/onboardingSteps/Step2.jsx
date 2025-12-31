// 'use client';
// import StepLayout from './StepLayout';

// export default function Step2({ formData, updateForm }) {
//   return (
//     <StepLayout stepNumber={2} totalSteps={3} title="Fitness Goals">
//       <select className="input" value={formData.fitnessGoal} onChange={(e) => updateForm({ fitnessGoal: e.target.value })}>
//         <option value="">Fitness Goal</option>
//         <option value="lose_weight">Lose Weight</option>
//         <option value="gain_muscle">Gain Muscle</option>
//         <option value="improve_endurance">Endurance</option>
//       </select>
//       <select className="input" value={formData.workoutPreference} onChange={(e) => updateForm({ workoutPreference: e.target.value })}>
//         <option value="">Workout Type</option>
//         <option value="cardio">Cardio</option>
//         <option value="strength">Strength</option>
//         <option value="pilates">Pilates</option>
//         <option value="calisthetics">Calisthetics</option>
//         <option value="mixed">Mixed</option>
//       </select>
//       <input type="number" placeholder="Workout Duration (min)" className="input" value={formData.workoutDuration} onChange={(e) => updateForm({ workoutDuration: e.target.value })} />
//       <input type="number" placeholder="Workouts per Week" className="input" value={formData.workoutsPerWeek} onChange={(e) => updateForm({ workoutsPerWeek: e.target.value })} />
//     </StepLayout>
//   );
// }


'use client';
import { useState } from 'react';
import StepLayout from './StepLayout';
import { FITNESS_GOALS } from '@/constants/fitnessGoals';
import { EQUIPMENT_OPTIONS } from '@/constants/equipmentAccess';

const ALL_DAYS = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
const DAY_LABEL = { SUN:"Sun", MON:"Mon", TUE:"Tue", WED:"Wed", THU:"Thu", FRI:"Fri", SAT:"Sat" };

export default function Step2({ formData, updateForm }) {
  const workoutDays = Array.isArray(formData.workoutDays) ? formData.workoutDays : [];
  const goals = Array.isArray(formData.fitnessGoals) ? formData.fitnessGoals : [];
  const equipmentAccess = Array.isArray(formData.equipmentAccess) ? formData.equipmentAccess : [];
  const [customGoal, setCustomGoal] = useState('');
  const [customEquipment, setCustomEquipment] = useState('');

  const toggleDay = (day) => {
    const next = workoutDays.includes(day)
      ? workoutDays.filter(d => d !== day)
      : [...workoutDays, day];
    updateForm({ workoutDays: next });
  };

  const toggleGoal = (value) => {
    const exists = goals.includes(value);
    const next = exists ? goals.filter((g) => g !== value) : [...goals, value];
    updateForm({
      fitnessGoals: next,
      fitnessGoal: next[0] || '',
    });
  };

  const addCustomGoal = () => {
    const cleaned = customGoal.trim();
    if (!cleaned) return;
    if (goals.includes(cleaned)) {
      setCustomGoal('');
      return;
    }
    const next = [...goals, cleaned];
    updateForm({ fitnessGoals: next, fitnessGoal: next[0] || '' });
    setCustomGoal('');
  };

  const onCustomGoalKey = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addCustomGoal();
    }
  };

  const toggleEquipment = (value) => {
    const exists = equipmentAccess.includes(value);
    const next = exists ? equipmentAccess.filter((e) => e !== value) : [...equipmentAccess, value];
    updateForm({ equipmentAccess: next });
  };

  const addCustomEquipment = () => {
    const cleaned = customEquipment.trim();
    if (!cleaned) return;
    if (equipmentAccess.includes(cleaned)) {
      setCustomEquipment('');
      return;
    }
    updateForm({ equipmentAccess: [...equipmentAccess, cleaned] });
    setCustomEquipment('');
  };

  const onCustomEquipmentKey = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addCustomEquipment();
    }
  };

  return (
    <StepLayout stepNumber={2} totalSteps={3} title="Fitness Goals">
      <div className="block planner-head">
        <div className="flex justify-between items-center">
          <span>Fitness Goals</span>
          <span className="text-xs muted">Pick one or more</span>
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
        <label className="block mt-3">
          <span className="text-sm">Custom goals</span>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <input
              type="text"
              className="input"
              style={{ flex: 1 }}
              placeholder="e.g. Chicago marathon in October"
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
              onKeyDown={onCustomGoalKey}
            />
            <button type="button" className="btn btn-secondary" onClick={addCustomGoal}>
              Add
            </button>
          </div>
        </label>
        {goals.length === 0 && (
          <p className="text-xs muted mt-2">Select at least one target to shape your plans.</p>
        )}
      </div>

      <div className="block planner-head">
        <div className="flex justify-between items-center">
          <span>Equipment Access</span>
          <span className="text-xs muted">Helps tailor workouts</span>
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
        <label className="block mt-3">
          <span className="text-sm">Other equipment (optional)</span>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <input
              type="text"
              className="input"
              style={{ flex: 1 }}
              placeholder="e.g. Peloton, TRX, pool access"
              value={customEquipment}
              onChange={(e) => setCustomEquipment(e.target.value)}
              onKeyDown={onCustomEquipmentKey}
            />
            <button type="button" className="btn btn-secondary" onClick={addCustomEquipment}>
              Add
            </button>
          </div>
        </label>
        {equipmentAccess.length === 0 && <p className="text-xs muted mt-2">Tell us what gear you can use (home or gym).</p>}
      </div>

      <label>
        <span>Workout Duration (min)</span>
        <input
          type="number"
          className="input"
          value={formData.workoutDuration ?? ""}
          onChange={(e) => updateForm({ workoutDuration: e.target.value })}
          min="1"
          required
        />
      </label>

      {/* New: Day-of-week picker */}
      <div className="mt-3">
        <label className="planner-head" style={{ display: 'block', marginBottom: 4 }}>Workout Days</label>
        <div className="days-grid">
          {ALL_DAYS.map((d) => {
            const active = workoutDays.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={`btn-chip ${active ? 'btn-chip-active' : ''}`}
                aria-pressed={active}
              >
                {DAY_LABEL[d]}
              </button>
            );
          })}
        </div>
        <p className="text-xs muted" style={{ marginTop: 6 }}>
          Selected: {workoutDays.length ? workoutDays.map(d => DAY_LABEL[d]).join(', ') : 'None'}
        </p>
      </div>
    </StepLayout>
  );
}
