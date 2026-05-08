'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return { Authorization: `Token ${token}` };
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H15v-5h-6v5H4a1 1 0 01-1-1V10.5z"
        stroke={active ? '#6B7FA8' : '#9AA3B8'}
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={active ? '#6B7FA820' : 'none'}
      />
    </svg>
  );
}

function ActivityIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
        stroke={active ? '#6B7FA8' : '#9AA3B8'}
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={active ? '#6B7FA820' : 'none'}
      />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const [badgeCount, setBadgeCount] = useState(0);
  const [avatar, setAvatar] = useState('');
  const [userInitials, setUserInitials] = useState('');

  useEffect(() => {
    // Инициалы из localStorage
    const name = localStorage.getItem('username') || '';
    setUserInitials(name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?');

    async function loadBadge() {
      try {
        const [notifsRes, chatsRes, profileRes] = await Promise.all([
          fetch(`${API}/api/notifications/`, { headers: authHeaders() }),
          fetch(`${API}/api/chats/`, { headers: authHeaders() }),
          fetch(`${API}/api/profile/`, { headers: authHeaders() }),
        ]);

        let total = 0;
        if (notifsRes.ok) {
          const notifs = await notifsRes.json();
          total += notifs.filter((n: { is_read: boolean }) => !n.is_read).length;
        }
        if (chatsRes.ok) {
          const chats = await chatsRes.json();
          total += chats.reduce((s: number, c: { unread_count: number }) => s + (c.unread_count > 0 ? 1 : 0), 0);
        }
        if (profileRes.ok) {
          const p = await profileRes.json();
          if (p.avatar) setAvatar(p.avatar);
          if (p.name) setUserInitials(p.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '?');
        }
        setBadgeCount(total);
      } catch {
        // игнорируем
      }
    }

    loadBadge();
  }, [pathname]); // обновляем при смене страницы

  if (pathname.startsWith('/activity/chat/')) return null;

  const isActive = (path: string) => pathname === path;

  return (
    <div className="fixed bottom-0 inset-x-0 flex justify-center pb-5 px-4 z-30 pointer-events-none">
      <nav
        className="pointer-events-auto w-full max-w-sm flex items-center px-4 py-2 gap-2"
        style={{
          background: 'rgba(235, 240, 248, 0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '22px',
          border: '1px solid rgba(255,255,255,0.7)',
          boxShadow: '0 8px 32px rgba(107,127,168,0.15), 0 2px 8px rgba(107,127,168,0.08)',
        }}
      >
        {/* Главная */}
        <Link
          href="/feed"
          className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-all ${
            isActive('/feed') ? 'bg-[#6B7FA8]/10' : 'active:bg-[#6B7FA8]/5'
          }`}
        >
          <HomeIcon active={isActive('/feed')} />
          <span className={`text-[10px] font-semibold ${isActive('/feed') ? 'text-[#6B7FA8]' : 'text-[#9AA3B8]'}`}>
            Главная
          </span>
        </Link>

        {/* Активность */}
        <Link
          href="/activity"
          className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-all ${
            isActive('/activity') ? 'bg-[#6B7FA8]/10' : 'active:bg-[#6B7FA8]/5'
          }`}
        >
          <div className="relative">
            <ActivityIcon active={isActive('/activity')} />
            {badgeCount > 0 && (
              <div className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-[#B06B8A] flex items-center justify-center border-2 border-[#EBF0F8]">
                <span className="text-white text-[8px] font-bold leading-none">{badgeCount}</span>
              </div>
            )}
          </div>
          <span className={`text-[10px] font-semibold ${isActive('/activity') ? 'text-[#6B7FA8]' : 'text-[#9AA3B8]'}`}>
            Активность
          </span>
        </Link>

        {/* Профиль */}
        <Link
          href="/profile"
          className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-all ${
            isActive('/profile') ? 'bg-[#6B7FA8]/10' : 'active:bg-[#6B7FA8]/5'
          }`}
        >
          <div
            className="w-[22px] h-[22px] rounded-full flex items-center justify-center overflow-hidden"
            style={{
              background: avatar ? 'transparent' : (isActive('/profile') ? 'linear-gradient(135deg, #7D90B8, #5A6E96)' : '#C5CEDC'),
              boxShadow: isActive('/profile') ? '0 0 0 2px #6B7FA8' : 'none',
            }}
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="аватар" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[9px] font-bold" style={{ color: isActive('/profile') ? 'white' : '#4B5563' }}>
                {userInitials}
              </span>
            )}
          </div>
          <span className={`text-[10px] font-semibold ${isActive('/profile') ? 'text-[#6B7FA8]' : 'text-[#9AA3B8]'}`}>
            Профиль
          </span>
        </Link>
      </nav>
    </div>
  );
}
