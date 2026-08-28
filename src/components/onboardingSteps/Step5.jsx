'use client';

import { Check, CircleAlert, LoaderCircle, Pencil, Utensils, Dumbbell } from 'lucide-react';
import StepLayout from './StepLayout';
import { labelForFitnessGoal } from '@/constants/fitnessGoals';
import { labelForEquipmentOption } from '@/constants/equipmentAccess';
import { labelForWorkoutSplit } from '@/constants/workoutSplits';
import { labelForDietaryPreference } from '@/constants/dietaryPreferences';
import { deriveNutritionTargets } from '@/lib/nutritionTargets';

const DAY_LABEL = { SUN: 'Sun', MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat' };

function EditButton({ step, onEdit }) {
  return (
    <button type="button" className="onboard-edit" onClick={() => onEdit(step)} aria-label={`Edit step ${step}`}>
      <Pencil size={15} aria-hidden /> Edit
    </button>
  );
}

function BuildStatus({ icon: Icon, label, status }) {
  const message = {
    idle: 'Ready to build',
    running: 'Building now',
    success: 'Ready',
    failed: 'Needs another try',
  }[status] || 'Ready to build';
  return (
    <div className={`onboard-build-item is-${status || 'idle'}`}>
      <Icon size={20} aria-hidden />
      <span><strong>{label}</strong><small>{message}</small></span>
      {status === 'running' ? <LoaderCircle className="onboard-spin" size={18} aria-hidden /> : null}
      {status === 'success' ? <Check size={18} aria-hidden /> : null}
      {status === 'failed' ? <CircleAlert size={18} aria-hidden /> : null}
    </div>
  );
}

export default function Step5({ formData, onEdit, buildState }) {
  const targets = deriveNutritionTargets(formData);
  const goals = Array.isArray(formData.fitnessGoals) && formData.fitnessGoals.length
    ? formData.fitnessGoals
    : [formData.fitnessGoal].filter(Boolean);
  const equipment = Array.isArray(formData.equipmentAccess) ? formData.equipmentAccess : [];
  const preferences = Array.isArray(formData.dietaryPreferences) ? formData.dietaryPreferences : [];
  const days = Array.isArray(formData.workoutDays) ? formData.workoutDays : [];

  return (
    <StepLayout
      stepNumber={5}
      totalSteps={5}
      title="Your starting setup"
      description="Review the plan inputs below. burnNbyte will use them to create your first seven days."
    >
      <div className="onboard-review">
        <section>
          <header><span>Goal</span><EditButton step={1} onEdit={onEdit} /></header>
          <strong>{labelForFitnessGoal(formData.fitnessGoal)}</strong>
          {goals.length > 1 ? <p>Also supporting: {goals.slice(1).map(labelForFitnessGoal).join(', ')}</p> : <p>Your primary outcome leads both plans.</p>}
        </section>

        <section>
          <header><span>Baseline</span><EditButton step={2} onEdit={onEdit} /></header>
          <strong>{formData.weight} lb{formData.goalWeight ? ` toward ${formData.goalWeight} lb` : ''}</strong>
          <p>{formData.activityLevel ? `${formData.activityLevel} activity` : 'Activity not set'} · {formData.heightFt}&apos; {formData.heightIn}&quot;</p>
        </section>

        <section>
          <header><span>Training</span><EditButton step={3} onEdit={onEdit} /></header>
          <strong>{days.map((day) => DAY_LABEL[day]).join(', ')} · {formData.workoutDuration} min</strong>
          <p>{labelForWorkoutSplit(formData.workoutPreference || 'auto')} · {equipment.map(labelForEquipmentOption).join(', ')}</p>
        </section>

        <section>
          <header><span>Food</span><EditButton step={4} onEdit={onEdit} /></header>
          <strong>{formData.mealsPerDay} meals per day{formData.mealPrepMode ? ' · meal prep' : ''}</strong>
          <p>{preferences.length ? preferences.map(labelForDietaryPreference).join(', ') : 'Balanced recommendations'}{formData.allergies ? ` · Avoid: ${formData.allergies}` : ''}</p>
        </section>
      </div>

      <section className="onboard-target-band">
        <div>
          <span>Starting nutrition guidance</span>
          <strong>{targets.calories.toLocaleString()} kcal</strong>
        </div>
        <dl>
          <div><dt>Protein</dt><dd>{Math.round(targets.protein)}g</dd></div>
          <div><dt>Carbs</dt><dd>{Math.round(targets.carbs)}g</dd></div>
          <div><dt>Fat</dt><dd>{Math.round(targets.fat)}g</dd></div>
        </dl>
        <p>These are starting estimates, not fixed limits. Advanced targets remain available from Profile.</p>
      </section>

      <div className="onboard-build-status" aria-live="polite">
        <BuildStatus icon={Dumbbell} label="Workout schedule" status={buildState.workouts} />
        <BuildStatus icon={Utensils} label="Seven-day meal plan" status={buildState.meals} />
      </div>
    </StepLayout>
  );
}
