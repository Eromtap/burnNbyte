
'use client';
import { useState } from "react";
import { useSession } from "next-auth/react";

export default function GenerateMealPlan() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper: get current week dates (Sunday → Saturday)
  function getCurrentWeekDates() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek);
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      weekDates.push(d.toISOString().split("T")[0]);
    }
    return weekDates;
  }

  async function handleCreateMealPlan() {
    if (!session?.user?.id) {
      setError("User not logged in");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const weekDates = getCurrentWeekDates();

      const res = await fetch("/api/generateMealPlan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekDates }),
      });

      if (!res.ok) throw new Error(`Failed: ${res.status}`);

      // We don’t need to store mealPlans for display anymore
      await res.json();
    } catch (err) {
      console.error(err);
      setError("Failed to generate meal plans");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      <button onClick={handleCreateMealPlan} disabled={loading}>
        {loading ? "Please wait, generating..." : "Create Meal Plans for This Week"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
