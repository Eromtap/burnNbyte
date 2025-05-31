// app/page.js (landing page)

import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <h1>Welcome to Burn-N-Byte!</h1>
      <p>This is the main landing page.</p>
      <div>
      <Link href="/workoutCalendar"><button>Workout Calendar</button></Link>
      </div>
    </main>
  );
}