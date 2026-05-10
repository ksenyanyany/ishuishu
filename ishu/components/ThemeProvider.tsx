'use client';

import { useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
    // Wake up Railway backend immediately so it's ready by the time user navigates
    fetch(`${API}/api/ping/`).catch(() => {});
  }, []);
  return <>{children}</>;
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}
