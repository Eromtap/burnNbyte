'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';

function toYMDLocal(d){
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth()+1).padStart(2,'0');
  const day = String(x.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function addDaysLocal(d, n){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function startOfWeekLocal(d){ const x = new Date(d); const dow = x.getDay(); return addDaysLocal(x, -dow); }
function parseYMDLocal(ymd){
  if (!ymd) return new Date();
  const [y,m,d] = ymd.split('-').map(Number);
  return new Date(y, (m||1)-1, d||1);
}

export default function DateStrip({ basePath, selectedISO, span = 7 }){
  const [weekOffset, setWeekOffset] = useState(0);
  const selectedDate = useMemo(() => parseYMDLocal(selectedISO) , [selectedISO]);
  const start = useMemo(() => addDaysLocal(startOfWeekLocal(selectedDate), weekOffset * 7), [selectedDate, weekOffset]);
  const days = useMemo(() => Array.from({ length: span }, (_, i) => addDaysLocal(start, i)), [start, span]);

  return (
    <div className="date-strip">
      <button className="btn btn-ghost" aria-label="Previous" onClick={() => setWeekOffset(o => o - 1)}>‹</button>
      <div className="date-strip-scroll">
        {days.map((d) => {
          const iso = toYMDLocal(d);
          const active = iso === selectedISO;
          const dow = d.toLocaleDateString(undefined, { weekday: 'short' });
          const dom = d.getDate();
          return (
            <Link key={iso} href={`${basePath}?date=${iso}`} className={`date-pill ${active ? 'date-pill-active' : ''}`}>
              <span className="dow">{dow}</span>
              <span className="dom">{dom}</span>
            </Link>
          );
        })}
      </div>
      <button className="btn btn-ghost" aria-label="Next" onClick={() => setWeekOffset(o => o + 1)}>›</button>
    </div>
  );
}
