'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DIETARY_PREFERENCES } from '@/constants/dietaryPreferences';
import { FITNESS_GOALS } from '@/constants/fitnessGoals';
import { EQUIPMENT_OPTIONS } from '@/constants/equipmentAccess';
import { WORKOUT_SPLITS } from '@/constants/workoutSplits';
import MobileDisclosure from '@/components/MobileDisclosure';
import { deriveNutritionTargets, derivePercentageTargets, getMinimumSafeCalories } from '@/lib/nutritionTargets';

const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const BUILT_IN_PREFS = new Set(DIETARY_PREFERENCES.map(p => p.id));
const BUILT_IN_GOALS = new Set(FITNESS_GOALS.map(g => g.id));
const BUILT_IN_EQUIPMENT = new Set(EQUIPMENT_OPTIONS.map(e => e.id));

function normalizeNumber(value) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDelta(delta, unit) {
  if (delta === 0) return `On target`;
  if (delta > 0) return `${delta}${unit} over`;
  return `${Math.abs(delta)}${unit} under`;
}

function validateMacroTargets(form) {
  const minimumCalories = getMinimumSafeCalories(form.gender);
  const mode = String(form.macroTargetMode || 'grams');
  const calorieTarget = normalizeNumber(form.calorieTarget);
  const proteinTarget = normalizeNumber(form.proteinTarget);
  const carbsTarget = normalizeNumber(form.carbsTarget);
  const fatTarget = normalizeNumber(form.fatTarget);
  const proteinPctTarget = normalizeNumber(form.proteinPctTarget);
  const carbsPctTarget = normalizeNumber(form.carbsPctTarget);
  const fatPctTarget = normalizeNumber(form.fatPctTarget);
  const hasAnyMacro = [proteinTarget, carbsTarget, fatTarget].some((value) => value != null);
  const hasAnyPct = [proteinPctTarget, carbsPctTarget, fatPctTarget].some((value) => value != null);

  if (!hasAnyMacro && !hasAnyPct && calorieTarget == null) return { error: null, macroCalories: null };
  if (calorieTarget == null) {
    return { error: `Add a calorie target when setting ${mode === 'percentages' ? 'macro percentages' : 'protein, carbs, and fat targets'}.`, macroCalories: null };
  }
  if (calorieTarget < minimumCalories) {
    return { error: `Calorie targets cannot go below ${minimumCalories}.`, macroCalories: null };
  }
  if (mode === 'percentages') {
    if ([proteinPctTarget, carbsPctTarget, fatPctTarget].some((value) => value == null)) {
      return { error: 'Protein, carbs, and fat percentages all need values when using percentage targets.', macroCalories: null };
    }
    const totalPct = proteinPctTarget + carbsPctTarget + fatPctTarget;
    if (totalPct !== 100) {
      return { error: `Protein, carbs, and fat percentages currently add up to ${totalPct}%. That is ${formatDelta(totalPct - 100, '%')} from 100%.`, macroCalories: null };
    }
    return { error: null, macroCalories: calorieTarget };
  }
  if ([proteinTarget, carbsTarget, fatTarget].some((value) => value == null)) {
    return { error: 'Protein, carbs, and fat all need values when you set calorie and macro targets.', macroCalories: null };
  }

  const macroCalories = proteinTarget * 4 + carbsTarget * 4 + fatTarget * 9;
  const allowedDelta = calorieTarget * 0.05;
  if (Math.abs(macroCalories - calorieTarget) > allowedDelta) {
    return {
      error: `Protein, carbs, and fat currently add up to ${macroCalories} calories. That is ${formatDelta(macroCalories - calorieTarget, ' calories')} versus the ${calorieTarget} calorie target, which is outside the allowed 5% range.`,
      macroCalories,
    };
  }

  return { error: null, macroCalories };
}

