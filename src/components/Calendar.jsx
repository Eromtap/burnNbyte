
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
    setSelectedEvent({
      type: info.event.extendedProps.type,
      ...info.event.extendedProps,
      date: info.event.startStr,
    });
  };

  const renderEventContent = (eventInfo) => {
    const type = eventInfo.event.extendedProps.type;
    const label = type === 'workout' ? 'Workout' : 'Meal Plan';
    const bgColor = type === 'workout' ? 'bg-blue-500' : 'bg-gray-500';

    return (
      <button
        className={`text-white text-xs px-2 py-1 rounded ${bgColor} hover:opacity-90`}
        onClick={(e) => {
          e.preventDefault();
          handleEventClick(eventInfo);
        }}
      >
        {label}
      </button>
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
    <div className="min-h-screen">
      <h2 className="text-2xl font-bold mb-4">{calendarTitle}</h2>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        eventContent={renderEventContent}
        height="auto"
      />

      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-2">
              {selectedEvent.type === 'workout' ? selectedEvent.name : 'Meal Plan'}
            </h2>
            <p className="text-gray-600 mb-4">{selectedEvent.date}</p>

            {selectedEvent.type === 'workout' && (
              <>
                <p>Duration: {selectedEvent.duration} minutes</p>
                <p>Difficulty: {selectedEvent.difficulty}</p>
                <p>Muscle Group: {selectedEvent.muscleGroup}</p>
                <div className="mt-2">
                  <strong>Equipment:</strong>
                  <ul className="ml-4 list-disc">
                    {Array.isArray(selectedEvent.equipment) &&
                      selectedEvent.equipment.map((line, idx) => (
                        <li key={idx}>{line.trim()}</li>
                      ))}
                  </ul>
                </div>
                <div className="mt-2">
                  <strong>Instructions:</strong>
                  <ul className="ml-4 list-disc">
                    {Array.isArray(selectedEvent.instructions) &&
                      selectedEvent.instructions.map((line, idx) => (
                        <li key={idx}>{line.trim()}</li>
                      ))}
                  </ul>
                </div>
              </>
            )}

            {selectedEvent.type === 'mealPlan' && (
              <div className="mt-4">
                {Object.entries(groupMealsByType(selectedEvent.meals)).map(([type, meals]) => (
                  <div key={type} className="mb-4">
                    <h3 className="font-semibold text-lg mb-1 capitalize border-b border-gray-300 pb-1">{type}</h3>
                    {meals.map((meal) => (
                      <div key={meal.id} className="mb-2 p-2 bg-gray-50 rounded">
                        <p className="font-medium">{meal.name} ({meal.calories ?? 'N/A'} cal)</p>
                        {meal.ingredients.length > 0 && (
                          <ul className="ml-4 list-disc text-gray-700">
                            {meal.ingredients.map((ing, idx) => (
                              <li key={idx}>{ing}</li>
                            ))}
                          </ul>
                        )}
                        {meal.recipe && <p className="mt-1 text-sm italic">Recipe: {meal.recipe}</p>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setSelectedEvent(null)}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;

