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
import StepLayout from './StepLayout';
import { useState } from 'react';

const ALL_DAYS = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
const DAY_LABEL = { SUN:"Sun", MON:"Mon", TUE:"Tue", WED:"Wed", THU:"Thu", FRI:"Fri", SAT:"Sat" };

export default function Step2({ formData, updateForm }) {
  // ensure workoutDays is an array in your form state
  const workoutDays = formData.workoutDays ?? [];

  const toggleDay = (day) => {
    const next = workoutDays.includes(day)
      ? workoutDays.filter(d => d !== day)
      : [...workoutDays, day];
    updateForm({ workoutDays: next });
  };

  return (
    <StepLayout stepNumber={2} totalSteps={3} title="Fitness Goals">
      <label>
        <span>Fitness Goal</span>
        <select className="input" value={formData.fitnessGoal || ""} onChange={(e) => updateForm({ fitnessGoal: e.target.value })} required>
          <option value="">Select</option>
          <option value="lose_weight">Lose Weight</option>
          <option value="gain_muscle">Gain Muscle</option>
          <option value="improve_endurance">Endurance</option>
        </select>
      </label>

      <label>
        <span>Workout Type</span>
        <select className="input" value={formData.workoutPreference || ""} onChange={(e) => updateForm({ workoutPreference: e.target.value })} required>
          <option value="">Select</option>
          <option value="cardio">Cardio</option>
          <option value="strength">Strength</option>
          <option value="pilates">Pilates</option>
          <option value="calisthetics">Calisthetics</option>
          <option value="mixed">Mixed</option>
        </select>
      </label>

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
