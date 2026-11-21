'use client';

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (working) return;
    setWorking(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || "We could not start a password reset. Please try again.");
        return;
      }
      setMessage(data.message);
    } catch {
      setError("The account service is temporarily unavailable. Please try again.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form bn-auth-form" aria-busy={working}>
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
        {working ? "Sending…" : "Send reset link"}
      </button>
      <div className="bn-auth-switch">Remembered it? <Link href="/signin">Return to sign in</Link></div>
    </form>
  );
}
