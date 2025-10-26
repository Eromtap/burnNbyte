'use client';
import { useState } from 'react';

const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

export default function ProfileForm({ initial }){
  const [form, setForm] = useState({
    gender: initial.gender || '',
    heightFt: initial.heightFt ?? '',
    heightIn: initial.heightIn ?? '',
    weight: initial.weight ?? '',
    activityLevel: initial.activityLevel || '',
    fitnessGoal: initial.fitnessGoal || '',
    dietaryPreferences: initial.dietaryPreferences || [],
    workoutPreference: initial.workoutPreference || '',
    workoutDuration: initial.workoutDuration ?? 30,
    workoutDays: Array.isArray(initial.workoutDays) ? initial.workoutDays : [],
    allergies: initial.allergies ? (Array.isArray(initial.allergies) ? initial.allergies : String(initial.allergies).split(',').map(s=>s.trim()).filter(Boolean)) : [],
    mealsPerDay: initial.mealsPerDay ?? 3,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  function updateField(key, val){ setForm(f => ({...f, [key]: val})); }
  function toggleDay(day){ setForm(f => ({...f, workoutDays: f.workoutDays.includes(day) ? f.workoutDays.filter(d=>d!==day) : [...f.workoutDays, day]})); }
  function updateCSV(key, csv){ updateField(key, csv.split(',').map(s=>s.trim()).filter(Boolean)); }

  async function onSubmit(e){
    e.preventDefault(); setSaving(true); setMsg(null);
    try{
      const res = await fetch('/api/onboarding', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
      const data = await res.json();
      if(!res.ok) throw new Error(data?.error || 'Failed to save');
      setMsg('Saved');
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

      <label>
        <span>Dietary Preferences (comma separated)</span>
        <input value={form.dietaryPreferences.join(', ')} onChange={e=>updateCSV('dietaryPreferences', e.target.value)} placeholder="keto, pescatarian" />
      </label>

      <label>
        <span>Allergies (comma separated)</span>
        <input value={form.allergies.join(', ')} onChange={e=>updateCSV('allergies', e.target.value)} placeholder="peanuts, dairy" />
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

