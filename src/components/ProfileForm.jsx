'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DIETARY_PREFERENCES, labelForDietaryPreference } from '@/constants/dietaryPreferences';

const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const BUILT_IN_PREFS = new Set(DIETARY_PREFERENCES.map(p => p.id));

export default function ProfileForm({ initial }){
  const router = useRouter();
  const { update } = useSession();
  const [form, setForm] = useState({
    gender: initial.gender || '',
    heightFt: initial.heightFt ?? '',
    heightIn: initial.heightIn ?? '',
    weight: initial.weight ?? '',
    activityLevel: initial.activityLevel || '',
    fitnessGoal: initial.fitnessGoal || '',
    dietaryPreferences: Array.isArray(initial.dietaryPreferences) ? initial.dietaryPreferences : [],
    dislikedFoods: Array.isArray(initial.dislikedFoods) ? initial.dislikedFoods : [],
    workoutPreference: initial.workoutPreference || '',
    workoutDuration: initial.workoutDuration ?? 30,
    workoutDays: Array.isArray(initial.workoutDays) ? initial.workoutDays : [],
    allergies: initial.allergies ? (Array.isArray(initial.allergies) ? initial.allergies : String(initial.allergies).split(',').map(s=>s.trim()).filter(Boolean)) : [],
    mealsPerDay: initial.mealsPerDay ?? 3,
  });
  const [saving, setSaving] = useState(false);
  const [customPrefsCSV, setCustomPrefsCSV] = useState(
    (Array.isArray(form.dietaryPreferences) ? form.dietaryPreferences : [])
      .filter(p => !BUILT_IN_PREFS.has(p))
      .join(', ')
  );
  const [dislikesCSV, setDislikesCSV] = useState(
    Array.isArray(form.dislikedFoods) ? form.dislikedFoods.join(', ') : ''
  );
  const [allergiesCSV, setAllergiesCSV] = useState(
    Array.isArray(form.allergies) ? form.allergies.join(', ')
      : (typeof form.allergies === 'string' ? form.allergies : '')
  );
  const [msg, setMsg] = useState(null);
  function updateField(key, val){ setForm(f => ({...f, [key]: val})); }
  function toggleDay(day){ setForm(f => ({...f, workoutDays: f.workoutDays.includes(day) ? f.workoutDays.filter(d=>d!==day) : [...f.workoutDays, day]})); }
  const parseCSV = (csv) => csv.split(',').map(s=>s.trim()).filter(Boolean);
  function updateCSV(key, csv){ updateField(key, parseCSV(csv)); }
  function toggleDietPreference(value){
    const customs = parseCSV(customPrefsCSV).filter(p => !BUILT_IN_PREFS.has(p));
    const builtins = form.dietaryPreferences.filter(p => BUILT_IN_PREFS.has(p));
    const nextBuiltins = builtins.includes(value)
      ? builtins.filter(v => v !== value)
      : [...builtins, value];
    updateField('dietaryPreferences', [...nextBuiltins, ...customs]);
  }
  function removeDietPreference(value){
    updateField('dietaryPreferences', form.dietaryPreferences.filter(v => v !== value));
  }
  function buildPayload(){
    return {
      ...form,
      allergies: Array.isArray(form.allergies) ? form.allergies : [],
    };
  }

  async function onSubmit(e){
    e.preventDefault(); setSaving(true); setMsg(null);
    try{
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
          activityLevel: data.profile.activityLevel || '',
          fitnessGoal: data.profile.fitnessGoal || '',
          dietaryPreferences: Array.isArray(data.profile.dietaryPreferences) ? data.profile.dietaryPreferences : [],
          dislikedFoods: Array.isArray(data.profile.dislikedFoods) ? data.profile.dislikedFoods : [],
          workoutPreference: data.profile.workoutPreference || '',
          workoutDuration: data.profile.workoutDuration ?? 30,
          workoutDays: Array.isArray(data.profile.workoutDays) ? data.profile.workoutDays : [],
          allergies: typeof data.profile.allergies === 'string'
            ? data.profile.allergies.split(',').map(s=>s.trim()).filter(Boolean)
            : Array.isArray(data.profile.allergies) ? data.profile.allergies : [],
          mealsPerDay: data.profile.mealsPerDay ?? 3,
        };
        setForm(updated);
        setCustomPrefsCSV(updated.dietaryPreferences.filter(p=>!BUILT_IN_PREFS.has(p)).join(', '));
        setDislikesCSV(updated.dislikedFoods.join(', '));
        setAllergiesCSV(Array.isArray(updated.allergies) ? updated.allergies.join(', ') : '');
      }
      setMsg('Saved');
      try { await update(); } catch {}
      try { router.refresh(); } catch {}
    }catch(err){ setMsg(err.message || 'Error'); }
    finally{ setSaving(false); }
  }

  return (
    <form className="form" onSubmit={onSubmit}>
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
        <div style={{display:'flex', gap:8}}>
          <input type="number" value={form.heightFt} onChange={e=>updateField('heightFt', e.target.value)} placeholder="ft" />
          <input type="number" value={form.heightIn} onChange={e=>updateField('heightIn', e.target.value)} placeholder="in" />
        </div>
      </label>

      <label>
        <span>Weight (lb)</span>
        <input type="number" value={form.weight} onChange={e=>updateField('weight', e.target.value)} placeholder="180" />
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

      <label>
        <span>Fitness Goal</span>
        <select value={form.fitnessGoal} onChange={e=>updateField('fitnessGoal', e.target.value)}>
          <option value="">Select</option>
          <option>weight loss</option>
          <option>recomp</option>
          <option>muscle gain</option>
        </select>
      </label>

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
          <p className="text-xs muted">Type any cuisines or foods you want us to lean into (comma separated).</p>
          <input
            type="text"
            className="input"
            style={{width:'100%', marginTop:8}}
            placeholder="e.g. Mediterranean, high-protein bowls"
            value={customPrefsCSV}
            onChange={e=>{
              const csv = e.target.value;
              setCustomPrefsCSV(csv);
              const customs = parseCSV(csv).filter(p=>!BUILT_IN_PREFS.has(p));
              const builtins = form.dietaryPreferences.filter(p=>BUILT_IN_PREFS.has(p));
              updateField('dietaryPreferences', [...builtins, ...customs]);
            }}
          />
        </label>
        {form.dietaryPreferences.length === 0 && <p className="text-xs muted mt-2">Leave empty if you have no dietary preferences.</p>}
      </div>

      <div className="mt-4">
        <div className="planner-head">Dislikes</div>
        <p className="text-xs muted">Soft avoid: foods you prefer not to see in plans (comma separated).</p>
        <input
          type="text"
          className="input"
          style={{width:'100%', marginTop:8}}
          placeholder="e.g. olives, cottage cheese, mushrooms"
          value={dislikesCSV}
          onChange={e=>{
            const csv = e.target.value;
            setDislikesCSV(csv);
            updateField('dislikedFoods', parseCSV(csv));
          }}
        />
      </div>

      <label>
        <span>Allergies (comma separated)</span>
        <input
          value={allergiesCSV}
          onChange={e=>{
            const csv = e.target.value;
            setAllergiesCSV(csv);
            updateField('allergies', parseCSV(csv));
          }}
          placeholder="peanuts, dairy"
        />
      </label>

      <label>
        <span>Workout Preference</span>
        <input value={form.workoutPreference} onChange={e=>updateField('workoutPreference', e.target.value)} placeholder="push/pull/legs" />
      </label>

      <label>
        <span>Workout Duration (min)</span>
        <input type="number" value={form.workoutDuration} onChange={e=>updateField('workoutDuration', e.target.value)} />
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

      <label>
        <span>Meals Per Day</span>
        <input type="number" value={form.mealsPerDay} onChange={e=>updateField('mealsPerDay', e.target.value)} />
      </label>

      <div style={{display:'flex', gap:8, alignItems:'center'}}>
        <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        {msg && <span className="muted">{msg}</span>}
      </div>
    </form>
  );
}
