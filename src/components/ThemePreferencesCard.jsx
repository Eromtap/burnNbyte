'use client';

import { useTheme } from '@/components/ThemeProvider';

export default function ThemePreferencesCard() {
  const { theme, toggle } = useTheme();
  const currentTheme = theme === 'tech-red' ? 'Tech Red' : 'Slate';
  const nextTheme = theme === 'tech-red' ? 'Slate' : 'Tech Red';

  return (
    <article className="card bn-route-stage">
      <header className="card-head">
        <div>
          <h3>Appearance</h3>
          <div className="sub">Theme controls live here now instead of the desktop top bar.</div>
        </div>
      </header>
      <div className="theme-preferences-row">
        <div className="metric-card theme-preferences-card">
          <div className="metric-label">Current theme</div>
          <div className="metric-value">{currentTheme}</div>
          <div className="metric-detail">Adjust the app palette from your preferences page.</div>
        </div>
        <button className="btn btn-outline theme-preferences-button" type="button" onClick={toggle}>
          Switch to {nextTheme}
        </button>
      </div>
    </article>
  );
}
