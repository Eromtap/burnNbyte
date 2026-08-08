'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import WeightTrendChart from '@/components/WeightTrendChart';

function getLocalYMD() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

export default function ProgressSummary({ weightPoints = [], nutrition = {}, workoutsCompleted = 0, currentWeight = null, goalWeight = null }) {
  const router = useRouter();
  const [points, setPoints] = useState(weightPoints);
  const [weightInput, setWeightInput] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  useEffect(() => {
    setPoints(weightPoints);
  }, [weightPoints]);

  const nutritionData = {
    daysLogged: Number(nutrition?.daysLogged || 0),
    averageCalories: Number(nutrition?.averageCalories || 0),
    averageProtein: Number(nutrition?.averageProtein || 0),
    averageCarbs: Number(nutrition?.averageCarbs || 0),
    averageFat: Number(nutrition?.averageFat || 0),
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
          body: JSON.stringify({ weight: val, date: getLocalYMD() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to save weight');
        const dateLabel = data?.entry?.date || new Date().toISOString();
        setPoints((prev) => {
          const nextPoint = { id: data?.entry?.id, date: dateLabel, value: val };
          const existingIndex = prev.findIndex((point) => point.id === nextPoint.id);
          if (existingIndex === -1) return [...prev, nextPoint];
          return prev.map((point) => point.id === nextPoint.id ? nextPoint : point);
        });
        setWeightInput('');
        router.refresh();
      } catch (e) {
        setError(e.message || 'Failed to save weight');
      }
    });
  };

  return (
    <div className="stack progress-summary">
      <div className="stats progress-overview-grid">
        <div className="stat">
          <div className="stat-label">Average calories</div>
          <div className="stat-value">{nutritionData.averageCalories}<span className="unit">kcal</span></div>
          <div className="sub">Per logged day, last 28 days</div>
        </div>
        <div className="stat">
          <div className="stat-label">Average protein</div>
          <div className="stat-value">{nutritionData.averageProtein}<span className="unit">g</span></div>
          <div className="sub">Carbs {nutritionData.averageCarbs}g · fat {nutritionData.averageFat}g</div>
        </div>
        <div className="stat">
          <div className="stat-label">Days logged</div>
          <div className="stat-value">{nutritionData.daysLogged}<span className="unit">days</span></div>
          <div className="sub">Food entries completed in this period</div>
        </div>
        <div className="stat">
          <div className="stat-label">Workouts</div>
          <div className="stat-value">{workoutsCompleted}</div>
          <div className="sub">Completed in the last 28 days</div>
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
        {points.length > 0 ? (
          <WeightTrendChart
            points={points}
            goalWeight={goalWeight}
            height={260}
            margin={{ top: 8, right: 42, left: -10, bottom: 8 }}
          />
        ) : (
          <div className="list-row"><span className="muted">Add a weight entry to see your trend.</span></div>
        )}
      </div>
    </div>
  );
}
