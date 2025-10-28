'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { signOut } from 'next-auth/react';

export default function AppFrame({ children }){
  const pathname = usePathname();
  const { toggle } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (href) => (pathname === href);

  return (
    <div id="app">
      <header className="app-header">
        <div className="header-main">
          <button className="btn btn-ghost" aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M4 7a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Z"/></svg>
          </button>
          <h1 className="brand">
            <img src="/logo.png" alt="burnNbyte logo" className="logo-brand"/>
          </h1>
          <div className="header-actions">
            <button className="btn btn-ghost" aria-label="Toggle theme" onClick={toggle}>
              <span className="icon" aria-hidden>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm7.071 2.929a1 1 0 0 1 0 1.414l-.707.707a1 1 0 0 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0ZM21 11a1 1 0 1 1 0 2h-1a1 1 0 1 1 0-2h1ZM5.05 5.636a1 1 0 0 1 1.414 0l.707.707A1 1 0 1 1 5.757 7.757l-.707-.707a1 1 0 0 1 0-1.414ZM4 11a1 1 0 1 1 0 2H3a1 1 0 1 1 0-2h1Zm2.05 6.364a1 1 0 0 1 1.414 0l.707.707A1 1 0 1 1 6.757 20.5l-.707-.707a1 1 0 0 1 0-1.414ZM12 18a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Zm7.071-2.071a1 1 0 0 1-1.414 1.414l-.707-.707A1 1 0 1 1 18.95 14.5l.707.707a1 1 0 0 1 0 1.414Z"/>
                </svg>
              </span>
              <span className="label">Theme</span>
            </button>
          </div>
        </div>
      </header>

      {/* Side Drawer Navigation */}
      <div className={`drawer ${drawerOpen ? 'drawer-open' : ''}`} aria-hidden={!drawerOpen}>
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />
        <aside className="drawer-panel" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="drawer-head">
            <div className="brand"><img src="/logo.png" alt="burnNbyte logo" className="logo-drawer"/></div>
            <button className="btn btn-ghost" onClick={() => setDrawerOpen(false)} aria-label="Close">✕</button>
          </div>
          <nav className="drawer-nav">
            <Link className={`drawer-link ${isActive('/') ? 'active' : ''}`} href="/" onClick={() => setDrawerOpen(false)}>Dashboard</Link>
            <Link className={`drawer-link ${isActive('/healthCalendar') ? 'active' : ''}`} href="/healthCalendar" onClick={() => setDrawerOpen(false)}>Calendar</Link>
            <Link className={`drawer-link ${isActive('/workouts') ? 'active' : ''}`} href="/workouts" onClick={() => setDrawerOpen(false)}>Workouts</Link>
            <Link className={`drawer-link ${isActive('/meals') ? 'active' : ''}`} href="/meals" onClick={() => setDrawerOpen(false)}>Meals</Link>
            <Link className={`drawer-link ${isActive('/pantry') ? 'active' : ''}`} href="/pantry" onClick={() => setDrawerOpen(false)}>Pantry</Link>
            <Link className={`drawer-link ${isActive('/groceries') ? 'active' : ''}`} href="/groceries" onClick={() => setDrawerOpen(false)}>Groceries</Link>
            <Link className={`drawer-link ${isActive('/profile') ? 'active' : ''}`} href="/profile" onClick={() => setDrawerOpen(false)}>Profile</Link>
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
  );
}
