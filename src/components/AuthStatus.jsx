
'use client';
import { useSession, signOut } from 'next-auth/react';

export default function AuthStatus() {
  const { data: session, status } = useSession();

  if (status === 'loading') return null;

  return (
    <div style={{ marginBottom: '1rem' }}>
      {session ? (
        <>
          <p>Signed in as {session.user.name}</p>
          <p>Prefs: {session.user.preferences.fitnessGoal}</p>
          <button onClick={() => signOut()}>Sign out</button>
        </>
      ) : (
        <p>Not signed in</p>
      )}
    </div>
  );
}

// TODO: remove prefs display
// Prefs displayed just to make sure the userProfile is being sent to session