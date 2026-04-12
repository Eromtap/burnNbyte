'use client';

import { useEffect, useState } from 'react';

export default function MobileDisclosure({
  className = '',
  summaryClassName = '',
  panelClassName = '',
  summary,
  children,
  defaultOpenMobile = false,
  anchorId = '',
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(defaultOpenMobile);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 720px)');
    const update = () => setIsMobile(media.matches);
    update();
    setMounted(true);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    setIsOpen(defaultOpenMobile);
  }, [defaultOpenMobile]);

  useEffect(() => {
    if (!mounted || !isMobile || !anchorId) return;

    const normalize = (value) => String(value || '').replace(/^#/, '');
    const target = normalize(anchorId);

    const syncToHash = () => {
      const hash = normalize(window.location.hash);
      if (!hash) {
        setIsOpen(defaultOpenMobile);
        return;
      }

      const matches = hash === target;
      setIsOpen(matches);
      if (!matches) return;

      window.requestAnimationFrame(() => {
        const el = document.getElementById(target);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    };

    syncToHash();
    window.addEventListener('hashchange', syncToHash);
    return () => window.removeEventListener('hashchange', syncToHash);
  }, [mounted, isMobile, anchorId, defaultOpenMobile]);

  if (!mounted || !isMobile) {
    return (
      <div className={className} id={anchorId || undefined}>
        <div className={panelClassName}>{children}</div>
      </div>
    );
  }

  return (
    <details
      className={className}
      id={anchorId || undefined}
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className={summaryClassName}>{summary}</summary>
      <div className={panelClassName}>{children}</div>
    </details>
  );
}
