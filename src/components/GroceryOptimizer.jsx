"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GroceryOptimizer({ selectedISO }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unit, setUnit] = useState("imperial");

  async function optimize() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/groceries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitSystem: unit, date: selectedISO }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Optimization failed");
      router.refresh();
    } catch (e) {
      setError(e.message || "Failed to optimize list");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack" style={{ marginTop: 12 }}>
      <div className="list-row" style={{ gap: 8, alignItems: "center" }}>
        <label className="muted">Units</label>
        <select value={unit} onChange={(e) => setUnit(e.target.value)}>
          <option value="imperial">Imperial (lb, qt)</option>
          <option value="metric">Metric (kg, L)</option>
        </select>
        <button className="btn btn-primary" onClick={optimize} disabled={loading}>
          {loading ? "Optimizing..." : "Convert to Store Purchases"}
        </button>
      </div>

      {error && (
        <div className="list-row"><span className="muted">{String(error)}</span></div>
      )}
    </div>
  );
}
