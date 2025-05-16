'use client';

import { useState, useEffect } from 'react';
import Calendar from './components/calendar';



function App() {

  const [meals, setMeals] = useState({});

//   useEffect(() => {
//     axios.get('http://localhost:4000/workouts')
//     .then(res => setMeals(res.data));
//     console.log(meals);
//   }, []);




  return (
    <>
      <div className="calendar-container">
        <Calendar />
      </div>
    </>
  )
}

export default App