// app/page.js

"use client";

import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  const [formData, setFormData] = useState({
    userId: 'cmb74jcc70000vit093ob6lp3', //hardcoded userid
    name: '',
    description: '',
    duration: '',
    difficulty: '',
    date: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          duration: parseInt(formData.duration), // convert duration to number
          date: new Date(formData.date).toISOString(), // make sure date is in ISO format
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log('Workout created:', data);

      // Optionally reset form
      setFormData({
        userId: 'cmb74jcc70000vit093ob6lp3', /// Hardcoded userid
        name: '',
        description: '',
        duration: '',
        difficulty: '',
        date: '',
      });
      alert('Workout created successfully!');
    } catch (error) {
      console.error('Error creating workout:', error);
      alert('Failed to create workout.');
    }
  };

  return (
    <main>
      <h1>Welcome to Burn-N-Byte!</h1>
      <p>This is the main landing page.</p>
      <div>
        <Link href="/workoutCalendar">
          <button>Workout Calendar</button>
        </Link>
      </div>

      
      <h2>Create a New Workout</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="userId"
          placeholder="User ID"
          value={formData.userId}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="name"
          placeholder="Workout Name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <textarea
          name="description"
          placeholder="Description"
          value={formData.description}
          onChange={handleChange}
        />
        <input
          type="number"
          name="duration"
          placeholder="Duration (minutes)"
          value={formData.duration}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="difficulty"
          placeholder="Difficulty"
          value={formData.difficulty}
          onChange={handleChange}
        />
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
        />
        <button type="submit">Create Workout</button>
      </form>
    </main>
  );
}


/* TODO: add login so we can have userId filled out. 
   Using hardcoded default for now. need to remove the hardcoded ones above

   Also, we likely want this on a different page so the form will
   likely be removed from the home page. This is testing

*/