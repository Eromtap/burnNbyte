'use client';

import { useState } from 'react';

function formatDateTime(value) {
  if (!value) return 'Never';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Invalid date';
  return parsed.toLocaleString('en-US');
}

export default function AdminAccessPageClient() {
  const [email, setEmail] = useState('');
  const [lookup, setLookup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [grantForm, setGrantForm] = useState({
    reason: 'qa',
    notes: '',
    expiresAt: '',
  });

  async function searchUser(event) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const query = new URLSearchParams({ email: email.trim().toLowerCase() });
      const res = await fetch(`/api/admin/access-grants?${query.toString()}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || 'Lookup failed');

      setLookup(data);
    } catch (error) {
      setLookup(null);
      setMessage({ type: 'error', text: error.message || 'Lookup failed' });
    } finally {
      setLoading(false);
    }
  }

  async function createGrant(event) {
    event.preventDefault();
    if (!lookup?.user?.email) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/access-grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: lookup.user.email,
          reason: grantForm.reason,
          notes: grantForm.notes,
          expiresAt: grantForm.expiresAt ? new Date(grantForm.expiresAt).toISOString() : null,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || 'Grant failed');

      setLookup((current) => ({
        ...current,
        access: data.access,
        grants: [data.grant, ...(current?.grants || [])],
      }));
      setGrantForm((current) => ({ ...current, notes: '', expiresAt: '' }));
      setMessage({ type: 'success', text: 'Full access granted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Grant failed' });
    } finally {
      setSubmitting(false);
    }
  }

  async function revokeGrant(grantId) {
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/access-grants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantId }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || 'Revoke failed');

      setLookup((current) => ({
        ...current,
        access: data.access,
        grants: (current?.grants || []).filter((grant) => grant.id !== grantId),
      }));
      setMessage({ type: 'success', text: 'Grant revoked.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Revoke failed' });
    } finally {
      setSubmitting(false);
    }
  }

  async function setAdmin(isAdmin) {
    if (!lookup?.user?.email) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/access-grants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lookup.user.email, isAdmin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Administrator update failed');
      setLookup((current) => ({ ...current, user: data.user, access: data.access }));
      setMessage({ type: 'success', text: isAdmin ? 'Administrator access granted.' : 'Administrator access removed.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Administrator update failed' });
    } finally {
      setSubmitting(false);
    }
  }

  const lookupAccess = lookup?.access;
  const grants = lookup?.grants || [];

  return (
    <div className="stack">
      <article className="card bn-route-stage">
        <header className="card-head">
          <div>
            <h3>Lookup user</h3>
            <div className="sub">Search by exact account email.</div>
          </div>
        </header>

        <form className="form admin-search-form" onSubmit={searchUser}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
              required
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={loading || !email.trim()}>
            <span className="label">{loading ? 'Searching…' : 'Search user'}</span>
          </button>
        </form>

        {message ? (
          <div className={`admin-status ${message.type === 'error' ? 'admin-status-error' : 'admin-status-success'}`}>
            {message.text}
          </div>
        ) : null}
      </article>

      {lookup?.user ? (
        <>
          <section className="hero-card page-hero page-hero-compact bn-route-hero">
            <div className="page-hero-copy">
              <div className="eyebrow">User record</div>
              <div>
                <h1 className="page-hero-title">{lookup.user.name || lookup.user.email}</h1>
                <p className="page-hero-text">{lookup.user.email}</p>
              </div>
            </div>
            <aside className="hero-panel hero-metrics">
              <div className="metric-card">
                <div className="metric-label">Access state</div>
                <div className="metric-value" style={{ fontSize: '1.5rem' }}>{lookupAccess?.accessState || 'unknown'}</div>
                <div className="metric-detail">
                  Source: {lookupAccess?.source || 'none'}{lookupAccess?.expiresAt ? ` • Ends ${formatDateTime(lookupAccess.expiresAt)}` : ''}
                </div>
              </div>
            </aside>
          </section>

          <div className="admin-grid">
            <article className="card bn-route-stage">
              <header className="card-head">
                <div>
                  <h3>Administrator access</h3>
                  <div className="sub">Admins can open this page and manage access grants.</div>
                </div>
              </header>
              <p className="muted">Current role: <strong>{lookup.user.isAdmin ? 'Administrator' : 'Standard user'}</strong></p>
              <button
                className={lookup.user.isAdmin ? 'btn btn-outline' : 'btn btn-primary'}
                type="button"
                disabled={submitting}
                onClick={() => setAdmin(!lookup.user.isAdmin)}
              >
                <span className="label">{submitting ? 'Saving…' : lookup.user.isAdmin ? 'Remove administrator' : 'Make administrator'}</span>
              </button>
            </article>

            <article className="card bn-route-stage">
              <header className="card-head">
                <div>
                  <h3>Grant full access</h3>
                  <div className="sub">Manual access for testers, family, support, or promos.</div>
                </div>
              </header>

              <form className="form" onSubmit={createGrant}>
                <label>
                  <span>Reason</span>
                  <select
                    value={grantForm.reason}
                    onChange={(event) => setGrantForm((current) => ({ ...current, reason: event.target.value }))}
                  >
                    <option value="qa">QA</option>
                    <option value="family">Family</option>
                    <option value="friend">Friend</option>
                    <option value="support">Support</option>
                    <option value="promo">Promo</option>
                  </select>
                </label>

                <label>
                  <span>Expires at</span>
                  <input
                    type="datetime-local"
                    value={grantForm.expiresAt}
                    onChange={(event) => setGrantForm((current) => ({ ...current, expiresAt: event.target.value }))}
                  />
                </label>

                <label>
                  <span>Notes</span>
                  <input
                    type="text"
                    value={grantForm.notes}
                    onChange={(event) => setGrantForm((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Optional internal note"
                  />
                </label>

                <button className="btn btn-primary" type="submit" disabled={submitting}>
                  <span className="label">{submitting ? 'Saving…' : 'Grant access'}</span>
                </button>
              </form>
            </article>

            <article className="card bn-route-stage">
              <header className="card-head">
                <div>
                  <h3>Existing grants</h3>
                  <div className="sub">Revoke manual access here when it should end.</div>
                </div>
              </header>

              {grants.length ? (
                <div className="list">
                  {grants.map((grant) => (
                    <div className="list-row admin-grant-row" key={grant.id}>
                      <div className="stack" style={{ gap: 4 }}>
                        <div className="workout-title">{grant.reason || 'manual'}</div>
                        <div className="muted">Starts {formatDateTime(grant.startsAt)}</div>
                        <div className="muted">Expires {formatDateTime(grant.expiresAt)}</div>
                        {grant.notes ? <div className="muted">{grant.notes}</div> : null}
                      </div>
                      <button
                        className="btn btn-outline"
                        type="button"
                        disabled={submitting}
                        onClick={() => revokeGrant(grant.id)}
                      >
                        <span className="label">Revoke</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted">No manual grants on this account yet.</div>
              )}
            </article>
          </div>
        </>
      ) : null}
    </div>
  );
}
