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

    // const result = await signIn("credentials", {
    //   redirect: false, // disable auto-redirect
    //   email,
    //   password,
    // });

    // if (result?.error) {
    //   alert("Login failed: " + result.error);
    // } else if (result?.ok) {
    //   // Fetch user profile to check if onboarding is needed
    //   const profileRes = await fetch("/api/user/profile"); 
    //   if (profileRes.ok) {
    //     const profile = await profileRes.json();
    //     if (!profile || !profile.preferencesFilledOut) {
    //       router.push("/onboarding/1");
    //     } else {
    //       router.push("/");
    //     }
    //   } else {
    //     // fallback if API fails
    //     router.push("/");
    //   }
    // }




    const result = await signIn("credentials", { redirect: false, email, password });
    if (result?.error) {
      alert("Login failed: " + result.error);
    } else if (result?.ok) {
      // Let the server side (requireAuth + DB check) decide where to send the user
      router.push("/");
    }
  }

  return (
    <main>
      <div className="stack" style={{ maxWidth: 420, margin: '40px auto' }}>
        <h1 className="brand" style={{ justifyContent: 'center', fontSize: 24 }}><span className="logo-dot"/> burnNbyte</h1>
        <form onSubmit={handleSubmit} className="card form">
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>

          <label>
            <span>Password</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </label>

          <button type="submit" className="btn btn-primary">Sign In</button>
          <div className="muted">Don't have an account? <Link href="/signup">Sign Up</Link></div>
        </form>
      </div>
    </main>
  );
}
