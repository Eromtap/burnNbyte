'use client';

import Link from "next/link";
import { useState } from "react";

export default function ResetPasswordForm({ token }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [working, setWorking] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (working) return;
    setError("");
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setWorking(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || "We could not reset your password. Please request a new link.");
        return;
      }
      setComplete(true);
    } catch {
      setError("The account service is temporarily unavailable. Please try again.");
    } finally {
      setWorking(false);
    }
  }

  if (!token) {
    return (
      <div className="form bn-auth-form">
        <div className="bn-auth-message is-error" role="alert">This reset link is incomplete.</div>
        <Link className="btn btn-primary" href="/forgot-password">Request a new link</Link>
      </div>
    );
  }

  if (complete) {
    return (
      <div className="form bn-auth-form">
        <div className="bn-auth-message" role="status">Your password has been changed. Sign in with your new password. If you opened this link from the mobile app, return to BurnnByte and sign in there.</div>
        <Link className="btn btn-primary" href="/signin">Continue to sign in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="form bn-auth-form" aria-busy={working}>
      <label>
        <span>New password</span>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          maxLength={72}
          required
          disabled={working}
        />
      </label>
      <label>
        <span>Confirm new password</span>
        <input
          type="password"
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          minLength={8}
          maxLength={72}
          required
          disabled={working}
        />
      </label>
      {error ? <div className="bn-auth-message is-error" role="alert">{error}</div> : null}
      <button type="submit" className="btn btn-primary" disabled={working}>
        {working ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
