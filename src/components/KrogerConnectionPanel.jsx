"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function KrogerConnectionPanel({ connected, connectedAt }) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");

  async function disconnect() {
    if (disconnecting) return;
    setDisconnecting(true);
    setError("");
    try {
      const response = await fetch("/api/kroger/connection", { method: "DELETE" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Could not disconnect Kroger.");
      router.refresh();
    } catch (caught) {
      setError(caught?.message || "Could not disconnect Kroger.");
    } finally {
      setDisconnecting(false);
    }
  }

  if (!connected) {
    return (
      <div className="stack">
        <p className="muted">
          Connect your Kroger account to send selected products to your Kroger cart. BurnNByte cannot
          place the order, select fulfillment, or charge your Kroger payment method.
        </p>
        <div><a className="btn btn-primary" href="/api/kroger/connect?returnTo=/groceries">Connect Kroger</a></div>
      </div>
    );
  }

  return (
    <div className="stack">
      <p className="muted">
        Kroger is connected{connectedAt ? ` since ${new Date(connectedAt).toLocaleDateString()}` : ""}.
        Access credentials are encrypted and can be deleted at any time.
      </p>
      <div className="grocery-inline-actions">
        <a className="btn btn-primary" href="/groceries">Open groceries</a>
        <button className="btn btn-outline" type="button" onClick={disconnect} disabled={disconnecting}>
          {disconnecting ? "Disconnecting…" : "Disconnect Kroger"}
        </button>
      </div>
      {error ? <div className="grocery-error" role="alert">{error}</div> : null}
    </div>
  );
}
