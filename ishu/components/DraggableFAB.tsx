'use client';

import { useRouter, usePathname } from 'next/navigation';

export default function FAB() {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === '/create' || pathname.startsWith('/activity/chat/')) return null;

  return (
    <button
      onClick={() => router.push('/create')}
      className="fixed z-40 w-14 h-14 rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
      style={{
        right: 16,
        bottom: 110,
        background: 'linear-gradient(140deg, #7D90B8, #5A6E96)',
        boxShadow: '0 6px 24px rgba(90,110,150,0.45)',
      }}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 4v14M4 11h14" stroke="white" strokeWidth="2.3" strokeLinecap="round"/>
      </svg>
    </button>
  );
}
