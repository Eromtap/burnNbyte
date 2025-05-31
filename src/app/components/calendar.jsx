'use client';

// Reusable calandar component. Pass datasource and name.


import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

const Calendar = ({ dataSource, calendarTitle }) => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(dataSource);
        const data = await response.json();
        setEvents(data);
      } catch (error) {
        console.error("Error fetching data: ", error);
      }
    };

    fetchData();
  }, [dataSource]); // refetch if the data source changes

  const handleEventClick = (info) => {
    setSelectedEvent({
      name: info.event.title,
      description: info.event.extendedProps.description,
      date: info.event.startStr,  // fallback for displaying date
    });
  };

  return (
    <div className="min-h-screen">
      <h2 className="text-2xl font-bold mb-4">{calendarTitle}</h2>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events.map((event) => ({
          title: event.name,
          date: event.date.split("T")[0],
          extendedProps: { description: event.description },
        }))}
        eventClick={handleEventClick}
        height="auto"
      />

      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold">{selectedEvent.name}</h2>
            <p className="mt-2 text-gray-600">{selectedEvent.description}</p>
            <p className="mt-2 text-gray-600">{selectedEvent.date}</p>

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
