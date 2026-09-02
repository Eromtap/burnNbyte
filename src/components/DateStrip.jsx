'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

function toYMDLocal(d){
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth()+1).padStart(2,'0');
  const day = String(x.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function addDaysLocal(d, n){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function parseYMDLocal(ymd){
  if (!ymd) return new Date();
  const [y,m,d] = ymd.split('-').map(Number);
  return new Date(y, (m||1)-1, d||1);
}

export default function DateStrip({ basePath, selectedISO, span = 7, onSelectDate, onShiftWeek }){
  const router = useRouter();
  const selectedDate = useMemo(() => parseYMDLocal(selectedISO) , [selectedISO]);
  const [windowStart, setWindowStart] = useState(() => new Date(selectedDate));
  // Keep the selected date visible, but do not slide the whole window when the
  // user taps another day already on screen.
  useEffect(() => {
    setWindowStart((current) => {
      const startISO = toYMDLocal(current);
      const endISO = toYMDLocal(addDaysLocal(current, span - 1));
      return selectedISO >= startISO && selectedISO <= endISO ? current : new Date(selectedDate);
    });
  }, [selectedDate, selectedISO, span]);
  const start = windowStart;
  const days = useMemo(() => Array.from({ length: span }, (_, i) => addDaysLocal(start, i)), [start, span]);
  const monthLabel = useMemo(() => start.toLocaleString(undefined, { month: 'long', year: 'numeric' }), [start]);
  const isInteractive = typeof onSelectDate === 'function';

  function shiftWeek(direction){
    if (typeof onShiftWeek === 'function') {
      onShiftWeek(direction);
      return;
    }
    const nextDate = addDaysLocal(windowStart, direction * 7);
    setWindowStart(nextDate);
    const href = `${basePath}?date=${toYMDLocal(nextDate)}`;
    window.dispatchEvent(new CustomEvent('bn:navigation-start', { detail: { href: new URL(href, window.location.href).href } }));
    router.push(href);
  }

  return (
    <div className="card date-strip">
      <div className="date-strip-head">
        <button type="button" className="btn btn-ghost" aria-label="Previous week" onClick={() => shiftWeek(-1)}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M14.78 5.22a.75.75 0 0 1 0 1.06L9.06 12l5.72 5.72a.75.75 0 1 1-1.06 1.06l-6.25-6.25a.75.75 0 0 1 0-1.06l6.25-6.25a.75.75 0 0 1 1.06 0Z"/></svg>
        </button>
        <div className="page-title" style={{ fontSize: 18, fontWeight: 800 }}>{monthLabel}</div>
        <button type="button" className="btn btn-ghost" aria-label="Next week" onClick={() => shiftWeek(1)}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M9.22 18.78a.75.75 0 0 1 0-1.06L14.94 12 9.22 6.28a.75.75 0 1 1 1.06-1.06l6.25 6.25a.75.75 0 0 1 0 1.06l-6.25 6.25a.75.75 0 0 1-1.06 0Z"/></svg>
        </button>
      </div>
      <div className="date-strip-scroll">
        {days.map((d) => {
          const iso = toYMDLocal(d);
          const active = iso === selectedISO;
          const dow = d.toLocaleDateString(undefined, { weekday: 'short' });
          const dom = d.getDate();
          if (isInteractive) {
            return (
              <button
                key={iso}
                type="button"
                className={`date-pill ${active ? 'date-pill-active' : ''}`}
                aria-pressed={active}
                onClick={() => onSelectDate(iso)}
              >
                <span className="dow">{dow}</span>
                <span className="dom">{dom}</span>
              </button>
            );
          }
          return (
            <Link key={iso} href={`${basePath}?date=${iso}`} className={`date-pill ${active ? 'date-pill-active' : ''}`}>
              <span className="dow">{dow}</span>
              <span className="dom">{dom}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
