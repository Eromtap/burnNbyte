'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import WeightTrendChart from '@/components/WeightTrendChart';

const SPOTLIGHT_STORAGE_KEY = 'bn_dashboard_spotlight';

function macroPct(value, target) {
  if (!target) return 0;
  return Math.max(0, Math.round((value / target) * 100));
}

function macroProgress(value, target) {
  if (!target) return 0;
  return Math.max(0, (value / target) * 100);
}

function formatDateLabel(label) {
  try {
    const date = new Date(label);
    if (Number.isNaN(date.getTime())) return label;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  } catch {
    return label;
  }
}

function isSmallViewport() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 720;
}

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

function normalizeSpotlightIndex(value) {
  return value === 1 ? 1 : 0;
}

function getStoredSpotlightIndex() {
  try {
    const saved = typeof window !== 'undefined' && localStorage.getItem(SPOTLIGHT_STORAGE_KEY);
    if (saved === 'weight') return 1;
    if (saved === 'nutrition') return 0;
  } catch {}
  return 0;
}

function AnimatedMacroRing({ label, value, target }) {
  const numericValue = Number(value) || 0;
  const [displayValue, setDisplayValue] = useState(numericValue);
  const displayRef = useRef(numericValue);

  useEffect(() => {
    const startValue = displayRef.current;
    const difference = numericValue - startValue;
    if (!difference) return undefined;
    const duration = 520;
    const startTime = performance.now();
    let frameId;
    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - ((1 - progress) ** 3);
      const nextValue = startValue + difference * eased;
      displayRef.current = nextValue;
      setDisplayValue(nextValue);
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [numericValue]);

  const rounded = Number.isInteger(numericValue)
    ? Math.round(displayValue)
    : Math.round(displayValue * 10) / 10;
  const percent = macroPct(displayValue, target);
  const exactPercent = macroProgress(displayValue, target);
  const progress = Math.min(100, exactPercent);
  const overage = Math.min(100, Math.max(0, exactPercent - 100));

  return (
    <div
      className={`dashboard-macro-ring${overage ? ' dashboard-macro-ring-over' : ''}`}
      style={{ '--dashboard-macro-progress': `${progress * 3.6}deg`, '--dashboard-macro-overage': `${overage * 3.6}deg` }}
      aria-label={`${label}: ${percent}% of target`}
    >
      <div>
        <strong>{rounded.toLocaleString()}</strong>
        <span>{percent}%</span>
      </div>
    </div>
  );
}

export default function DashboardSpotlightCarousel({
  consumedCalories = 0,
  consumedMacros = {},
  macroTargets = {},
  weightPoints = [],
  currentWeight = null,
  goalWeight = null,
  nutritionLabel = 'Today at a glance',
}) {
  const router = useRouter();
  const touchStartX = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [points, setPoints] = useState(weightPoints);
  const [displayedCurrentWeight, setDisplayedCurrentWeight] = useState(currentWeight);
  const [weightInput, setWeightInput] = useState('');
  const [error, setError] = useState('');
  const [compactChart, setCompactChart] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setPoints(weightPoints);
  }, [weightPoints]);

  useEffect(() => {
    setDisplayedCurrentWeight(currentWeight);
  }, [currentWeight]);

  useEffect(() => {
    setActiveIndex(normalizeSpotlightIndex(getStoredSpotlightIndex()));
  }, []);

  useEffect(() => {
    const syncViewport = () => setCompactChart(isSmallViewport());
    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SPOTLIGHT_STORAGE_KEY, activeIndex === 1 ? 'weight' : 'nutrition');
    } catch {}
  }, [activeIndex]);

  const weightDelta = useMemo(() => {
    if (!points || points.length < 2) return null;
    const first = Number(points[0]?.value);
    const last = Number(points[points.length - 1]?.value);
    if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
    return Math.round((last - first) * 10) / 10;
  }, [points]);

  function goTo(index) {
    setActiveIndex(normalizeSpotlightIndex(Math.max(0, Math.min(1, index))));
  }

  function handleTouchStart(event) {
    touchStartX.current = event.touches?.[0]?.clientX ?? null;
  }

  function handleTouchEnd(event) {
    const startX = touchStartX.current;
    const endX = event.changedTouches?.[0]?.clientX ?? null;
    touchStartX.current = null;
    if (startX == null || endX == null) return;
    const delta = endX - startX;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) goTo(activeIndex + 1);
    if (delta > 0) goTo(activeIndex - 1);
  }

  function handleAddWeight() {
    const value = Number(weightInput);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a valid weight in pounds');
      return;
    }

    setError('');
    startTransition(async () => {
      try {
        const res = await fetch('/api/progress/weight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weight: value, date: getLocalYMD() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to save weight');
        const nextDate = data?.entry?.date || new Date().toISOString();
        setPoints((prev) => {
          const nextPoint = { id: data?.entry?.id, date: nextDate, value };
          const existingIndex = prev.findIndex((point) => point.id === nextPoint.id);
          if (existingIndex === -1) return [...prev, nextPoint];
          return prev.map((point) => point.id === nextPoint.id ? nextPoint : point);
        });
        setDisplayedCurrentWeight(data?.currentWeight ?? value);
        setWeightInput('');
        router.refresh();
      } catch (err) {
        setError(err?.message || 'Failed to save weight');
      }
    });
  }

  function handleDeleteWeight(entry) {
    if (!entry?.id || !window.confirm(`Delete the ${entry.value} lb weight entry?`)) return;

    setError('');
    startTransition(async () => {
      try {
        const res = await fetch(`/api/progress/weight?id=${encodeURIComponent(entry.id)}`, {
          method: 'DELETE',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to delete weight entry');
        setPoints((prev) => prev.filter((point) => point.id !== entry.id));
        setDisplayedCurrentWeight(data?.currentWeight ?? null);
        router.refresh();
      } catch (err) {
        setError(err?.message || 'Failed to delete weight entry');
      }
    });
  }

  const nutritionMetrics = [
    { label: 'Calories', value: consumedCalories, target: macroTargets.calories, unit: 'kcal' },
    { label: 'Protein', value: consumedMacros.protein ?? 0, target: macroTargets.protein, unit: 'g' },
    { label: 'Carbs', value: consumedMacros.carbs ?? 0, target: macroTargets.carbs, unit: 'g' },
    { label: 'Fat', value: consumedMacros.fat ?? 0, target: macroTargets.fat, unit: 'g' },
  ];

  return (
    <article className="card span-full brand-nutrition-card dashboard-spotlight-card dashboard-today-spotlight-card">
      <header className="card-head dashboard-spotlight-head">
          <div className="dashboard-spotlight-meta">
            <div className="section-badge section-badge-meal">
              {activeIndex === 0 ? nutritionLabel : 'Weight progress'}
          </div>
        </div>
        <div className="dashboard-spotlight-controls">
          <button
            type="button"
            className={`dashboard-spotlight-dot${activeIndex === 0 ? ' dashboard-spotlight-dot-active' : ''}`}
            onClick={() => goTo(0)}
            aria-label="Show nutrition spotlight"
          />
          <button
            type="button"
            className={`dashboard-spotlight-dot${activeIndex === 1 ? ' dashboard-spotlight-dot-active' : ''}`}
            onClick={() => goTo(1)}
            aria-label="Show weight spotlight"
          />
        </div>
      </header>

      <div
        className="dashboard-spotlight-viewport"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="dashboard-spotlight-track"
          style={{ transform: `translateX(-${activeIndex * 50}%)` }}
        >
          <section className="dashboard-spotlight-panel">
            <div className="dashboard-macro-circles">
              {nutritionMetrics.map(({ label, value, target, unit }) => (
                <div className="dashboard-macro-circle-card" key={label}>
                  <AnimatedMacroRing label={label} value={value} target={target} />
                  <div className="dashboard-macro-circle-copy">
                    <span>{label}</span>
                    <small>{target?.toLocaleString?.() ?? 0} {unit}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-spotlight-panel">
            <div className="dashboard-weight-top">
              <div className="dashboard-weight-summary">
                <div className="dashboard-weight-summary-line">
                  <div className="stat-label">Current weight</div>
                  <div className="brand-macro-value">
                    {displayedCurrentWeight ?? '--'}
                    <span className="unit">lb</span>
                  </div>
                </div>
                {weightDelta != null ? (
                  <div className="dashboard-weight-delta">
                    {weightDelta < 0
                      ? `${Math.abs(weightDelta)} lb lost`
                      : weightDelta > 0
                        ? `${weightDelta} lb gained`
                        : 'No weight change'}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="dashboard-weight-actions">
              <input
                type="number"
                placeholder="Weight"
                value={weightInput}
                onChange={(event) => setWeightInput(event.target.value)}
              />
              <button type="button" className="btn btn-primary" onClick={handleAddWeight} disabled={pending}>
                {pending ? 'Saving...' : 'Save'}
              </button>
            </div>
            {error && <div className="muted" style={{ color: 'var(--danger)' }}>{error}</div>}
            {points.length ? (
              <WeightTrendChart
                points={points}
                goalWeight={goalWeight}
                margin={{ top: 8, right: 8, left: compactChart ? -2 : 4, bottom: 0 }}
                yAxisWidth={compactChart ? 34 : 42}
                renderSelection={(entry) => (
                  <div className="dashboard-weight-selected">
                    <span>{formatDateLabel(entry.date)} · {entry.value} lb</span>
                    <button type="button" onClick={() => handleDeleteWeight(entry)} disabled={pending}>
                      <Trash2 size={14} aria-hidden />
                      Delete entry
                    </button>
                  </div>
                )}
              />
            ) : (
              <div className="dashboard-weight-chart"><div className="dashboard-weight-empty">Save a weight to start the trend line.</div></div>
            )}
          </section>
        </div>
      </div>
    </article>
  );
}
