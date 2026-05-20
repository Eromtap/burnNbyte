'use client';

import { useEffect, useState } from 'react';
import {
  MAX_SUGGESTION_LENGTH,
  MAX_SUGGESTIONS_PER_DAY,
  SUGGESTION_KIND_OPTIONS,
} from '@/lib/suggestions';

const DEFAULT_FORM = {
  kind: SUGGESTION_KIND_OPTIONS[0]?.value || 'ADDITION',
  message: '',
};

export default function SuggestionsPageClient() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [quota, setQuota] = useState({
    used: 0,
    remaining: MAX_SUGGESTIONS_PER_DAY,
    limit: MAX_SUGGESTIONS_PER_DAY,
    dayKey: null,
    timeZone: null,
  });
  const [loadingQuota, setLoadingQuota] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function loadQuota() {
    setLoadingQuota(true);
    try {
      const res = await fetch('/api/suggestions', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load suggestion quota.');
      setQuota({
        used: Number(data?.used) || 0,
        remaining: Number(data?.remaining) || 0,
        limit: Number(data?.limit) || MAX_SUGGESTIONS_PER_DAY,
        dayKey: data?.dayKey || null,
        timeZone: data?.timeZone || null,
      });
      setMessage(null);
    } catch (error) {
      setMessage(error.message || 'Failed to load suggestion quota.');
    } finally {
      setLoadingQuota(false);
    }
  }

  useEffect(() => {
    loadQuota();
  }, []);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to send suggestion.');

      setForm(DEFAULT_FORM);
      setQuota({
        used: Number(data?.used) || 0,
        remaining: Number(data?.remaining) || 0,
        limit: Number(data?.limit) || MAX_SUGGESTIONS_PER_DAY,
        dayKey: data?.dayKey || null,
        timeZone: data?.timeZone || null,
      });
      setMessage('Suggestion sent.');
    } catch (error) {
      setMessage(error.message || 'Failed to send suggestion.');
    } finally {
      setSaving(false);
    }
  }

  const charactersLeft = MAX_SUGGESTION_LENGTH - form.message.length;
  const atLimit = quota.remaining <= 0;

  return (
    <div className="suggestion-form-shell">
      <div className="suggestion-status-row" aria-live="polite">
        <div className="suggestion-status" aria-live="polite">
          {loadingQuota ? 'Loading daily limit…' : `${quota.remaining} of ${quota.limit} remaining today`}
        </div>
      </div>

      <form className="form suggestion-form" onSubmit={onSubmit}>
        <label>
          <span>Type</span>
          <select
            value={form.kind}
            onChange={(event) => updateField('kind', event.target.value)}
            disabled={saving || atLimit}
          >
            {SUGGESTION_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Your suggestion</span>
          <textarea
            rows={6}
            maxLength={MAX_SUGGESTION_LENGTH}
            placeholder="Describe the addition or change you want in the app."
            value={form.message}
            onChange={(event) => updateField('message', event.target.value)}
            disabled={saving || atLimit}
          />
        </label>

        <div className="suggestion-meta" aria-live="polite">
          <div className={`muted ${charactersLeft < 50 ? 'text-danger' : ''}`}>
            {charactersLeft} characters left
          </div>
        </div>

        <div className="suggestion-actions">
          <button
            className="btn btn-primary"
            type="submit"
            disabled={saving || atLimit || !form.message.trim()}
          >
            {saving ? 'Sending…' : 'Send suggestion'}
          </button>
          {message && <div className="muted">{message}</div>}
        </div>
      </form>
    </div>
  );
}
