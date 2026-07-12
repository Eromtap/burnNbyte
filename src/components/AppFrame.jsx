'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import Image from 'next/image';

const PRIMARY_NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/workouts', label: 'Workouts' },
  { href: '/meals', label: 'Meals' },
  { href: '/meal-library', label: 'Meal Library' },
  { href: '/groceries', label: 'Groceries' },
  { href: '/progress', label: 'Progress' },
  { href: '/healthCalendar', label: 'Calendar' },
];

const SECONDARY_NAV_ITEMS = [
  { href: '/profile', label: 'Profile' },
  { href: '/suggestions', label: 'Suggestion Box' },
];

export default function AppFrame({ children, session }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const secondaryNavItems = session?.user?.isAdmin
    ? [...SECONDARY_NAV_ITEMS, { href: '/admin/access', label: 'Admin Access' }]
    : SECONDARY_NAV_ITEMS;
  const mobileNavItems = [...PRIMARY_NAV_ITEMS, ...secondaryNavItems];

  const isActive = (href) => pathname === href;
  const moreActive = secondaryNavItems.some((item) => isActive(item.href));

  useEffect(() => {
    setDrawerOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  return (
    <div id="app">
      <div className="app-shell">
        <header className="app-header">
          <div className="header-main">
            <button className="btn btn-ghost mobile-menu-trigger" aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
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
                {PRIMARY_NAV_ITEMS.map((item) => (
                  <Link key={item.href} className={`desktop-nav-link ${isActive(item.href) ? 'active' : ''}`} href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="desktop-more">
                <button
                  className={`desktop-more-trigger ${moreActive ? 'active' : ''}`}
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={moreOpen}
                  onClick={() => setMoreOpen((open) => !open)}
                >
                  <span>More</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
                    <path d="M6.47 8.97a.75.75 0 0 1 1.06 0L12 13.44l4.47-4.47a.75.75 0 1 1 1.06 1.06l-5 5a.75.75 0 0 1-1.06 0l-5-5a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </button>
                {moreOpen && (
                  <div className="desktop-more-menu" role="menu" aria-label="More options">
                    {secondaryNavItems.map((item) => (
                      <Link
                        key={item.href}
                        role="menuitem"
                        className={`desktop-more-link ${isActive(item.href) ? 'active' : ''}`}
                        href={item.href}
                      >
                        {item.label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      role="menuitem"
                      className="desktop-more-link desktop-more-action"
                      onClick={() => signOut({ callbackUrl: '/signin' })}
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className={`drawer mobile-only ${drawerOpen ? 'drawer-open' : ''}`} aria-hidden={!drawerOpen}>
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
              {mobileNavItems.map((item) => (
                <Link key={item.href} className={`drawer-link ${isActive(item.href) ? 'active' : ''}`} href={item.href} onClick={() => setDrawerOpen(false)}>
                  {item.label}
                </Link>
              ))}
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
