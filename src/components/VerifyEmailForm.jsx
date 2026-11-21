'use client';

import Link from "next/link";
import { useEffect, useState } from "react";

const VERIFICATION_EMAIL_KEY = "burnnbyte:verification-email";

export default function VerifyEmailForm({ token, deliveryFailed = false }) {
  const [email, setEmail] = useState("");
  const [emailReady, setEmailReady] = useState(Boolean(token));
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setEmail(sessionStorage.getItem(VERIFICATION_EMAIL_KEY) || "");
    }
    setEmailReady(true);
  }, [token]);

  async function handleVerify() {
    if (working) return;
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || "We could not verify your email. Please request a new link.");
        return;
      }
      sessionStorage.removeItem(VERIFICATION_EMAIL_KEY);
      setMessage("Your email is verified. You can now sign in. If you opened this link from the mobile app, return to BurnnByte and sign in there.");
    } catch {
      setError("Email verification is temporarily unavailable. Please try again.");
    } finally {
      setWorking(false);
    }
  }

  async function handleResend(event) {
    event?.preventDefault();
    if (working) return;
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || "We could not send a verification email. Please try again.");
        return;
      }
      setMessage(data.message);
    } catch {
      setError("The email service is temporarily unavailable. Please try again.");
    } finally {
      setWorking(false);
    }
  }

  if (message.startsWith("Your email is verified")) {
    return (
      <div className="form bn-auth-form">
        <div className="bn-auth-message" role="status">{message}</div>
        <Link className="btn btn-primary" href="/signin">Continue to sign in</Link>
      </div>
    );
  }

  if (token) {
    return (
      <div className="form bn-auth-form">
        {error ? <div className="bn-auth-message is-error" role="alert">{error}</div> : null}
        <button type="button" className="btn btn-primary" onClick={handleVerify} disabled={working}>
          {working ? "Verifying…" : "Verify email"}
        </button>
        <p className="bn-auth-switch">Need a new link? <Link href="/verify-email">Request one</Link></p>
      </div>
    );
  }

  if (!emailReady) {
    return <div className="form bn-auth-form"><div className="bn-auth-message" role="status">Preparing your verification details…</div></div>;
  }

  if (email) {
    return (
      <div className="form bn-auth-form">
        <div className={deliveryFailed ? "bn-auth-message is-error" : "bn-auth-message"} role="status">
          {deliveryFailed ? "We couldn’t deliver the first message." : "We sent a verification link to"}
          {deliveryFailed ? " Try again for " : " "}
          <strong>{email}</strong>.
        </div>
        {message ? <div className="bn-auth-message" role="status">{message}</div> : null}
        {error ? <div className="bn-auth-message is-error" role="alert">{error}</div> : null}
        <button type="button" className="btn btn-primary" onClick={handleResend} disabled={working}>
          {working ? "Sending…" : "Resend verification email"}
        </button>
        <div className="bn-auth-switch">Wrong address? <Link href="/signup">Create the account again</Link></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleResend} className="form bn-auth-form" aria-busy={working}>
      <label>
        <span>Email</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={working}
        />
      </label>
      {message ? <div className="bn-auth-message" role="status">{message}</div> : null}
      {error ? <div className="bn-auth-message is-error" role="alert">{error}</div> : null}
      <button type="submit" className="btn btn-primary" disabled={working}>
        {working ? "Sending…" : "Resend verification email"}
      </button>
      <div className="bn-auth-switch">Already verified? <Link href="/signin">Sign in</Link></div>
    </form>
  );
}
