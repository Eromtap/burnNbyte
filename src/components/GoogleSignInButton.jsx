'use client';

import { getProviders, signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function GoogleSignInButton() {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const native = window.Capacitor?.isNativePlatform?.();
    const android = window.Capacitor?.getPlatform?.() === 'android';
    getProviders().then(providers => {
      const hasNativePlugin = android && window.Capacitor?.isPluginAvailable?.('BurnNByteGoogleAuth');
      if (active) setAvailable(native ? Boolean(hasNativePlugin && providers?.['google-native']) : Boolean(providers?.google));
    }).catch(() => {});
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
      if (window.Capacitor?.isNativePlatform?.()) {
        const response = await fetch('/api/auth/google-native/nonce', { method: 'POST' });
        const challenge = await response.json();
        if (!response.ok) throw new Error('Google sign-in is unavailable. Please try again.');
        const plugin = window.Capacitor.registerPlugin('BurnNByteGoogleAuth');
        const { idToken } = await plugin.signIn(challenge);
        const result = await signIn('google-native', { idToken, redirect: false, callbackUrl: '/' });
        if (result?.error === 'GoogleAccountExists') {
          throw new Error('An account already uses this email. Sign in with your existing password.');
        }
        if (!result?.ok || result.error) throw new Error('Google sign-in could not be completed. Please try again.');
        window.location.assign('/');
        return;
      }
      await signIn('google', { callbackUrl: '/' });
    } catch (error) {
      if (error.code !== 'CANCELED') setError(error.message || 'Google sign-in is temporarily unavailable. Please try again.');
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
