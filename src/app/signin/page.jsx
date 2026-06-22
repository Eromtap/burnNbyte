'use client';
import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function SignInPage() {
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
    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl: "/",
    });
    if (result?.error) {
      alert("Login failed: " + result.error);
    } else if (result?.ok) {
      // Force a document navigation so WebViews pick up the new auth cookie
      // before protected routes run their server-side session check.
      window.location.assign(result.url || "/");
    }
  }

  return (
    <main>
      <div className="page-shell">
        <div className="stack" style={{ maxWidth: 420, margin: '40px auto' }}>
          <h1 className="brand" style={{ justifyContent: 'center' }}>
            <Image
              src="/logo.png"
              alt="burnNbyte logo"
              width={1024}
              height={1024}
              style={{ width: '100%', height: 'auto', display: 'block' }}
              priority
            />
          </h1>
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
            <div className="muted">Don&apos;t have an account? <Link href="/signup">Sign Up</Link></div>
          </form>
        </div>
      </div>
    </main>
  );
}
