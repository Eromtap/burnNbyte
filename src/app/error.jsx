'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';

export default function AppError({ error, reset }) {
  useEffect(() => {
    console.error('Application route error', error);
  }, [error]);

  return (
    <main className="bn-system-state" role="alert">
      <section>
        <div className="bn-system-kicker"><ShieldCheck size={15} aria-hidden /> YOUR DATA IS SAFE</div>
        <p className="bn-system-code">500</p>
        <h1>This page hit a snag.</h1>
        <p>Nothing you saved was removed. Try the page again, or return to today and continue from there.</p>
        <div className="bn-system-actions">
          <button type="button" className="btn btn-primary" onClick={reset}>
            <RefreshCw size={16} aria-hidden /> Try again
          </button>
          <Link className="btn btn-secondary" href="/">
            <ArrowLeft size={16} aria-hidden /> Return to today
          </Link>
        </div>
      </section>
    </main>
  );
}
