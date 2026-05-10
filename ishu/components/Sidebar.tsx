'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return { Authorization: `Token ${token}` };
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [badgeCount, setBadgeCount] = useState(0);
  const [avatar, setAvatar] = useState('');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const profileRes = await fetch(`${API}/api/profile/`, { headers: authHeaders() });
        if (profileRes.ok) {
          const p = await profileRes.json();
          if (p.avatar) setAvatar(p.avatar);
          if (p.name) setName(p.name);
          if (p.handle) setHandle(p.handle);
        }
      } catch { /* ignore */ }
    }

    async function loadBadges() {
      try {
        const [notifsRes, chatsRes] = await Promise.all([
          fetch(`${API}/api/notifications/`, { headers: authHeaders() }),
          fetch(`${API}/api/chats/`, { headers: authHeaders() }),
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
        setBadgeCount(total);
      } catch { /* ignore */ }
    }

    loadProfile();
    loadBadges();
    const interval = setInterval(loadBadges, 60_000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (path: string) =>
    path === '/feed' ? pathname === path : pathname === path || pathname.startsWith(path + '/');

  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  const navItems = [
    {
      href: '/feed',
      label: 'Лента',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H15v-5h-6v5H4a1 1 0 01-1-1V10.5z"
            stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"
            fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        </svg>
      ),
    },
    {
      href: '/activity',
      label: 'Активность',
      badge: badgeCount,
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
            stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"
            fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        </svg>
      ),
    },
    {
      href: '/profile',
      label: 'Профиль',
      icon: (_active: boolean) => (
        <div className="w-[22px] h-[22px] rounded-full overflow-hidden bg-[#C5CEDC] dark:bg-[#252F45] flex items-center justify-center shrink-0">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="7" r="4" stroke="#4B5563" strokeWidth="2" />
            </svg>
          )}
        </div>
      ),
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 px-4 py-8 z-20 bg-[rgba(248,250,252,0.95)] dark:bg-[#161C2A] border-r border-[rgba(221,227,236,0.8)] dark:border-[#252F45]"
      style={{
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Логотип */}
      <div className="px-3 mb-10">
        <span className="text-4xl font-(--font-astroneer) text-[#1F2A44] dark:text-[#E4EAF5]">ishu.</span>
      </div>

      {/* Навигация */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ href, label, icon, badge }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-3 rounded-2xl transition-all ${
                active
                  ? 'bg-[#6B7FA8]/10 text-[#6B7FA8]'
                  : 'text-[#9AA3B8] hover:bg-[#EDEFF3] dark:hover:bg-[#1C2438] hover:text-[#1F2A44]'
              }`}
            >
              <div className="relative shrink-0">
                {icon(active)}
                {badge != null && badge > 0 && (
                  <div className="absolute -top-1 -right-2 min-w-[16px] h-4 rounded-full bg-[#B06B8A] flex items-center justify-center px-0.5">
                    <span className="text-white text-[8px] font-bold leading-none">{badge}</span>
                  </div>
                )}
              </div>
              <span className="text-base font-semibold">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Кнопка создать пост */}
      <button
        onClick={() => router.push('/create')}
        className="w-full py-3 rounded-2xl text-white font-bold text-sm mb-4 active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(140deg, #7D90B8, #5A6E96)', boxShadow: '0 4px 16px rgba(90,110,150,0.3)' }}
      >
        Создать пост
      </button>

      {/* Профиль пользователя */}
      {name && (
        <div className="flex items-center gap-3 px-2 py-2 rounded-2xl hover:bg-[#EDEFF3] dark:hover:bg-[#1C2438] cursor-pointer transition-all" onClick={() => router.push('/profile')}>
          <div className="w-9 h-9 rounded-full overflow-hidden bg-[#C5CEDC] dark:bg-[#252F45] flex items-center justify-center shrink-0">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-[#4B5563]">{initials}</span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-[#1F2A44] dark:text-[#E4EAF5] truncate">{name}</span>
            <span className="text-xs text-[#9AA3B8] truncate">{handle}</span>
          </div>
        </div>
      )}
    </aside>
  );
}
