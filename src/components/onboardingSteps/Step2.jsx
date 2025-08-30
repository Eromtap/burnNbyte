'use client';
import StepLayout from './StepLayout';

export default function Step2({ formData, updateForm }) {
  return (
    <StepLayout stepNumber={2} totalSteps={3} title="Fitness Goals">
      <select className="input" value={formData.fitnessGoal} onChange={(e) => updateForm({ fitnessGoal: e.target.value })}>
        <option value="">Fitness Goal</option>
        <option value="lose_weight">Lose Weight</option>
        <option value="gain_muscle">Gain Muscle</option>
        <option value="improve_endurance">Endurance</option>
      </select>
      <select className="input" value={formData.workoutPreference} onChange={(e) => updateForm({ workoutPreference: e.target.value })}>
        <option value="">Workout Type</option>
        <option value="cardio">Cardio</option>
        <option value="strength">Strength</option>
        <option value="pilates">Pilates</option>
        <option value="calisthetics">Calisthetics</option>
        <option value="mixed">Mixed</option>
      </select>
      <input type="number" placeholder="Workout Duration (min)" className="input" value={formData.workoutDuration} onChange={(e) => updateForm({ workoutDuration: e.target.value })} />
      <input type="number" placeholder="Workouts per Week" className="input" value={formData.workoutsPerWeek} onChange={(e) => updateForm({ workoutsPerWeek: e.target.value })} />
    </StepLayout>
  );
}