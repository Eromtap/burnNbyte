'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { signOut } from 'next-auth/react';
import Image from 'next/image';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/workouts', label: 'Workouts' },
  { href: '/meals', label: 'Meals' },
  { href: '/progress', label: 'Progress' },
  { href: '/profile', label: 'Profile' },
];

export default function AppFrame({ children }) {
  const pathname = usePathname();
  const { toggle } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (href) => pathname === href;

  return (
    <div id="app">
      <div className="app-shell">
        <header className="app-header">
          <div className="header-main">
            <button className="btn btn-ghost" aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M4 7a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Z"/></svg>
            </button>
            <div className="brand">
              <Image src="/logo.png" alt="burnNbyte logo" className="brand-mark" width={52} height={52} unoptimized priority />
              <div className="brand-copy">
                <div className="brand-title">burnNbyte</div>
                <div className="brand-subtitle">Fuel smart. Train hard.</div>
              </div>
            </div>
            <div className="header-actions">
              <nav className="desktop-nav" aria-label="Primary navigation">
                {NAV_ITEMS.map((item) => (
                  <Link key={item.href} className={`desktop-nav-link ${isActive(item.href) ? 'active' : ''}`} href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </nav>
              <button className="btn btn-outline" aria-label="Toggle theme" onClick={toggle}>
                <span className="icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm7.071 2.929a1 1 0 0 1 0 1.414l-.707.707a1 1 0 0 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0ZM21 11a1 1 0 1 1 0 2h-1a1 1 0 1 1 0-2h1ZM5.05 5.636a1 1 0 0 1 1.414 0l.707.707A1 1 0 1 1 5.757 7.757l-.707-.707a1 1 0 0 1 0-1.414ZM4 11a1 1 0 1 1 0 2H3a1 1 0 1 1 0-2h1Zm2.05 6.364a1 1 0 0 1 1.414 0l.707.707A1 1 0 1 1 6.757 20.5l-.707-.707a1 1 0 0 1 0-1.414ZM12 18a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Zm7.071-2.071a1 1 0 0 1-1.414 1.414l-.707-.707A1 1 0 1 1 18.95 14.5l.707.707a1 1 0 0 1 0 1.414Z"/>
                  </svg>
                </span>
                <span className="label">Theme</span>
              </button>
            </div>
          </div>
        </header>

        <div className={`drawer ${drawerOpen ? 'drawer-open' : ''}`} aria-hidden={!drawerOpen}>
          <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />
          <aside className="drawer-panel" role="dialog" aria-modal="true" aria-label="Navigation">
            <div className="drawer-head">
              <div className="brand">
                <Image src="/logo.png" alt="burnNbyte logo" className="brand-mark" width={52} height={52} unoptimized priority />
                <div className="brand-copy">
                  <div className="brand-title">burnNbyte</div>
                  <div className="brand-subtitle">Train sharper. Eat cleaner.</div>
                </div>
              </div>
              <button className="btn btn-ghost" onClick={() => setDrawerOpen(false)} aria-label="Close">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6.225 4.811 12 10.586l5.775-5.775a1 1 0 1 1 1.414 1.414L13.414 12l5.775 5.775a1 1 0 0 1-1.414 1.414L12 13.414l-5.775 5.775a1 1 0 0 1-1.414-1.414L10.586 12 4.81 6.225A1 1 0 0 1 6.225 4.81Z"/></svg>
              </button>
            </div>
            <nav className="drawer-nav">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} className={`drawer-link ${isActive(item.href) ? 'active' : ''}`} href={item.href} onClick={() => setDrawerOpen(false)}>
                  {item.label}
                </Link>
              ))}
              <Link className={`drawer-link ${isActive('/healthCalendar') ? 'active' : ''}`} href="/healthCalendar" onClick={() => setDrawerOpen(false)}>Calendar</Link>
              <Link className={`drawer-link ${isActive('/groceries') ? 'active' : ''}`} href="/groceries" onClick={() => setDrawerOpen(false)}>Groceries</Link>
            </nav>
            <div className="drawer-foot">
              <button
                className="btn btn-outline"
                style={{ width: '100%' }}
                onClick={() => {
                  setDrawerOpen(false);
                  signOut({ callbackUrl: '/signin' });
                }}
              >
                <span className="label">Log out</span>
              </button>
            </div>
          </aside>
        </div>

        <main className="app-main">
          {children}
        </main>
      </div>
    </div>
  );
}

