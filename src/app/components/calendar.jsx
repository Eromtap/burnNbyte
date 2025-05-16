'use client';

import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

const Calendar = () => {
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [workouts, setWorkouts] = useState([]);

  // const workouts = [
  //   { title: "Leg Day 🦵", date: "2025-04-10", description: "Squats, Lunges, Deadlifts" },
  //   { title: "Chest & Triceps 💪", date: "2025-04-12", description: "Bench Press, Dips, Push-ups" },
  //   { title: "Cardio 🏃", date: "2025-04-15", description: "Running, Cycling, Jump Rope" }
  // ];





  useEffect(() => {
    const fetchWorkouts = async () => {
      try {
        const response = await fetch('/api/workouts');
        const data = await response.json();
        setWorkouts(data);
      } catch (error) {
        console.error("Error fetching workouts: ", error);
      }
    };

    fetchWorkouts();
  }, []);





  const handleEventClick = (info) => {
    setSelectedWorkout({
      name: info.event.title,
      description: info.event.extendedProps.description,
    });
  };

  return (
    <div className="min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Workout Calendar</h2>
      {/* <div className="calendar-container" style={{ width: '100%', height: '100vh' }}> */}
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={workouts.map((workout) => ({
          title: workout.name,
          date: workout.date.split("T")[0],
          extendedProps: { description: workout.description },
        }))}
        eventClick={handleEventClick}
        height="auto"
      />
      {/* </div> */}

      {/* Custom Modal for Workout Details */}
      {selectedWorkout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold">{selectedWorkout.name}</h2>
            <p className="mt-2 text-gray-600">{selectedWorkout.description}</p>
            <p className="mt-2 text-gray-600">{selectedWorkout.date}</p>

            <button
              onClick={() => setSelectedWorkout(null)}
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
