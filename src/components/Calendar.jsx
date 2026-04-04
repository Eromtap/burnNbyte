
'use client';

import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

const Calendar = ({ calendarTitle, dataSources, initialEvents = [] }) => {
  const [events, setEvents] = useState(initialEvents);

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
            classNames: ['event-workout'],
            extendedProps: { type: 'workout', ...w },
          });
        });

        if (value.mealPlan) {
          eventsArray.push({
            title: 'Meal Plan',
            date,
            classNames: ['event-meal'],
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
    } else {
      window.location.href = `/meals?date=${info.event.startStr}`;
    }
  };

  const renderEventContent = (eventInfo) => {
    const type = eventInfo.event.extendedProps.type;
    const label = type === 'workout' ? 'Workout' : 'Meal Plan';
    return (
      <span
        className="calendar-pill"
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
    </div>
  );
};

export default Calendar;
