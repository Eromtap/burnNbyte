'use client';
import { useState } from 'react';

//// THIS COMPONENT IS FOR TESTING ONLY AND WILL BE DELETED


export default function WorkoutForm() {
  const [formData, setFormData] = useState({
    userId: 'cmb74jcc70000vit093ob6lp3',
    name: '',
    description: '',
    duration: '',
    difficulty: '',
    date: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          duration: parseInt(formData.duration),
          date: new Date(formData.date).toISOString(),
        }),
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();
      console.log('Workout created:', data);
      alert('Workout created successfully!');

      setFormData({
        userId: 'cmb74jcc70000vit093ob6lp3',
        name: '',
        description: '',
        duration: '',
        difficulty: '',
        date: '',
      });
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to create workout.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="userId" value={formData.userId} onChange={handleChange} required />
      <input name="name" placeholder="Workout Name" value={formData.name} onChange={handleChange} required />
      <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} />
      <input name="duration" type="number" placeholder="Duration (minutes)" value={formData.duration} onChange={handleChange} required />
      <input name="difficulty" placeholder="Difficulty" value={formData.difficulty} onChange={handleChange} />
      <input name="date" type="date" value={formData.date} onChange={handleChange} required />
      <button type="submit">Create Workout</button>
    </form>
  );
}
