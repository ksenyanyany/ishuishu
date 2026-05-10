'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('token')) {
      router.replace('/feed');
    }
  }, [router]);

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-8 lg:justify-end lg:pr-24 xl:pr-40"
      style={{
        backgroundImage: "url('/bg.svg')",
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
      }}
    >
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}
