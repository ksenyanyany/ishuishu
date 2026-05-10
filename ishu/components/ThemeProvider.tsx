'use client';

import { useEffect } from 'react';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);
  return <>{children}</>;
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}
