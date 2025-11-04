
'use client';

import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

const Calendar = ({ calendarTitle, dataSources }) => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
  const fetchAllData = async () => {
    try {
      const allData = await Promise.all(
        dataSources.map(async ({ url, type }) => {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Failed to fetch ${type}`);
          const data = await response.json();

          return data.map((item) => ({
            type,
            date: item.date.split('T')[0],
            workout: type === 'workout' ? item : null,
            meals: type === 'mealPlan' ? item.meals : [],
            createdAt: item.createdAt, // keep createdAt for sorting
          }));
        })
      );

      // Merge by date, pick only the most recent meal plan
      const mergedEvents = {};
      allData.flat().forEach((item) => {
        const key = item.date;
        if (!mergedEvents[key]) mergedEvents[key] = { workouts: [], mealPlan: null };

        if (item.workout) {
          mergedEvents[key].workouts.push(item.workout);
        }

        if (item.meals.length) {
          const existing = mergedEvents[key].mealPlan;
          if (!existing || new Date(item.createdAt) > new Date(existing.createdAt)) {
            mergedEvents[key].mealPlan = item; // keep only the most recent
          }
        }
      });

      // Convert to FullCalendar events
      const calendarEvents = Object.entries(mergedEvents).map(([date, value]) => {
        const eventsArray = [];

        value.workouts.forEach((w) => {
          eventsArray.push({
            title: 'Workout',
            date,
            extendedProps: { type: 'workout', ...w },
          });
        });

        if (value.mealPlan) {
          eventsArray.push({
            title: 'Meal Plan',
            date,
            extendedProps: { type: 'mealPlan', meals: value.mealPlan.meals },
          });
        }

        return eventsArray;
      }).flat();

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    }
  };

  fetchAllData();
}, [dataSources]);

  const handleEventClick = (info) => {
    const type = info.event.extendedProps.type;
    if (type === 'workout') {
      window.location.href = `/workouts?date=${info.event.startStr}`;
      return;
    }
    setSelectedEvent({
      type,
      ...info.event.extendedProps,
      date: info.event.startStr,
    });
  };

  const renderEventContent = (eventInfo) => {
    const type = eventInfo.event.extendedProps.type;
    const label = type === 'workout' ? 'Workout' : 'Meal Plan';
    return (
      <span
        className="pill"
        onClick={(e) => {
          e.preventDefault();
          handleEventClick(eventInfo);
        }}
        style={{ cursor: 'pointer' }}
      >
        {label}
      </span>
    );
  };

  // Helper to group meals by type
  const groupMealsByType = (meals) => {
    return meals.reduce((acc, meal) => {
      const type = meal.type.toLowerCase();
      if (!acc[type]) acc[type] = [];
      acc[type].push(meal);
      return acc;
    }, {});
  };

  return (
    <div>
      <h2 className="page-title" style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>{calendarTitle}</h2>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        eventContent={renderEventContent}
        height="auto"
      />

      {selectedEvent && (
        <div className="modal" aria-hidden="false" role="dialog" aria-modal="true" aria-labelledby="calModalTitle">
          <div className="modal-backdrop" onClick={() => setSelectedEvent(null)} />
          <div className="modal-dialog">
            <header className="modal-head">
              <h3 id="calModalTitle">{selectedEvent.type === 'workout' ? selectedEvent.name : 'Meal Plan'}</h3>
              <button className="btn btn-ghost" onClick={() => setSelectedEvent(null)} aria-label="Close">✕</button>
            </header>
            <div className="modal-body">
              <div className="muted">{selectedEvent.date}</div>

              {selectedEvent.type === 'workout' && (
                <div className="stack" style={{ marginTop: 8 }}>
                  <div className="list-row"><span>Duration</span><span className="muted">{selectedEvent.duration} minutes</span></div>
                  {selectedEvent.difficulty && (<div className="list-row"><span>Difficulty</span><span className="muted">{selectedEvent.difficulty}</span></div>)}
                  {selectedEvent.muscleGroup && (<div className="list-row"><span>Muscle</span><span className="muted">{selectedEvent.muscleGroup}</span></div>)}
                  {Array.isArray(selectedEvent.equipment) && selectedEvent.equipment.length > 0 && (
                    <div>
                      <div className="planner-head">Equipment</div>
                      <ul className="list" style={{ marginTop: 8 }}>
                        {selectedEvent.equipment.map((line, idx) => (<li key={idx} className="list-row"><span>{line.trim()}</span></li>))}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(selectedEvent.instructions) && selectedEvent.instructions.length > 0 && (
                    <div>
                      <div className="planner-head">Instructions</div>
                      <ul className="list" style={{ marginTop: 8 }}>
                        {selectedEvent.instructions.map((line, idx) => (<li key={idx} className="list-row"><span>{line.trim()}</span></li>))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {selectedEvent.type === 'mealPlan' && (
                <div className="stack" style={{ marginTop: 8 }}>
                  {Object.entries(groupMealsByType(selectedEvent.meals)).map(([type, meals]) => (
                    <div key={type}>
                      <div className="planner-head" style={{ textTransform: 'capitalize' }}>{type}</div>
                      <ul className="list" style={{ marginTop: 8 }}>
                        {meals.map((meal) => (
                          <li key={meal.id} className="list-row">
                            <span>{meal.name}</span>
                            <span className="muted">{meal.calories ?? 'N/A'} cal</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <footer className="modal-foot">
              <button className="btn btn-secondary" onClick={() => setSelectedEvent(null)}>Close</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
