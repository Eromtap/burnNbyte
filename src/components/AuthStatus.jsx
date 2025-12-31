'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { labelForFitnessGoal } from '@/constants/fitnessGoals';

export default function AuthStatus() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <p>Loading...</p>;
  if (!session) return <p>Not signed in</p>;

  const prefs = session.user?.preferences ?? null;
  const goals = Array.isArray(prefs?.fitnessGoals) ? prefs.fitnessGoals : [];
  const goal = goals.length
    ? goals.map((g) => labelForFitnessGoal(g)).join(', ')
    : (prefs?.fitnessGoal ?? '--');

  return (
    <>
      <p>Signed in as {session.user.name}</p>
      <p>Prefs: {goal}</p>
      {!prefs && (
        <p className="text-sm text-gray-500">
          No preferences yet.{" "}
          <Link href="/onboarding/1" className="underline">
            Complete onboarding
          </Link>
        </p>
      )}
      <button onClick={() => signOut()}>Sign out</button>
    </>
  );
}

// TODO: remove prefs display
// Prefs displayed just to make sure the userProfile is being sent to session
