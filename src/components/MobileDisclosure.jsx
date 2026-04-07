'use client';

import { useEffect, useState } from 'react';

export default function MobileDisclosure({
  className = '',
  summaryClassName = '',
  panelClassName = '',
  summary,
  children,
  defaultOpenMobile = false,
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 720px)');
    const update = () => setIsMobile(media.matches);
    update();
    setMounted(true);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  if (!mounted || !isMobile) {
    return (
      <div className={className}>
        <div className={panelClassName}>{children}</div>
      </div>
    );
  }

  return (
    <details className={className} open={defaultOpenMobile}>
      <summary className={summaryClassName}>{summary}</summary>
      <div className={panelClassName}>{children}</div>
    </details>
  );
}
