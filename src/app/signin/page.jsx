'use client';
import { signIn, getSession } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // using next/navigation for App Router

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    const result = await signIn("credentials", {
      redirect: false, // disable auto-redirect
      email,
      password,
    });

    if (result?.error) {
      alert("Login failed: " + result.error);
    } else if (result?.ok) {
      // Fetch user profile to check if onboarding is needed
      const profileRes = await fetch("/api/user/profile"); 
      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (!profile || !profile.preferencesFilledOut) {
          router.push("/onboarding/1");
        } else {
          router.push("/");
        }
      } else {
        // fallback if API fails
        router.push("/");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>Email</label>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />

      <label>Password</label>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />

      <button type="submit">Sign In</button>
      
      <p>
        Don't have an account? <Link href="/signup">Sign Up</Link>
      </p>
    </form>
  );
}
