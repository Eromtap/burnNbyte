'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { usePathname } from 'next/navigation';

function isEligibleNavigation(event, anchor) {
  if (!anchor || event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (anchor.target && anchor.target !== '_self') return false;
  if (anchor.hasAttribute('download')) return false;

  const next = new URL(anchor.href, window.location.href);
  if (next.origin !== window.location.origin) return false;
  if (next.href === window.location.href) return false;
  if (next.pathname === window.location.pathname && next.search === window.location.search && next.hash) return false;
  return true;
}

export default function NavigationFeedback() {
  const pathname = usePathname();
  const [targetHref, setTargetHref] = useState('');
  const [slow, setSlow] = useState(false);
  const [stalled, setStalled] = useState(false);
  const startedAtRef = useRef(0);

  useEffect(() => {
    setTargetHref('');
  }, [pathname]);

  useEffect(() => {
    const start = (href) => {
      startedAtRef.current = Date.now();
      setTargetHref(href || window.location.href);
      setSlow(false);
      setStalled(false);
    };

    const handleClick = (event) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!isEligibleNavigation(event, anchor)) return;
      start(anchor.href);
    };

    const handleProgrammaticStart = (event) => start(event.detail?.href);
    const handlePopState = () => start(window.location.href);

    document.addEventListener('click', handleClick, true);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('bn:navigation-start', handleProgrammaticStart);
    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('bn:navigation-start', handleProgrammaticStart);
    };
  }, []);

  useEffect(() => {
    if (!targetHref) return undefined;

    const app = document.getElementById('app');
    app?.setAttribute('aria-busy', 'true');

    const slowTimer = window.setTimeout(() => setSlow(true), 2200);
    const stalledTimer = window.setTimeout(() => setStalled(true), 12000);
    const completionTimer = window.setInterval(() => {
      if (Date.now() - startedAtRef.current < 450) return;
      if (window.location.href !== targetHref) return;
      window.clearInterval(completionTimer);
      setTargetHref('');
    }, 120);

    return () => {
      window.clearTimeout(slowTimer);
      window.clearTimeout(stalledTimer);
      window.clearInterval(completionTimer);
      app?.removeAttribute('aria-busy');
    };
  }, [targetHref]);

  if (!targetHref) return null;

  return (
    <div className={`bn-navigation-feedback${slow ? ' is-slow' : ''}${stalled ? ' is-stalled' : ''}`} role="status" aria-live="polite">
      <div className="bn-navigation-progress"><span /></div>
      <div className="bn-navigation-message">
        <LoaderCircle size={17} aria-hidden />
        <span>
          <strong>{stalled ? 'This is taking longer than expected.' : slow ? 'Still loading your page…' : 'Loading…'}</strong>
          {slow ? <small>Your work is safe. The app is waiting for the server.</small> : null}
        </span>
        {stalled ? (
          <button type="button" onClick={() => window.location.assign(targetHref)}>
            <RefreshCw size={14} /> Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}
