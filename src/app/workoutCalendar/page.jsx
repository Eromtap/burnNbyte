'use client';

import { useState, useEffect } from 'react';
import Calendar from '../components/Calendar';



export default function WorkoutCalendar() {

  return (
    <>
      <div className="calendar-container">
        <Calendar 
            dataSource="/api/workouts"
            calendarTitle="Workout Calendar"/>
      </div>
    </>
  )
}
