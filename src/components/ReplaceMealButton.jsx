'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReplaceMealButton({ dateISO, type, label = 'Replace Meal', className = 'btn btn-secondary' }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleReplace = async () => {
    if (!dateISO || !type || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/mealPlans/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ date: dateISO, types: [type] }] }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to replace meal.');
      }
      router.refresh();
    } catch (err) {
      alert(err.message || 'Failed to replace meal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button className={className} onClick={handleReplace} disabled={loading || !dateISO}>
      {loading ? 'Replacing…' : label}
    </button>
  );
}
