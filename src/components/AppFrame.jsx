'use client';

import Image from 'next/image';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Apple,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  Home,
  History,
  Lightbulb,
  LogOut,
  Menu,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  X,
} from 'lucide-react';
import NavigationFeedback from '@/components/NavigationFeedback';
import KeepScreenAwakeButton from '@/components/KeepScreenAwakeButton';

const PRIMARY_NAV_ITEMS = [
  { href: '/', label: 'Today', icon: Home },
  { href: '/workouts', label: 'Train', icon: Dumbbell },
  { href: '/meals', label: 'Fuel', icon: Apple },
  { href: '/progress', label: 'Progress', icon: Activity },
];

const PROFILE_NAV_ITEM = { href: '/profile', label: 'Profile', icon: UserRound };

const SECONDARY_NAV_ITEMS = [
  { href: '/workout-log', label: 'Workout log', icon: History },
  { href: '/groceries', label: 'Groceries', icon: ShoppingBag },
  { href: '/meal-library', label: 'Meal library', icon: BookOpen },
  { href: '/healthCalendar', label: 'Calendar', icon: CalendarDays },
  { href: '/suggestions', label: 'Suggestions', icon: Lightbulb },
];

const ROUTE_META = {
  '/': { eyebrow: 'YOUR DAY', title: 'Today' },
  '/workouts': { eyebrow: 'TRAINING', title: 'Your training plan' },
  '/workout-log': { eyebrow: 'TRAINING HISTORY', title: 'Workout log' },
  '/meals': { eyebrow: 'NUTRITION', title: 'Fuel the work' },
  '/progress': { eyebrow: 'MOMENTUM', title: 'See what is changing' },
  '/groceries': { eyebrow: 'WEEKLY PREP', title: 'Grocery run' },
  '/meal-library': { eyebrow: 'YOUR FAVORITES', title: 'Meal library' },
  '/healthCalendar': { eyebrow: 'SCHEDULE', title: 'Health calendar' },
  '/profile': { eyebrow: 'ACCOUNT', title: 'Profile and preferences' },
  '/suggestions': { eyebrow: 'FEEDBACK', title: 'Shape the app' },
  '/admin/access': { eyebrow: 'ADMIN', title: 'Access control' },
  '/expired': { eyebrow: 'PLAN ACCESS', title: 'Your plan is paused' },
  '/terms': { eyebrow: 'POLICY', title: 'Terms and conditions' },
};

function NavLink({ item, active, className = '', onClick }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`${className} ${active ? 'active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      <Icon size={19} strokeWidth={1.8} aria-hidden />
      <span>{item.label}</span>
    </Link>
  );
}

export default function AppFrame({ children, session }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const secondaryNavItems = useMemo(
    () => (
      session?.user?.isAdmin
        ? [...SECONDARY_NAV_ITEMS, { href: '/admin/access', label: 'Admin access', icon: ShieldCheck }]
        : SECONDARY_NAV_ITEMS
    ),
    [session?.user?.isAdmin]
  );

  const isActive = (href) => (
    href === '/'
      ? pathname === '/'
      : pathname === href || pathname?.startsWith(`${href}/`)
  );

  const routeMeta = ROUTE_META[pathname] || Object.entries(ROUTE_META)
    .filter(([route]) => route !== '/')
    .find(([route]) => pathname?.startsWith(`${route}/`))?.[1] || {
    eyebrow: 'BURNNBYTE',
    title: 'Your plan',
  };
  const displayName = session?.user?.name || session?.user?.email?.split('@')[0] || 'You';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'U';

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [drawerOpen]);

  return (
    <div id="app" className="bn-app">
      <NavigationFeedback />
      <aside className="bn-rail">
        <Link className="bn-brand" href="/" aria-label="burnNbyte home">
          <Image src="/logo.png" alt="" width={42} height={42} priority />
          <span>burnNbyte</span>
        </Link>

        <nav className="bn-primary-nav" aria-label="Primary navigation">
          {[...PRIMARY_NAV_ITEMS, PROFILE_NAV_ITEM].map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              className="bn-nav-link"
            />
          ))}
        </nav>

        <div className="bn-rail-section">
          <span className="bn-rail-label">PLAN</span>
          <nav aria-label="Planning tools">
            {secondaryNavItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                className="bn-nav-link bn-nav-link-secondary"
              />
            ))}
          </nav>
        </div>

        <div className="bn-rail-profile">
          <Link href="/profile" className={isActive('/profile') ? 'active' : ''}>
            <span className="bn-avatar">{initial}</span>
            <span>
              <strong>{displayName}</strong>
              <small>View profile</small>
            </span>
            <ChevronRight size={15} aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/signin' })}
            aria-label="Log out"
          >
            <LogOut size={17} aria-hidden />
          </button>
        </div>
      </aside>

      <div className="bn-workspace">
        <header className="bn-topbar">
          <div className="bn-topbar-copy">
            <span>{routeMeta.eyebrow}</span>
            <h1>{pathname === '/' ? `Good to see you, ${displayName}.` : routeMeta.title}</h1>
          </div>
          <KeepScreenAwakeButton visible={pathname === '/'} />
        </header>

        <main className="bn-content">
          {children}
        </main>
      </div>

      <nav className="bn-mobile-nav" aria-label="Mobile navigation">
        {PRIMARY_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href)}
            className="bn-mobile-nav-link"
          />
        ))}
        <button
          type="button"
          className={drawerOpen ? 'active' : ''}
          onClick={() => setDrawerOpen(true)}
          aria-label="Open more navigation"
        >
          <Menu size={19} />
          <span>More</span>
        </button>
      </nav>

      <div className={`bn-drawer ${drawerOpen ? 'open' : ''}`} aria-hidden={!drawerOpen}>
        <button
          className="bn-drawer-backdrop"
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close navigation"
          tabIndex={drawerOpen ? 0 : -1}
        />
        <aside className="bn-drawer-panel" role="dialog" aria-modal="true" aria-label="More navigation">
          <header>
            <div className="bn-brand">
              <Image src="/logo.png" alt="" width={40} height={40} />
              <span>burnNbyte</span>
            </div>
            <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close navigation">
              <X size={20} />
            </button>
          </header>

          <div className="bn-drawer-profile">
            <span className="bn-avatar">{initial}</span>
            <span>
              <strong>{displayName}</strong>
              <small>{session?.user?.email || 'Your account'}</small>
            </span>
          </div>

          <nav aria-label="All navigation">
            {[...SECONDARY_NAV_ITEMS, PROFILE_NAV_ITEM]
              .concat(session?.user?.isAdmin ? [{ href: '/admin/access', label: 'Admin access', icon: ShieldCheck }] : [])
              .map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(item.href)}
                  className="bn-drawer-link"
                  onClick={() => setDrawerOpen(false)}
                />
              ))}
          </nav>

          <button
            className="bn-drawer-logout"
            type="button"
            onClick={() => signOut({ callbackUrl: '/signin' })}
          >
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </aside>
      </div>
    </div>
  );
}
