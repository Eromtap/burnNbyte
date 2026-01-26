'use client';
import { useMemo } from 'react';

function normalizeSuggestions(list) {
  if (!Array.isArray(list)) return [];
  const cleaned = list
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
  return Array.from(new Set(cleaned));
}

export default function ExerciseVideoPanel({ exerciseSuggestions = [] }) {
  const exercises = useMemo(
    () => normalizeSuggestions(exerciseSuggestions),
    [exerciseSuggestions]
  );

  if (exercises.length === 0) return null;

  return (
    <div>
      <div className="planner-head">Exercise demos</div>
      <div className="muted" style={{ marginTop: 4 }}>
        Open YouTube search results for each exercise.
      </div>
      <div className="stack" style={{ marginTop: 12 }}>
        {exercises.map((name) => {
          const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
            `${name} exercise demo`
          )}`;
          return (
            <div key={name} className="card" style={{ padding: 12 }}>
              <div className="list-row" style={{ alignItems: 'center' }}>
                <div>{name}</div>
                <a className="btn" href={searchUrl} target="_blank" rel="noreferrer">
                  Search on YouTube
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
