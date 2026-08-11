import Link from 'next/link';
import { ArrowLeft, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="bn-system-state">
      <section>
        <div className="bn-system-kicker"><Compass size={15} aria-hidden /> PAGE NOT FOUND</div>
        <p className="bn-system-code">404</p>
        <h1>This route isn’t part of the plan.</h1>
        <p>The link may be old or incomplete. Return to today to keep moving.</p>
        <div className="bn-system-actions">
          <Link className="btn btn-primary" href="/">
            <ArrowLeft size={16} aria-hidden /> Return to today
          </Link>
        </div>
      </section>
    </main>
  );
}