export default function ProfileForm({ initial }){
  const router = useRouter();
  const { update } = useSession();
  const [form, setForm] = useState({
    gender: initial.gender || '',
    heightFt: initial.heightFt ?? '',
    heightIn: initial.heightIn ?? '',
    weight: initial.weight ?? '',
    goalWeight: initial.goalWeight ?? '',
    activityLevel: initial.activityLevel || '',
    fitnessGoal: initial.fitnessGoal || '',
    fitnessGoals: Array.isArray(initial.fitnessGoals)
      ? initial.fitnessGoals
      : (initial.fitnessGoal ? [initial.fitnessGoal] : []),
    equipmentAccess: Array.isArray(initial.equipmentAccess) ? initial.equipmentAccess : [],
    dietaryPreferences: Array.isArray(initial.dietaryPreferences) ? initial.dietaryPreferences : [],
    dislikedFoods: Array.isArray(initial.dislikedFoods) ? initial.dislikedFoods : [],
    mealPrepMode: Boolean(initial.mealPrepMode),
    macroTargetMode: initial.macroTargetMode || 'grams',
    calorieTarget: initial.calorieTarget ?? '',
    proteinTarget: initial.proteinTarget ?? '',
    carbsTarget: initial.carbsTarget ?? '',
    fatTarget: initial.fatTarget ?? '',
    proteinPctTarget: initial.proteinPctTarget ?? '',
    carbsPctTarget: initial.carbsPctTarget ?? '',
    fatPctTarget: initial.fatPctTarget ?? '',
    workoutPreference: initial.workoutPreference || 'auto',
    workoutDuration: initial.workoutDuration ?? 30,
    workoutDays: Array.isArray(initial.workoutDays) ? initial.workoutDays : [],
    allergies: initial.allergies ? (Array.isArray(initial.allergies) ? initial.allergies : String(initial.allergies).split(',').map(s=>s.trim()).filter(Boolean)) : [],
    mealsPerDay: initial.mealsPerDay ?? 3,
  });
  const [saving, setSaving] = useState(false);
  const [customPrefInput, setCustomPrefInput] = useState('');
  const [customGoalInput, setCustomGoalInput] = useState('');
  const [customEquipmentInput, setCustomEquipmentInput] = useState('');
  const [dislikeInput, setDislikeInput] = useState('');
  const [allergyInput, setAllergyInput] = useState('');
  const [msg, setMsg] = useState(null);
  const macroValidation = validateMacroTargets(form);
  const suggestedTargets = deriveNutritionTargets(form);
  const suggestedPctTargets = derivePercentageTargets(form);
  const minimumCalories = getMinimumSafeCalories(form.gender);
  const calorieTargetValue = normalizeNumber(form.calorieTarget);
  const proteinTargetValue = normalizeNumber(form.proteinTarget);
  const carbsTargetValue = normalizeNumber(form.carbsTarget);
  const fatTargetValue = normalizeNumber(form.fatTarget);
  const proteinPctValue = normalizeNumber(form.proteinPctTarget);
  const carbsPctValue = normalizeNumber(form.carbsPctTarget);
  const fatPctValue = normalizeNumber(form.fatPctTarget);
  const macroCaloriesValue = [proteinTargetValue, carbsTargetValue, fatTargetValue].some((value) => value != null)
    ? ((proteinTargetValue || 0) * 4) + ((carbsTargetValue || 0) * 4) + ((fatTargetValue || 0) * 9)
    : null;
  const percentTotalValue = [proteinPctValue, carbsPctValue, fatPctValue].some((value) => value != null)
    ? (proteinPctValue || 0) + (carbsPctValue || 0) + (fatPctValue || 0)
    : null;
  function updateField(key, val){ setForm(f => ({...f, [key]: val})); }
  function toggleDay(day){ setForm(f => ({...f, workoutDays: f.workoutDays.includes(day) ? f.workoutDays.filter(d=>d!==day) : [...f.workoutDays, day]})); }
  const customDietaryPreferences = form.dietaryPreferences.filter(p => !BUILT_IN_PREFS.has(p));
  const customFitnessGoals = form.fitnessGoals.filter(g => !BUILT_IN_GOALS.has(g));
  const customEquipmentAccess = form.equipmentAccess.filter(e => !BUILT_IN_EQUIPMENT.has(e));
  function addUniqueValue(list, value){
    const cleaned = String(value || '').trim();
    if (!cleaned || list.includes(cleaned)) return list;
    return [...list, cleaned];
  }
  function toggleDietPreference(value){
    const builtins = form.dietaryPreferences.filter(p => BUILT_IN_PREFS.has(p));
    const nextBuiltins = builtins.includes(value)
      ? builtins.filter(v => v !== value)
      : [...builtins, value];
    updateField('dietaryPreferences', [...nextBuiltins, ...customDietaryPreferences]);
  }
  function removeDietPreference(value){
    updateField('dietaryPreferences', form.dietaryPreferences.filter(v => v !== value));
  }
  function toggleFitnessGoal(value){
    const builtins = form.fitnessGoals.filter(g => BUILT_IN_GOALS.has(g));
    const nextBuiltins = builtins.includes(value)
      ? builtins.filter(v => v !== value)
      : [...builtins, value];
    const combined = [...nextBuiltins, ...customFitnessGoals];
    updateField('fitnessGoals', combined);
    updateField('fitnessGoal', combined[0] || '');
  }
  function setPrimaryFitnessGoal(value){
    if (!value) return;
    const goals = form.fitnessGoals.includes(value)
      ? [value, ...form.fitnessGoals.filter(goal => goal !== value)]
      : [value, ...form.fitnessGoals];
    updateField('fitnessGoals', goals);
    updateField('fitnessGoal', value);
  }
  function toggleEquipment(value){
    const builtins = form.equipmentAccess.filter(e => BUILT_IN_EQUIPMENT.has(e));
    const nextBuiltins = builtins.includes(value)
      ? builtins.filter(v => v !== value)
      : [...builtins, value];
    updateField('equipmentAccess', [...nextBuiltins, ...customEquipmentAccess]);
  }
  function addCustomGoal(){
    const next = addUniqueValue(form.fitnessGoals, customGoalInput);
    updateField('fitnessGoals', next);
    updateField('fitnessGoal', next[0] || '');
    setCustomGoalInput('');
  }
  function addCustomPreference(){
    updateField('dietaryPreferences', addUniqueValue(form.dietaryPreferences, customPrefInput));
    setCustomPrefInput('');
  }
  function addCustomEquipment(){
    updateField('equipmentAccess', addUniqueValue(form.equipmentAccess, customEquipmentInput));
    setCustomEquipmentInput('');
  }
  function addDislike(){
    updateField('dislikedFoods', addUniqueValue(form.dislikedFoods, dislikeInput));
    setDislikeInput('');
  }
  function addAllergy(){
    updateField('allergies', addUniqueValue(form.allergies, allergyInput));
    setAllergyInput('');
  }
  function removeFromList(key, value){
    updateField(key, (Array.isArray(form[key]) ? form[key] : []).filter(item => item !== value));
    if (key === 'fitnessGoals') {
      const nextGoals = (Array.isArray(form[key]) ? form[key] : []).filter(item => item !== value);
      updateField('fitnessGoal', nextGoals[0] || '');
    }
  }
  function buildPayload(){
    const goals = Array.isArray(form.fitnessGoals) ? form.fitnessGoals : [];
    return {
      ...form,
      fitnessGoal: form.fitnessGoal || goals[0] || '',
      fitnessGoals: goals,
      equipmentAccess: Array.isArray(form.equipmentAccess) ? form.equipmentAccess : [],
      allergies: Array.isArray(form.allergies) ? form.allergies : [],
    };
  }

  async function onSubmit(e){
    e.preventDefault(); setSaving(true); setMsg(null);
    try{
      if (macroValidation.error) throw new Error(macroValidation.error);
      const payload = buildPayload();
      const res = await fetch('/api/onboarding', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const data = await res.json();
      if(!res.ok) throw new Error(data?.error || 'Failed to save');
      // If server echoes the saved profile, sync local state to it
      if (data?.profile) {
        const updated = {
          gender: data.profile.gender || '',
          heightFt: data.profile.heightFt ?? '',
          heightIn: data.profile.heightIn ?? '',
          weight: data.profile.weight ?? '',
          goalWeight: data.profile.goalWeight ?? '',
          activityLevel: data.profile.activityLevel || '',
          fitnessGoal: data.profile.fitnessGoal || '',
          fitnessGoals: Array.isArray(data.profile.fitnessGoals)
            ? data.profile.fitnessGoals
            : (data.profile.fitnessGoal ? [data.profile.fitnessGoal] : []),
          dietaryPreferences: Array.isArray(data.profile.dietaryPreferences) ? data.profile.dietaryPreferences : [],
          dislikedFoods: Array.isArray(data.profile.dislikedFoods) ? data.profile.dislikedFoods : [],
          mealPrepMode: Boolean(data.profile.mealPrepMode),
          macroTargetMode: data.profile.macroTargetMode || 'grams',
          calorieTarget: data.profile.calorieTarget ?? '',
          proteinTarget: data.profile.proteinTarget ?? '',
          carbsTarget: data.profile.carbsTarget ?? '',
          fatTarget: data.profile.fatTarget ?? '',
          proteinPctTarget: data.profile.proteinPctTarget ?? '',
          carbsPctTarget: data.profile.carbsPctTarget ?? '',
          fatPctTarget: data.profile.fatPctTarget ?? '',
          workoutPreference: data.profile.workoutPreference || 'auto',
          workoutDuration: data.profile.workoutDuration ?? 30,
          workoutDays: Array.isArray(data.profile.workoutDays) ? data.profile.workoutDays : [],
          allergies: typeof data.profile.allergies === 'string'
            ? data.profile.allergies.split(',').map(s=>s.trim()).filter(Boolean)
            : Array.isArray(data.profile.allergies) ? data.profile.allergies : [],
          mealsPerDay: data.profile.mealsPerDay ?? 3,
          equipmentAccess: Array.isArray(data.profile.equipmentAccess) ? data.profile.equipmentAccess : [],
        };
        setForm(updated);
        setCustomPrefInput('');
        setCustomGoalInput('');
        setCustomEquipmentInput('');
        setDislikeInput('');
        setAllergyInput('');
      }
      setMsg('Saved');
      try { await update(); } catch {}
      try { router.refresh(); } catch {}
    }catch(err){ setMsg(err.message || 'Error'); }
    finally{ setSaving(false); }
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <MobileDisclosure
        className="mobile-disclosure form-section-disclosure"
        summaryClassName="mobile-disclosure-summary form-section-summary"
        panelClassName="mobile-disclosure-panel form-section-panel"
        defaultOpenMobile
        summary={
          <>
            <span className="planner-head">Profile basics</span>
            <span className="mobile-disclosure-meta">Body + activity</span>
          </>
        }
      >
          <label>
            <span>Gender</span>
            <select value={form.gender} onChange={e=>updateField('gender', e.target.value)}>
              <option value="">Select</option>
              <option>male</option>
              <option>female</option>
              <option>other</option>
            </select>
          </label>

          <label>
            <span>Height (ft / in)</span>
            <div className="inline-field-row">
              <input type="number" value={form.heightFt} onChange={e=>updateField('heightFt', e.target.value)} placeholder="ft" />
              <input type="number" value={form.heightIn} onChange={e=>updateField('heightIn', e.target.value)} placeholder="in" />
            </div>
          </label>

          <label>
            <span>Weight (lb)</span>
            <input type="number" value={form.weight} onChange={e=>updateField('weight', e.target.value)} placeholder="180" />
          </label>

          <label>
            <span>Goal Weight (lb)</span>
            <input type="number" value={form.goalWeight} onChange={e=>updateField('goalWeight', e.target.value)} placeholder="Optional" />
          </label>

          <label>
            <span>Activity Level</span>
            <select value={form.activityLevel} onChange={e=>updateField('activityLevel', e.target.value)}>
              <option value="">Select</option>
              <option>sedentary</option>
              <option>light</option>
              <option>moderate</option>
              <option>active</option>
              <option>very active</option>
            </select>
          </label>
      </MobileDisclosure>

      <MobileDisclosure
        className="mobile-disclosure form-section-disclosure"
        summaryClassName="mobile-disclosure-summary form-section-summary"
        panelClassName="mobile-disclosure-panel form-section-panel"
        summary={
          <>
            <span className="planner-head">Current goal</span>
            <span className="mobile-disclosure-meta">{form.fitnessGoals[0]?.replace(/[_-]/g, ' ') || 'Choose a goal'}</span>
          </>
        }
      >
        <div>
          <div className="planner-head">
            <span>Fitness goals</span>
          </div>
          <p className="text-xs muted" style={{ marginTop: 4 }}>Choose the goal that should guide your training and nutrition. You can select more than one.</p>
          <label className="block mt-4">
            <span>Current goal</span>
            <select value={form.fitnessGoal} onChange={e=>setPrimaryFitnessGoal(e.target.value)}>
              <option value="">Select a goal</option>
              {FITNESS_GOALS.map(goal => <option key={goal.id} value={goal.id}>{goal.label}</option>)}
              {customFitnessGoals.map(goal => <option key={goal} value={goal}>{goal}</option>)}
            </select>
          </label>
          <div className="prefs-grid mt-2">
            {FITNESS_GOALS.map(goal => {
              const active = form.fitnessGoals.includes(goal.id);
              return (
                <button
                  key={goal.id}
                  type="button"
                  className={`pref-card ${active ? 'pref-card-active' : ''}`}
                  onClick={()=>toggleFitnessGoal(goal.id)}
                >
                  <span>{goal.label}</span>
                  <small>{goal.description}</small>
                </button>
              );
            })}
          </div>
          <label className="block mt-4">
            <span className="planner-head">Custom goals</span>
            <p className="text-xs muted">Add race names, seasons, or anything not listed one at a time.</p>
            <div className="inline-field-row" style={{ marginTop: 8 }}>
              <input
                type="text"
                className="input"
                placeholder="e.g. Boston qualifier"
                value={customGoalInput}
                onChange={e=>setCustomGoalInput(e.target.value)}
                onKeyDown={e=>{
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomGoal();
                  }
                }}
              />
              <button type="button" className="btn btn-secondary" onClick={addCustomGoal}>+</button>
            </div>
          </label>
          {customFitnessGoals.length > 0 && (
            <div className="selected-prefs" style={{ marginTop: 10 }}>
              {customFitnessGoals.map(goal => (
                <span key={goal} className="pref-pill">{goal}<button type="button" onClick={()=>removeFromList('fitnessGoals', goal)} aria-label={`Remove ${goal}`}>×</button></span>
              ))}
            </div>
          )}
          {form.fitnessGoals.length === 0 && <p className="text-xs muted mt-2">Select at least one so we can tailor training.</p>}
        </div>
      </MobileDisclosure>

      <MobileDisclosure
        className="mobile-disclosure form-section-disclosure"
        summaryClassName="mobile-disclosure-summary form-section-summary"
        panelClassName="mobile-disclosure-panel form-section-panel"
        summary={
          <>
            <span className="planner-head">Workouts</span>
            <span className="mobile-disclosure-meta">{form.workoutDuration || 30} min • {form.workoutDays.length} days</span>
          </>
        }
      >
      <div className="mt-4">
        <div className="planner-head">
          <span>Equipment Access</span>
        </div>
        <p className="text-xs muted" style={{ marginTop: 4 }}>Tell us what you can use (home or gym) to shape your workouts.</p>
        <div className="prefs-grid mt-2">
          {EQUIPMENT_OPTIONS.map(item => {
            const active = form.equipmentAccess.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`pref-card ${active ? 'pref-card-active' : ''}`}
                onClick={()=>toggleEquipment(item.id)}
              >
                <span>{item.label}</span>
                <small>{item.description}</small>
              </button>
            );
          })}
        </div>
        <label className="block mt-4">
          <span className="planner-head">Other Equipment</span>
          <p className="text-xs muted">Add anything else one item at a time.</p>
          <div className="inline-field-row" style={{ marginTop: 8 }}>
            <input
              type="text"
              className="input"
              placeholder="e.g. Peloton"
              value={customEquipmentInput}
              onChange={e=>setCustomEquipmentInput(e.target.value)}
              onKeyDown={e=>{
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomEquipment();
                }
              }}
            />
            <button type="button" className="btn btn-secondary" onClick={addCustomEquipment}>+</button>
          </div>
        </label>
        {customEquipmentAccess.length > 0 && (
          <div className="selected-prefs" style={{ marginTop: 10 }}>
            {customEquipmentAccess.map(item => (
              <span key={item} className="pref-pill">{item}<button type="button" onClick={()=>removeFromList('equipmentAccess', item)} aria-label={`Remove ${item}`}>×</button></span>
            ))}
          </div>
        )}
        {form.equipmentAccess.length === 0 && (
          <p className="text-xs muted mt-2">Even &quot;bodyweight only&quot; helps us program correctly.</p>
        )}
      </div>

      <label className="mt-4">
        <span>Workout Duration (min)</span>
        <input type="number" value={form.workoutDuration} onChange={e=>updateField('workoutDuration', e.target.value)} />
      </label>

      <label>
        <span>Preferred Split</span>
        <select value={form.workoutPreference} onChange={e=>updateField('workoutPreference', e.target.value)}>
          {WORKOUT_SPLITS.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </label>

      <div>
        <div className="planner-head">Workout Days</div>
        <div style={{display:'flex', flexWrap:'wrap', gap:8, marginTop:8}}>
          {DAYS.map(d => (
            <label key={d} className="pill" style={{cursor:'pointer'}}>
              <input type="checkbox" checked={form.workoutDays.includes(d)} onChange={()=>toggleDay(d)} style={{marginRight:8}} />{d}
            </label>
          ))}
        </div>
      </div>

      </MobileDisclosure>

      <MobileDisclosure
        className="mobile-disclosure form-section-disclosure"
        summaryClassName="mobile-disclosure-summary form-section-summary"
        panelClassName="mobile-disclosure-panel form-section-panel"
        summary={
          <>
            <span className="planner-head">Meals</span>
            <span className="mobile-disclosure-meta">{form.mealsPerDay || 3} per day • {form.dietaryPreferences.length} prefs</span>
          </>
        }
      >
      <div>
        <div className="planner-head">
          <span>Dietary Preferences</span>
        </div>
        <p className="text-xs muted" style={{ marginTop: 4 }}>Select as many as you like from the list below.</p>
        <div className="prefs-grid mt-2">
          {DIETARY_PREFERENCES.map(pref => {
            const active = form.dietaryPreferences.includes(pref.id);
            return (
              <button
                key={pref.id}
                type="button"
                className={`pref-card ${active ? 'pref-card-active' : ''}`}
                onClick={()=>toggleDietPreference(pref.id)}
              >
                <span>{pref.label}</span>
                <small>{pref.description}</small>
              </button>
            );
          })}
        </div>
        <label className="block mt-4">
          <span className="planner-head">Custom Preferences</span>
          <p className="text-xs muted">Add any cuisines or foods you want us to lean into one at a time.</p>
          <div className="inline-field-row" style={{ marginTop: 8 }}>
            <input
              type="text"
              className="input"
              placeholder="e.g. Mediterranean"
              value={customPrefInput}
              onChange={e=>setCustomPrefInput(e.target.value)}
              onKeyDown={e=>{
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomPreference();
                }
              }}
            />
            <button type="button" className="btn btn-secondary" onClick={addCustomPreference}>+</button>
          </div>
        </label>
        {customDietaryPreferences.length > 0 && (
          <div className="selected-prefs" style={{ marginTop: 10 }}>
            {customDietaryPreferences.map(pref => (
              <span key={pref} className="pref-pill">{pref}<button type="button" onClick={()=>removeDietPreference(pref)} aria-label={`Remove ${pref}`}>×</button></span>
            ))}
          </div>
        )}
        {form.dietaryPreferences.length === 0 && <p className="text-xs muted mt-2">Leave empty if you have no dietary preferences.</p>}
      </div>

      <div className="mt-4">
        <div className="planner-head">Dislikes</div>
        <p className="text-xs muted">Soft avoid: add foods you prefer not to see one at a time.</p>
        <div className="inline-field-row" style={{ marginTop: 8 }}>
          <input
            type="text"
            className="input"
            placeholder="e.g. olives"
            value={dislikeInput}
            onChange={e=>setDislikeInput(e.target.value)}
            onKeyDown={e=>{
              if (e.key === 'Enter') {
                e.preventDefault();
                addDislike();
              }
            }}
          />
          <button type="button" className="btn btn-secondary" onClick={addDislike}>+</button>
        </div>
        {form.dislikedFoods.length > 0 && (
          <div className="selected-prefs" style={{ marginTop: 10 }}>
            {form.dislikedFoods.map(item => (
              <span key={item} className="pref-pill">{item}<button type="button" onClick={()=>removeFromList('dislikedFoods', item)} aria-label={`Remove ${item}`}>×</button></span>
            ))}
          </div>
        )}
      </div>

      <label className="list-row" style={{ alignItems: 'flex-start', gap: 12 }}>
        <input
          type="checkbox"
          checked={Boolean(form.mealPrepMode)}
          onChange={e => updateField('mealPrepMode', e.target.checked)}
          style={{ marginTop: 4 }}
        />
        <span>
          <strong>Meal Prep Mode</strong>
          <span className="muted text-xs" style={{ display: 'block', marginTop: 4 }}>
            Prefer repeatable, batch-cook meals that hold up for multiple work days.
          </span>
        </span>
      </label>

      <label>
        <span>Allergies</span>
        <div className="inline-field-row" style={{ marginTop: 8 }}>
          <input
            value={allergyInput}
            onChange={e=>setAllergyInput(e.target.value)}
            onKeyDown={e=>{
              if (e.key === 'Enter') {
                e.preventDefault();
                addAllergy();
              }
            }}
            placeholder="e.g. peanuts"
          />
          <button type="button" className="btn btn-secondary" onClick={addAllergy}>+</button>
        </div>
      </label>
      {form.allergies.length > 0 && (
        <div className="selected-prefs" style={{ marginTop: 10 }}>
          {form.allergies.map(item => (
            <span key={item} className="pref-pill">{item}<button type="button" onClick={()=>removeFromList('allergies', item)} aria-label={`Remove ${item}`}>×</button></span>
          ))}
        </div>
      )}

      <label>
        <span>Meals Per Day</span>
        <input type="number" value={form.mealsPerDay} onChange={e=>updateField('mealsPerDay', e.target.value)} />
      </label>

      <div className="mt-4">
        <div className="planner-head">Optional daily calorie and macro targets</div>
        <p className="text-xs muted" style={{ marginTop: 4 }}>
          Leave these blank if you want burnNbyte to infer targets from your goals. If you fill them in, protein and carbs count as 4 cal/g and fat counts as 9 cal/g, gram targets need to land within 5% of the calorie goal, percentage targets still need to total 100%, and calories cannot go below {minimumCalories}.
        </p>
        <div className="inline-field-row" style={{ marginTop: 12 }}>
          <button type="button" className={`btn ${form.macroTargetMode === 'grams' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => updateField('macroTargetMode', 'grams')}>Use grams</button>
          <button type="button" className={`btn ${form.macroTargetMode === 'percentages' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => updateField('macroTargetMode', 'percentages')}>Use percentages</button>
        </div>
        <div className="prefs-grid mt-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <label>
            <span>Calories</span>
            <input
              type="number"
              value={form.calorieTarget}
              onChange={e=>updateField('calorieTarget', e.target.value)}
              placeholder={String(suggestedTargets.calories)}
              min={minimumCalories}
            />
          </label>
          {form.macroTargetMode === 'percentages' ? (
            <>
              <label>
                <span>Protein (%)</span>
                <input type="number" value={form.proteinPctTarget} onChange={e=>updateField('proteinPctTarget', e.target.value)} placeholder={String(suggestedPctTargets.proteinPct)} min="0" max="100" />
              </label>
              <label>
                <span>Carbs (%)</span>
                <input type="number" value={form.carbsPctTarget} onChange={e=>updateField('carbsPctTarget', e.target.value)} placeholder={String(suggestedPctTargets.carbsPct)} min="0" max="100" />
              </label>
              <label>
                <span>Fat (%)</span>
                <input type="number" value={form.fatPctTarget} onChange={e=>updateField('fatPctTarget', e.target.value)} placeholder={String(suggestedPctTargets.fatPct)} min="0" max="100" />
              </label>
            </>
          ) : (
            <>
              <label>
                <span>Protein (g)</span>
                <input type="number" value={form.proteinTarget} onChange={e=>updateField('proteinTarget', e.target.value)} placeholder={String(suggestedTargets.protein)} min="0" />
              </label>
              <label>
                <span>Carbs (g)</span>
                <input type="number" value={form.carbsTarget} onChange={e=>updateField('carbsTarget', e.target.value)} placeholder={String(suggestedTargets.carbs)} min="0" />
              </label>
              <label>
                <span>Fat (g)</span>
                <input type="number" value={form.fatTarget} onChange={e=>updateField('fatTarget', e.target.value)} placeholder={String(suggestedTargets.fat)} min="0" />
              </label>
            </>
          )}
        </div>
        {!form.calorieTarget && !form.proteinTarget && !form.carbsTarget && !form.fatTarget && !form.proteinPctTarget && !form.carbsPctTarget && !form.fatPctTarget && (
          <div className="list-row" style={{ marginTop: 12 }}>
            <span>Suggested default</span>
            <span className="muted">
              {form.macroTargetMode === 'percentages'
                ? `${suggestedPctTargets.calories} kcal • ${suggestedPctTargets.proteinPct}% protein • ${suggestedPctTargets.carbsPct}% carbs • ${suggestedPctTargets.fatPct}% fat`
                : `${suggestedTargets.calories} kcal • ${suggestedTargets.protein}g protein • ${suggestedTargets.carbs}g carbs • ${suggestedTargets.fat}g fat`}
            </span>
          </div>
        )}
        {form.macroTargetMode === 'grams' && calorieTargetValue != null && macroCaloriesValue != null && (
          <div className="list-row" style={{ marginTop: 12 }}>
            <span>Current macro calories</span>
            <span className="muted">{macroCaloriesValue} kcal • {formatDelta(macroCaloriesValue - calorieTargetValue, ' calories')}</span>
          </div>
        )}
        {form.macroTargetMode === 'percentages' && percentTotalValue != null && (
          <div className="list-row" style={{ marginTop: 12 }}>
            <span>Current macro percentages</span>
            <span className="muted">{percentTotalValue}% • {formatDelta(percentTotalValue - 100, '%')}</span>
          </div>
        )}
        {form.macroTargetMode === 'grams' && form.calorieTarget !== '' && form.proteinTarget !== '' && form.carbsTarget !== '' && form.fatTarget !== '' && !macroValidation.error && (
          <div className="alert alert-success" style={{ marginTop: 12 }}>
            Macro calories are within 5% of target: {form.proteinTarget}g protein, {form.carbsTarget}g carbs, {form.fatTarget}g fat = {macroValidation.macroCalories} calories.
          </div>
        )}
        {form.macroTargetMode === 'percentages' && form.calorieTarget !== '' && form.proteinPctTarget !== '' && form.carbsPctTarget !== '' && form.fatPctTarget !== '' && !macroValidation.error && (
          <div className="alert alert-success" style={{ marginTop: 12 }}>
            Macro percentages match the target exactly: {form.proteinPctTarget}% protein, {form.carbsPctTarget}% carbs, {form.fatPctTarget}% fat = 100%.
          </div>
        )}
        {macroValidation.error && (
          <div className="alert alert-error" style={{ marginTop: 12 }}>
            {macroValidation.error}
          </div>
        )}
      </div>
      </MobileDisclosure>

      <div className="inline-field-row" style={{ alignItems: 'center' }}>
        <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        {msg && <span className="muted">{msg}</span>}
      </div>
    </form>
  );
}
