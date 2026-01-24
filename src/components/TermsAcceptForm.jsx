'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TermsAcceptForm() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  async function acceptTerms() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/terms/accept', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to accept terms');
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err.message || 'Failed to accept terms');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      {error && <div className="muted" style={{ color: 'var(--danger, #b42318)' }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={acceptTerms}
          disabled={saving}
          style={{
            padding: '8px 12px',
            fontSize: 13,
            lineHeight: 1.2,
            width: 180,
            textAlign: 'center',
            justifyContent: 'center',
          }}
        >
          {saving ? 'Saving...' : 'I Accept the Terms'}
        </button>
      </div>
    </div>
  );
}
