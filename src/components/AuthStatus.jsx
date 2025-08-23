'use client';

import { useSession, signOut } from 'next-auth/react';

export default function AuthStatus() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <p>Loading…</p>;
  if (!session) return <p>Not signed in</p>;

  const prefs = session.user?.preferences ?? null;
  const goal = prefs?.fitnessGoal ?? '—';

  return (
    <>
      <p>Signed in as {session.user.name}</p>
      <p>Prefs: {goal}</p>
      {!prefs && (
        <p className="text-sm text-gray-500">
          No preferences yet. <a href="/onboarding/1" className="underline">Complete onboarding</a>
        </p>
      )}
      <button onClick={() => signOut()}>Sign out</button>
    </>
  );
}

// TODO: remove prefs display
// Prefs displayed just to make sure the userProfile is being sent to session