'use client';

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatMacro } from "@/lib/macros";

const TYPES = ["breakfast", "lunch", "dinner", "snack"];

export default function MealPhotoReplace({ selectedISO, onReplaced }) {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [type, setType] = useState("dinner");
  const [portion, setPortion] = useState("medium"); // small | medium | large | custom
  const [foodDescription, setFoodDescription] = useState("");
  const [portionNote, setPortionNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  async function onSubmit(e) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      fd.append("type", type);
      fd.append("date", selectedISO);
      fd.append("portion", portion);
      if (foodDescription.trim()) fd.append("foodDescription", foodDescription.trim());
      if (portionNote.trim()) fd.append("portionNote", portionNote.trim());
      const res = await fetch("/api/mealPlans/photo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        if (data?.code === "moderation_blocked") {
          throw new Error("Image blocked by content safety checks. Please upload a food photo.");
        }
        throw new Error(data?.error || "Failed to analyze meal");
      }
      setResult(data);
      if (typeof onReplaced === "function") {
        await onReplaced();
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err.message || "Failed to analyze meal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <form className="stack" onSubmit={onSubmit}>
        <div className="list-row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className="muted">Replace with photo</span>
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ minWidth: 120 }}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={portion} onChange={(e) => setPortion(e.target.value)} style={{ minWidth: 140 }}>
            <option value="small">Small (~light portion)</option>
            <option value="medium">Medium (~standard portion)</option>
            <option value="large">Large (~double portion)</option>
            <option value="custom">Custom note</option>
          </select>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFile(f || null);
              if (e.target) e.target.value = "";
            }}
          />
          <button type="button" className="btn btn-secondary" onClick={() => inputRef.current?.click()}>
            {file ? "Change Photo" : "Upload Photo"}
          </button>
          {file && <span className="muted">{file.name}</span>}
          <button type="submit" className="btn btn-primary" disabled={!file || loading}>
            {loading ? "Analyzing..." : "Analyze & Replace"}
          </button>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          AI-generated estimate. It&apos;s a guess and can be wrong — review and adjust if it seems off.
        </div>
        <div className="stack">
          <div className="list-row" style={{ gap: 8, flexWrap: "wrap" }}>
            <label className="muted">What is the food? (optional)</label>
            <input
              type="text"
              placeholder="e.g., cereal with whole milk"
              value={foodDescription}
              onChange={(e) => setFoodDescription(e.target.value)}
              style={{ flex: 1, minWidth: 260 }}
            />
          </div>
          <div className="list-row" style={{ gap: 8, flexWrap: "wrap" }}>
            <label className="muted">Describe portion (optional)</label>
            <input
              type="text"
              placeholder="e.g., about 1 cup milk and 1 bowl of cereal"
              value={portionNote}
              onChange={(e) => setPortionNote(e.target.value)}
              style={{ flex: 1, minWidth: 260 }}
            />
          </div>
        </div>
      </form>

      {error && <div className="muted">{error}</div>}

      {result && (
        <div className="card" style={{ padding: 12 }}>
          <div className="list-row">
            <span>Predicted meal</span>
            <span className="muted">{result.name}</span>
          </div>
          <div className="list-row">
            <span>Macros (per meal)</span>
            <span className="muted">
              {result.calories ?? "?"} kcal | {formatMacro(result.protein)}g Protein | {formatMacro(result.carbs)}g Carbs | {formatMacro(result.fat)}g Fat{result.costPerServing != null ? ` | ~$${Number(result.costPerServing).toFixed(2)}/serving` : ''}
            </span>
          </div>
          {Array.isArray(result.ingredients) && result.ingredients.length > 0 && (
            <div className="stack" style={{ marginTop: 8 }}>
              <div className="planner-head">Key ingredients</div>
              <ul className="list" style={{ marginTop: 6 }}>
                {result.ingredients.map((ing, idx) => <li key={idx} className="list-row"><span>{ing}</span></li>)}
              </ul>
            </div>
          )}
          {result.notes && (
            <div className="list-row" style={{ marginTop: 6 }}>
              <span>Notes</span>
              <span className="muted">{result.notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
