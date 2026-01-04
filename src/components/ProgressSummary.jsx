'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ResponsiveContainer, Line, LineChart, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

function formatDateLabel(label) {
  try {
    const d = new Date(label);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return label;
  }
}

export default function ProgressSummary({ weightPoints = [], calories = {}, planCompletion = {} }) {
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
      <div className="list-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="muted">Plan completion</div>
          <div style={{ fontWeight: 600 }}>{planPercent}%</div>
          <div className="muted" style={{ fontSize: 12 }}>{completedLabel}</div>
        </div>
        <div style={{ flex: 1, marginLeft: 16 }}>
          <div style={{ background: 'var(--neutral-100, #f3f4f6)', height: 8, borderRadius: 9999, overflow: 'hidden' }}>
            <div style={{ width: `${planPercent}%`, height: '100%', background: 'var(--primary, #2563eb)', transition: 'width 150ms ease' }} />
          </div>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Calories Consumed</div>
          <div className="stat-value">{calorieData.consumed}<span className="unit"> kcal</span></div>
          <div className="sub">Planned {calorieData.planned} kcal</div>
        </div>
        <div className="stat">
          <div className="stat-label">Calories Burned</div>
          <div className="stat-value">{calorieData.burned}<span className="unit"> kcal</span></div>
          <div className="sub">Workout est. {calorieData.plannedBurn} kcal</div>
        </div>
      </div>

      <div className="stack" style={{ marginTop: 8 }}>
        <div className="list-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div className="muted">Weight trend</div>
            <div className="sub">Log today&apos;s weight to keep the line current.</div>
          </div>
          <div className="stack" style={{ gap: 6, alignItems: 'flex-end' }}>
            <div className="list-row" style={{ gap: 8 }}>
              <input
                type="number"
                placeholder="Enter weight in pounds"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                style={{ width: 170 }}
              />
              <button className="btn btn-primary" onClick={handleAddWeight} disabled={pending}>
                {pending ? 'Saving…' : 'Save weight'}
              </button>
            </div>
            <div className="muted" style={{ fontSize: 12 }}>Tip: log once per day to see your trend.</div>
          </div>
        </div>
        {error && <div className="muted" style={{ color: 'var(--danger, #b91c1c)' }}>{error}</div>}
        {chartData.length > 0 ? (
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip formatter={(v) => [`${v} lb`, 'Weight']} />
                <Line type="monotone" dataKey="value" stroke="#2563eb" dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="muted">Add a weight entry to see your trend.</div>
        )}
      </div>
    </div>
  );
}
