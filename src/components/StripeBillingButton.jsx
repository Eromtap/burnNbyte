"use client";

import { useState } from "react";

export default function StripeBillingButton({ action = "checkout", children, className }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function handleClick() {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/stripe/${action}`, { method: "POST" });
      const body = await response.json();
      if (!response.ok || !body.url) throw new Error(body.error || "Unable to open billing.");
      window.location.assign(body.url);
    } catch (err) { setError(err.message); setLoading(false); }
  }
  return <div><button type="button" className={className} onClick={handleClick} disabled={loading}>{loading ? "Opening…" : children}</button>{error ? <p role="alert">{error}</p> : null}</div>;
}
