'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext({ theme: 'tech-red', toggle: () => {} });

export function ThemeProvider({ children, defaultTheme = 'tech-red' }) {
  const [theme, setTheme] = useState(defaultTheme);

  useEffect(() => {
    const saved = typeof window !== 'undefined' && localStorage.getItem('bn_theme');
    const next = saved || defaultTheme;
    setTheme(next);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next);
    }
  }, [defaultTheme]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      try { localStorage.setItem('bn_theme', theme); } catch {}
    }
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    toggle: () => setTheme((t) => (t === 'tech-red' ? 'slate' : 'tech-red')),
    setTheme,
  }), [theme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

