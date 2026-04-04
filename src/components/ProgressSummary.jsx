'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ResponsiveContainer, Line, LineChart, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

function formatDateLabel(label) {
  try {
    const d = new Date(label);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return label;
  }
}

export default function ProgressSummary({ weightPoints = [], calories = {}, planCompletion = {}, currentWeight = null, goalWeight = null }) {
  const router = useRouter();
  const [points, setPoints] = useState(weightPoints);
  const [weightInput, setWeightInput] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  const planPercent = Math.min(100, Math.max(0, Number(planCompletion?.percent) || 0));
  const completedLabel = `${planCompletion?.completed ?? 0}/${planCompletion?.total ?? 0} done`;

  useEffect(() => {
    setPoints(weightPoints);
  }, [weightPoints]);

  const chartData = useMemo(() => {
    return (points || []).map((p) => ({
      ...p,
      label: formatDateLabel(p.date),
    }));
  }, [points]);

  const calorieData = {
    consumed: Number(calories?.consumed || 0),
    planned: Number(calories?.planned || 0),
    burned: Number(calories?.burned || 0),
    plannedBurn: Number(calories?.plannedBurn || 0),
  };
  const poundsToGoal = goalWeight != null && currentWeight != null
    ? Math.round((Number(currentWeight) - Number(goalWeight)) * 10) / 10
    : null;

  const handleAddWeight = () => {
    const val = Number(weightInput);
    if (!Number.isFinite(val) || val <= 0) {
      setError('Enter a valid weight in pounds');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/progress/weight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weight: val }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to save weight');
        const dateLabel = data?.entry?.date || new Date().toISOString();
        setPoints((prev) => [...prev, { date: dateLabel, value: val }]);
        setWeightInput('');
        router.refresh();
      } catch (e) {
        setError(e.message || 'Failed to save weight');
      }
    });
  };

  return (
    <div className="stack">
      <div className="list-row">
        <div>
          <div className="metric-label">Plan completion</div>
          <div className="metric-value" style={{ fontSize: '1.9rem' }}>{planPercent}%</div>
          <div className="muted text-xs">{completedLabel}</div>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="progress"><span style={{ width: `${planPercent}%` }} /></div>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Calories eaten</div>
          <div className="stat-value">{calorieData.consumed}<span className="unit">kcal</span></div>
          <div className="sub">Planned {calorieData.planned} kcal</div>
        </div>
        <div className="stat">
          <div className="stat-label">Calories burned</div>
          <div className="stat-value">{calorieData.burned}<span className="unit">kcal</span></div>
          <div className="sub">Workout estimate {calorieData.plannedBurn} kcal</div>
        </div>
        <div className="stat">
          <div className="stat-label">Weight logs</div>
          <div className="stat-value">{chartData.length}</div>
          <div className="sub">Stored entries used for the trend line</div>
        </div>
        {goalWeight != null && (
          <div className="stat">
            <div className="stat-label">Goal weight</div>
            <div className="stat-value">{goalWeight}<span className="unit">lb</span></div>
            <div className="sub">
              {poundsToGoal == null
                ? 'Current weight not available'
                : poundsToGoal > 0
                  ? `${poundsToGoal} lb to go`
                  : poundsToGoal < 0
                    ? `${Math.abs(poundsToGoal)} lb below target`
                    : 'At your target'}
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div className="card-head">
          <div>
            <h3>Weight trend</h3>
            <div className="sub">Log today&apos;s bodyweight to keep the chart current.</div>
          </div>
          <div className="quick-actions" style={{ alignItems: 'center' }}>
            <input
              type="number"
              placeholder="Weight in pounds"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              style={{ width: 180 }}
            />
            <button className="btn btn-primary" onClick={handleAddWeight} disabled={pending}>
              {pending ? 'Saving...' : 'Save weight'}
            </button>
          </div>
        </div>
        {error && <div className="muted" style={{ color: 'var(--danger)' }}>{error}</div>}
        {chartData.length > 0 ? (
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
                <CartesianGrid stroke="var(--edge, rgba(255,255,255,.08))" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="var(--muted, rgba(255,255,255,.7))" />
                <YAxis domain={['dataMin - 5', 'dataMax + 5']} stroke="var(--muted, rgba(255,255,255,.7))" />
                <Tooltip formatter={(v) => [`${v} lb`, 'Weight']} contentStyle={{ background: 'var(--elev)', border: '1px solid var(--edge)', borderRadius: 16 }} />
                {goalWeight != null && <ReferenceLine y={goalWeight} stroke="var(--ok)" strokeDasharray="4 4" />}
                <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={3} dot={{ r: 3, fill: 'var(--accent)' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="list-row"><span className="muted">Add a weight entry to see your trend.</span></div>
        )}
      </div>
    </div>
  );
}
