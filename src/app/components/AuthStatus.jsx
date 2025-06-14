'use client';
import { useSession, signOut } from "next-auth/react";

export default function AuthStatus() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;
  if (!session) return null;

  return (
    <div style={{ marginBottom: "1rem" }}>
      <p>Signed in as {session.user.name}</p>
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  );
}
