'use client';

import { getProviders, signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function GoogleSignInButton() {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    // Google's web OAuth flow cannot run inside Capacitor's embedded browser.
    const native = window.Capacitor?.isNativePlatform?.();
    if (!native) {
      getProviders().then(providers => {
        if (active) setAvailable(Boolean(providers?.google));
      }).catch(() => {});
    }
    const code = new URLSearchParams(window.location.search).get('error');
    if (code === 'GoogleAccountExists') {
      setError('An account already uses this email. Sign in with your existing password.');
    } else if (code) {
      setError('Google sign-in could not be completed. Please try again.');
    }
    return () => { active = false; };
  }, []);

  async function continueWithGoogle() {
    setBusy(true);
    setError('');
    try {
      await signIn('google', { callbackUrl: '/' });
    } catch {
      setError('Google sign-in is temporarily unavailable. Please try again.');
      setBusy(false);
    }
  }

  return <>
    {available ? <button type="button" className="btn btn-outline" disabled={busy} onClick={continueWithGoogle}>
      {busy ? 'Connecting…' : 'Continue with Google'}
    </button> : null}
    {error ? <div className="bn-auth-message is-error" role="alert">{error}</div> : null}
  </>;
}
