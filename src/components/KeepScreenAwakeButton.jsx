'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { Sun } from 'lucide-react';

export default function KeepScreenAwakeButton({ className = '', visible = true }) {
  const [isAwake, setIsAwake] = useState(false);
  const [error, setError] = useState('');
  const sentinelRef = useRef(null);

  const release = useCallback(async () => {
    const sentinel = sentinelRef.current;
    sentinelRef.current = null;
    try {
      if (sentinel) await sentinel.release();
      if (Capacitor.isNativePlatform()) await KeepAwake.allowSleep();
    } catch {
      // The operating system may have already released the lock.
    } finally {
      setIsAwake(false);
    }
  }, []);

  const keepAwake = useCallback(async () => {
    setError('');
    try {
      if (Capacitor.isNativePlatform()) {
        await KeepAwake.keepAwake();
      } else {
        if (!navigator.wakeLock?.request) {
          throw new Error('Keeping the screen on is not supported in this browser.');
        }
        const sentinel = await navigator.wakeLock.request('screen');
        sentinelRef.current = sentinel;
        sentinel.addEventListener('release', () => {
          sentinelRef.current = null;
          setIsAwake(false);
        }, { once: true });
      }
      setIsAwake(true);
    } catch (err) {
      setError(err?.message || 'Could not keep the screen on.');
      setIsAwake(false);
    }
  }, []);

  useEffect(() => {
    const releaseWhenHidden = () => {
      if (document.visibilityState === 'hidden') release();
    };
    document.addEventListener('visibilitychange', releaseWhenHidden);
    return () => {
      document.removeEventListener('visibilitychange', releaseWhenHidden);
      release();
    };
  }, [release]);

  if (!visible) return null;

  return (
    <div className="keep-screen-awake-control">
      <button
        type="button"
        className={`btn ${isAwake ? 'btn-primary' : 'btn-secondary'} keep-screen-awake-button ${className}`.trim()}
        aria-pressed={isAwake}
        onClick={() => (isAwake ? release() : keepAwake())}
      >
        <Sun size={15} aria-hidden="true" />
        {isAwake ? 'Screen stays on' : 'Keep screen on'}
      </button>
      {error && <span className="keep-screen-awake-error" role="status">{error}</span>}
    </div>
  );
}
