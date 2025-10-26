'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';

export default function MiniCalendar({ dataSources, height = 260 }) {
  const [events, setEvents] = useState([]);
  const router = useRouter();
  const calendarRef = useRef(null);
  const [viewDate, setViewDate] = useState(() => new Date());

  const monthLabel = viewDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  useEffect(() => {
    let active = true;
    async function fetchAll() {
      try {
        const all = await Promise.all(
          (dataSources || []).map(async ({ url, type }) => {
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) throw new Error(`Failed to fetch ${type}`);
            const data = await res.json();
            return data.map((item) => ({
              type,
              date: (item.date || '').split('T')[0],
              workout: type === 'workout' ? item : null,
              meals: type === 'mealPlan' ? (item.meals || []) : [],
              createdAt: item.createdAt || null,
            }));
          })
        );

        const merged = {};
        all.flat().forEach((item) => {
          const key = item.date;
          if (!key) return;
          if (!merged[key]) merged[key] = { workouts: [], mealPlan: null };
          if (item.workout) merged[key].workouts.push(item.workout);
          if (item.meals.length) {
            const existing = merged[key].mealPlan;
            if (!existing || new Date(item.createdAt) > new Date(existing.createdAt)) {
              merged[key].mealPlan = item;
            }
          }
        });

        const calEvents = Object.entries(merged).flatMap(([date, value]) => {
          const out = [];
          value.workouts.forEach(() => out.push({ title: 'Workout', date, url: `/workouts?date=${date}`, extendedProps: { type: 'workout' } }));
          if (value.mealPlan) out.push({ title: 'Meal Plan', date, url: `/meals?date=${date}`, extendedProps: { type: 'mealPlan' } });
          return out;
        });

        if (active) setEvents(calEvents);
      } catch (e) {
        if (active) setEvents([]);
        // silent fail for dashboard widget
      }
    }
    fetchAll();
    return () => { active = false; };
  }, [dataSources]);

  return (
    <div>
      <div className="list-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <button className="btn btn-ghost" aria-label="Previous month" onClick={() => {
          const api = calendarRef.current?.getApi?.();
          if (api) { api.prev(); setViewDate(api.getDate()); }
        }}>‹</button>
        <div className="page-title" style={{ fontSize: 16, fontWeight: 700 }}>{monthLabel}</div>
        <button className="btn btn-ghost" aria-label="Next month" onClick={() => {
          const api = calendarRef.current?.getApi?.();
          if (api) { api.next(); setViewDate(api.getDate()); }
        }}>›</button>
      </div>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        events={events}
        height={height}
        headerToolbar={{ left: '', center: '', right: '' }}
        dayMaxEventRows={2}
        fixedWeekCount={false}
        eventClick={(info) => {
          info.jsEvent?.preventDefault?.();
          const url = info.event?.url;
          if (url) router.push(url);
        }}
        datesSet={(arg) => {
          // Keep label in sync with current view's anchor date
          try { setViewDate(arg.view?.currentStart || arg.start || new Date()); } catch {}
        }}
      />
    </div>
  );
}
