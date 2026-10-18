'use client';

import { signOut as nextAuthSignOut } from 'next-auth/react';

export async function signOut(options) {
  if (typeof window !== 'undefined' && window.Capacitor?.isPluginAvailable?.('BurnNByteGoogleAuth')) {
    try {
      await window.Capacitor.registerPlugin('BurnNByteGoogleAuth').signOut();
    } catch {
      // Always clear the app session even if Google Play services are unavailable.
    }
  }
  return nextAuthSignOut(options);
}
