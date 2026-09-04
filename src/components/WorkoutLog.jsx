'use client';

import MobileDisclosure from '@/components/MobileDisclosure';

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return hours ? `${hours}h ${remainder}m` : `${remainder} min`;
}

function formatExerciseLog(log) {
  if (log.type === 'weighted') {
    const volume = [log.sets && `${log.sets} sets`, log.reps && `${log.reps} reps`].filter(Boolean).join(' × ');
    const weight = log.weight != null ? `${log.weight} lb` : '';
    return [volume, weight].filter(Boolean).join(' @ ') || 'Logged';
  }

  if (log.type === 'cardio') {
    const distance = Number(log.distance);
    const pace = Number(log.pace);
    const derivedDuration = Number.isFinite(distance) && Number.isFinite(pace) ? distance * pace : null;
    return [
      Number.isFinite(distance) ? `${distance} mi` : '',
      Number.isFinite(pace) ? `${pace} min/mi` : '',
      formatDuration(derivedDuration),
    ].filter(Boolean).join(' · ') || 'Logged';
  }

  return 'Logged';
}

export default function WorkoutLog({ sessions = [] }) {
  return (
    <section className="section-grid bn-route-grid workout-log-section">
      <article className="card span-full">
        <header className="card-head">
          <div>
            <div className="sub">Your logged sessions and the performance details you recorded.</div>
          </div>
          {sessions.length > 0 && <div className="section-badge section-badge-workout">{sessions.length} sessions</div>}
        </header>

        {sessions.length === 0 ? (
          <div className="list-row"><span className="muted">Log an exercise to start your workout log. Lifting weights, sets, reps, distance, and pace will appear here.</span></div>
        ) : (
          <div className="stack">
            {sessions.map((session) => {
              const logs = Array.isArray(session.exerciseLogs) ? session.exerciseLogs : [];
              return (
                <MobileDisclosure
                  key={session.id}
                  className="mobile-disclosure detail-disclosure workout-log-session"
                  summaryClassName="mobile-disclosure-summary detail-disclosure-summary"
                  panelClassName="mobile-disclosure-panel"
                  collapseOnDesktop
                  summary={(
                    <>
                      <span>
                        <strong>{session.name}</strong>
                        <small className="workout-log-date">
                          {formatDate(session.completedAt || session.date)} · {logs.length} logged item{logs.length === 1 ? '' : 's'} · {session.isCompleted ? 'Completed' : 'Not completed'}
                        </small>
                      </span>
                      <span className="mobile-disclosure-meta">{session.duration || 0} min</span>
                    </>
                  )}
                >
                  {logs.length === 0 ? (
                    <div className="list-row"><span className="muted">No exercise metrics logged.</span></div>
                  ) : (
                    <ul className="list">
                      {logs.map((log) => (
                        <li key={log.id} className="list-row">
                          <span>{log.exerciseName}</span>
                          <span className="muted">{formatExerciseLog(log)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </MobileDisclosure>
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}
