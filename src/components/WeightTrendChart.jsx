'use client';

import { useEffect, useRef, useState } from 'react';
import { ResponsiveContainer, Line, LineChart, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

const WEIGHT_DOMAIN = [
  (dataMin) => Math.round((Number(dataMin) - 10) / 10) * 10,
  (dataMax) => Math.round((Number(dataMax) + 10) / 10) * 10,
];

function formatDateLabel(label) {
  try {
    const date = new Date(label);
    if (Number.isNaN(date.getTime())) return label;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  } catch {
    return label;
  }
}

function WeightDot({ cx, cy, payload, onSelect }) {
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="var(--accent)"
      stroke="transparent"
      strokeWidth={14}
      style={{ cursor: 'pointer' }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(payload);
      }}
    />
  );
}

export default function WeightTrendChart({
  points = [],
  goalWeight = null,
  height = 164,
  margin = { top: 8, right: 8, left: 4, bottom: 0 },
  yAxisWidth = 52,
  yDomain = WEIGHT_DOMAIN,
  renderSelection,
}) {
  const chartRef = useRef(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [tooltipDismissed, setTooltipDismissed] = useState(false);

  useEffect(() => {
    setSelectedEntry(null);
  }, [points]);

  useEffect(() => {
    function dismissSelection(event) {
      if (chartRef.current?.contains(event.target)) return;
      setSelectedEntry(null);
      setTooltipDismissed(true);
    }

    document.addEventListener('pointerdown', dismissSelection);
    return () => document.removeEventListener('pointerdown', dismissSelection);
  }, []);

  const chartData = points.map((point) => ({ ...point, label: formatDateLabel(point.date) }));

  function selectEntry(entry) {
    if (!entry?.id) return;
    setSelectedEntry(entry);
    setTooltipDismissed(false);
  }

  function handleChartClick(event, point) {
    const entry = event?.activePayload?.[0]?.payload ?? point?.payload ?? event?.payload;
    if (entry?.id) {
      selectEntry(entry);
    } else {
      setSelectedEntry(null);
    }
  }

  return (
    <div ref={chartRef}>
      <div className="dashboard-weight-chart" style={{ height }}>
        <ResponsiveContainer>
          <LineChart
            data={chartData}
            margin={margin}
            onClick={handleChartClick}
            onMouseMove={() => setTooltipDismissed(false)}
          >
            <CartesianGrid stroke="var(--edge)" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis domain={yDomain} tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={false} width={yAxisWidth} />
            <Tooltip active={tooltipDismissed ? false : undefined} formatter={(value) => [`${value} lb`, 'Weight']} contentStyle={{ background: 'var(--elev)', border: '1px solid var(--edge)', borderRadius: 14 }} />
            {goalWeight != null ? <ReferenceLine y={goalWeight} stroke="var(--ok)" strokeDasharray="4 4" /> : null}
            <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={3} dot={(props) => <WeightDot {...props} onSelect={selectEntry} />} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {selectedEntry && renderSelection?.(selectedEntry)}
    </div>
  );
}
