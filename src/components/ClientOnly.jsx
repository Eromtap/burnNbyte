'use client';
import { useEffect, useState } from 'react';

export default function ClientOnly({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return children;
}


// TODO: this component may not be necessary. It checks if user is logged in
// but there are other ways to do this that seem to work. 
// Looked cute, may delete later.