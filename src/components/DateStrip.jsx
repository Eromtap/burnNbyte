'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const selectedDate = useMemo(() => parseYMDLocal(selectedISO) , [selectedISO]);
  const start = useMemo(() => startOfWeekLocal(selectedDate), [selectedDate]);
  const days = useMemo(() => Array.from({ length: span }, (_, i) => addDaysLocal(start, i)), [start, span]);
  const mid = useMemo(() => addDaysLocal(start, Math.floor(span/2)), [start, span]);
  const monthLabel = useMemo(() => mid.toLocaleString(undefined, { month: 'long', year: 'numeric' }), [mid]);

  return (
    <div>
      <div className="list-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <button className="btn btn-ghost" aria-label="Previous week" onClick={() => {
          const prev = addDaysLocal(selectedDate, -7);
          router.push(`${basePath}?date=${toYMDLocal(prev)}`);
        }}>‹</button>
        <div className="page-title" style={{ fontSize: 18, fontWeight: 800 }}>{monthLabel}</div>
        <button className="btn btn-ghost" aria-label="Next week" onClick={() => {
          const next = addDaysLocal(selectedDate, 7);
          router.push(`${basePath}?date=${toYMDLocal(next)}`);
        }}>›</button>
      </div>
      <div className="date-strip">
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
      </div>
    </div>
  );
}
