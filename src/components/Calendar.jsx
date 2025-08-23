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
            const data = await response.json();
            return data.map((event) => ({
              title: type,
              date: event.date.split("T")[0],
              extendedProps: {
                name: event.name,
                description: event.description,
                duration: event.duration,
                difficulty: event.difficulty,
                muscleGroup: event.muscleGroup,
                equipment: event.equipment,
                instructions: event.instructions,
                type,
              },
            }));
          })
        );
        setEvents(allData.flat());
      } catch (error) {
        console.error("Error fetching calendar data:", error);
      }
    };

    fetchAllData();
  }, [dataSources]);

  const handleEventClick = (info) => {
    setSelectedEvent({
      type: info.event.extendedProps.type,
      name: info.event.extendedProps.name,
      description: info.event.extendedProps.description,
      date: info.event.startStr,
      duration: info.event.extendedProps.duration,
      difficulty: info.event.extendedProps.difficulty,
      muscleGroup: info.event.extendedProps.muscleGroup,
      equipment: info.event.extendedProps.equipment,
      instructions: info.event.extendedProps.instructions
    });
  };

  const renderEventContent = (eventInfo) => {
    const type = eventInfo.event.extendedProps.type;
    const label = type === 'workout' ? 'Workout' : 'Diet';
    const bgColor = type === 'workout' ? 'bg-blue-500' : 'bg-green-500';

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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold">{selectedEvent.name}</h2>
            <p className="mt-2 text-gray-600">{selectedEvent.description}</p>
            <p className="mt-2 text-gray-600">{selectedEvent.date}</p>
            <p className="mt-2 text-gray-600">Duration: {selectedEvent.duration} minutes.</p>
            <p className="mt-2 text-gray-600">Difficulty: {selectedEvent.difficulty}</p>
            <p className="mt-2 text-gray-600">Muscle Group: {selectedEvent.muscleGroup}</p>
            <p className="mt-2 text-gray-600"></p>
            <p>-------------------------------------</p>
            <div>
              Equipment:
              <ul className="mt-2 text-gray-600">
                {Array.isArray(selectedEvent.equipment) &&
                  selectedEvent.equipment.map((line, index) => (
                    <li key={index}>-- {line.trim()}</li>
                  ))}
              </ul>
            </div>
            <p>-------------------------------------</p>
            <div>
              Instructions:
              <ul className="mt-2 text-gray-600">
                {Array.isArray(selectedEvent.instructions) &&
                  selectedEvent.instructions.map((line, index) => (
                    <li key={index}>-- {line.trim()}</li>
                  ))}
              </ul>
            </div>
            <p className="mt-2 text-sm italic text-gray-500">{
                  selectedEvent.type === 'workout' ? 'Workout' : 'Meal Plan'}
            </p>
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


// TODO: need to render workouts and meals differently. may need separate 
// components. not sure yet