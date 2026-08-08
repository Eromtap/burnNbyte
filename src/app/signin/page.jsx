'use client';
import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LoaderCircle } from "lucide-react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: email.trim(),
        password,
        callbackUrl: "/",
      });
      if (result?.error || !result?.ok) {
        setError("We couldn’t sign you in. Check your email and password, then try again.");
        return;
      }

      // A document navigation ensures embedded WebViews receive the auth cookie
      // before the protected server-rendered route is requested.
      window.location.assign(result.url || "/");
    } catch {
      setError("The sign-in service is temporarily unavailable. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="bn-auth-page bn-auth-page-signin">
      <section className="bn-auth-story">
        <div className="bn-auth-brand">
          <div className="bn-auth-logo">
            <Image
              src="/logo.png"
              alt="burnNbyte logo"
              width={1024}
              height={1024}
              priority
            />
          </div>
          <span>burnNbyte</span>
        </div>
        <div className="bn-auth-copy">
          <div className="eyebrow">Your daily operating system</div>
          <h1>Plan less.<br /><em>Move better.</em></h1>
          <p>Training, food, and progress—kept in one deliberate rhythm.</p>
        </div>
        <div className="bn-auth-signal">
          <span>01</span>
          <strong>Train</strong>
          <span>02</span>
          <strong>Fuel</strong>
          <span>03</span>
          <strong>Repeat</strong>
        </div>
      </section>

      <section className="bn-auth-panel">
        <div className="bn-auth-form-wrap">
          <Link className="bn-auth-inline-brand" href="/" aria-label="burnNbyte home">
            <Image src="/logo.png" alt="" width={34} height={34} priority />
            <span>burnNbyte</span>
          </Link>
          <div className="bn-auth-form-head">
            <div className="eyebrow">Welcome back</div>
            <h2>Sign in to your plan.</h2>
            <p>Pick up exactly where you left off.</p>
          </div>
          <form onSubmit={handleSubmit} className="form bn-auth-form" aria-busy={submitting}>
            <label>
              <span>Email</span>
              <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={submitting} />
            </label>

            <label>
              <span>Password</span>
              <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required disabled={submitting} />
            </label>

            {error ? <div className="bn-auth-message is-error" role="alert">{error}</div> : null}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <><LoaderCircle size={16} aria-hidden /> Signing in…</> : "Sign in"}
            </button>
            <div className="bn-auth-switch">Don&apos;t have an account? <Link href="/signup">Create one</Link></div>
          </form>
        </div>
      </section>
    </main>
  );
}
