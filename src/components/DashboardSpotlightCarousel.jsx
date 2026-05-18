'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ResponsiveContainer, Line, LineChart, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

const SPOTLIGHT_STORAGE_KEY = 'bn_dashboard_spotlight';

function macroPct(value, target) {
  if (!target) return 0;
  return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
}

function formatDateLabel(label) {
  try {
    const date = new Date(label);
    if (Number.isNaN(date.getTime())) return label;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return label;
  }
}

function isSmallViewport() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 720;
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

export default function DashboardSpotlightCarousel({
  consumedCalories = 0,
  consumedMacros = {},
  macroTargets = {},
  weightPoints = [],
  currentWeight = null,
  goalWeight = null,
}) {
  const router = useRouter();
  const touchStartX = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [points, setPoints] = useState(weightPoints);
  const [weightInput, setWeightInput] = useState('');
  const [error, setError] = useState('');
  const [compactChart, setCompactChart] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setPoints(weightPoints);
  }, [weightPoints]);

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

  const chartData = useMemo(() => (
    (points || []).map((point) => ({
      ...point,
      label: formatDateLabel(point.date),
    }))
  ), [points]);
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
          body: JSON.stringify({ weight: value }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to save weight');
        const nextDate = data?.entry?.date || new Date().toISOString();
        setPoints((prev) => [...prev, { date: nextDate, value }]);
        setWeightInput('');
        router.refresh();
      } catch (err) {
        setError(err?.message || 'Failed to save weight');
      }
    });
  }

  return (
    <article className="card span-full brand-nutrition-card dashboard-spotlight-card">
      <header className="card-head dashboard-spotlight-head">
        <div className="dashboard-spotlight-meta">
          <div className="section-badge section-badge-meal">
            {activeIndex === 0 ? 'Nutrition spotlight' : 'Weight spotlight'}
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
            <div className="brand-macro-grid">
              <div className="brand-macro-row">
                <div className="brand-macro-head">
                  <div className="stat-label">Calories</div>
                  <div className="brand-macro-value">{consumedCalories}<span className="unit">/ {macroTargets.calories}</span></div>
                </div>
                <div className="progress brand-macro-progress"><span style={{ width: `${macroPct(consumedCalories, macroTargets.calories || 1)}%` }} /></div>
              </div>
              <div className="brand-macro-row">
                <div className="brand-macro-head">
                  <div className="stat-label">Protein</div>
                  <div className="brand-macro-value">{consumedMacros.protein ?? 0}<span className="unit"> / {macroTargets.protein}g</span></div>
                </div>
                <div className="progress brand-macro-progress"><span style={{ width: `${macroPct(consumedMacros.protein ?? 0, macroTargets.protein)}%` }} /></div>
              </div>
              <div className="brand-macro-row">
                <div className="brand-macro-head">
                  <div className="stat-label">Carbs</div>
                  <div className="brand-macro-value">{consumedMacros.carbs ?? 0}<span className="unit"> / {macroTargets.carbs}g</span></div>
                </div>
                <div className="progress brand-macro-progress"><span style={{ width: `${macroPct(consumedMacros.carbs ?? 0, macroTargets.carbs)}%` }} /></div>
              </div>
              <div className="brand-macro-row">
                <div className="brand-macro-head">
                  <div className="stat-label">Fat</div>
                  <div className="brand-macro-value">{consumedMacros.fat ?? 0}<span className="unit"> / {macroTargets.fat}g</span></div>
                </div>
                <div className="progress brand-macro-progress"><span style={{ width: `${macroPct(consumedMacros.fat ?? 0, macroTargets.fat)}%` }} /></div>
              </div>
            </div>
          </section>

          <section className="dashboard-spotlight-panel">
            <div className="dashboard-weight-top">
              <div className="dashboard-weight-summary">
                <div className="dashboard-weight-summary-line">
                  <div className="stat-label">Current weight</div>
                  <div className="brand-macro-value">
                    {currentWeight ?? '--'}
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
            <div className="dashboard-weight-chart">
              {chartData.length ? (
                <ResponsiveContainer>
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: compactChart ? -2 : 4, bottom: 0 }}
                  >
                    <CartesianGrid stroke="var(--edge)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: 'var(--muted)', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'var(--muted)', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={compactChart ? 34 : 42}
                    />
                    <Tooltip formatter={(value) => [`${value} lb`, 'Weight']} contentStyle={{ background: 'var(--elev)', border: '1px solid var(--edge)', borderRadius: 14 }} />
                    {goalWeight != null ? <ReferenceLine y={goalWeight} stroke="var(--ok)" strokeDasharray="4 4" /> : null}
                    <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={3} dot={{ r: 2, fill: 'var(--accent)' }} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="dashboard-weight-empty">Save a weight to start the trend line.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </article>
  );
}
