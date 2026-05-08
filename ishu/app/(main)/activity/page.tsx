'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const API = process.env.NEXT_PUBLIC_API_URL;

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return { Authorization: `Token ${token}` };
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

type NotifType = 'like' | 'comment' | 'follow';

type Notif = {
  id: number;
  type: NotifType;
  actor: { id: number; name: string; avatar: string };
  post_id: number | null;
  post_text: string;
  is_read: boolean;
  created_at: string;
};

type Chat = {
  partner: { id: number; name: string; avatar: string };
  last_message: { text: string; image: string; created_at: string; is_mine: boolean } | null;
  unread_count: number;
};

function Avatar({ name, avatar, size = 10 }: { name: string; avatar: string; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full bg-[#C5CEDC] flex items-center justify-center shrink-0 overflow-hidden`;
  return (
    <div className={cls}>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-xs font-semibold text-[#4B5563]">{initials(name)}</span>
      )}
    </div>
  );
}

export default function ActivityPage() {
  const [activeTab, setActiveTab] = useState<'chats' | 'notifications'>('chats');
  const [chats, setChats] = useState<Chat[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingNotifs, setLoadingNotifs] = useState(true);

  const loadChats = useCallback(async () => {
    setLoadingChats(true);
    try {
      const res = await fetch(`${API}/api/chats/`, { headers: authHeaders() });
      if (res.ok) setChats(await res.json());
    } finally {
      setLoadingChats(false);
    }
  }, []);

  const loadNotifs = useCallback(async () => {
    setLoadingNotifs(true);
    try {
      const res = await fetch(`${API}/api/notifications/`, { headers: authHeaders() });
      if (res.ok) setNotifs(await res.json());
    } finally {
      setLoadingNotifs(false);
    }
  }, []);

  useEffect(() => { loadChats(); }, [loadChats]);
  useEffect(() => { loadNotifs(); }, [loadNotifs]);

  async function markAllRead() {
    await fetch(`${API}/api/notifications/read/`, { method: 'POST', headers: authHeaders() });
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  const unreadChats = chats.reduce((s, c) => s + (c.unread_count > 0 ? 1 : 0), 0);
  const unreadNotifs = notifs.filter((n) => !n.is_read).length;

  function notifText(n: Notif) {
    if (n.type === 'like') return ' лайкнул(а) ваш пост';
    if (n.type === 'comment') return ' прокомментировал(а) ваш пост';
    return ' подписался(ась) на вас';
  }

  return (
    <main className="flex flex-col py-6 gap-4">

      {/* Переключатель */}
      <div className="flex gap-1 bg-[#E2E6EF] rounded-2xl p-1">
        {(['chats', 'notifications'] as const).map((tab) => {
          const badge = tab === 'chats' ? unreadChats : unreadNotifs;
          const label = tab === 'chats' ? 'Сообщения' : 'Уведомления';
          const badgeColor = tab === 'chats' ? 'bg-[#6B7FA8]' : 'bg-[#B06B8A]';
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab ? 'bg-white text-[#1F2A44] shadow-sm' : 'text-[#9AA3B8]'
              }`}
            >
              {label}
              {badge > 0 && (
                <div className={`w-4 h-4 rounded-full ${badgeColor} flex items-center justify-center`}>
                  <span className="text-white text-[9px] font-bold">{badge}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Чаты */}
      {activeTab === 'chats' && (
        <section>
          <span className="text-base font-bold text-[#1F2A44] block mb-3">Сообщения</span>

          {loadingChats ? (
            <p className="text-sm text-[#9AA3B8] text-center py-8">Загрузка...</p>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-2">
              <span className="text-2xl">·  ·  ·</span>
              <span className="text-sm text-[#9AA3B8]">Нет сообщений</span>
            </div>
          ) : (
            <div className="bg-[#EDEFF3] rounded-2xl overflow-hidden">
              {chats.map((chat, i) => (
                <div key={chat.partner.id}>
                  <Link href={`/activity/chat/${chat.partner.id}`}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Avatar name={chat.partner.name} avatar={chat.partner.avatar} size={10} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-[#1F2A44] block">{chat.partner.name}</span>
                        <span className="text-xs text-[#9AA3B8] truncate block">
                          {chat.last_message
                            ? (chat.last_message.is_mine ? 'Вы: ' : '') + (chat.last_message.text || '📷 Фото')
                            : ''}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {chat.last_message && (
                          <span className="text-[10px] text-[#9AA3B8]">
                            {formatDistanceToNow(new Date(chat.last_message.created_at), { addSuffix: false, locale: ru })}
                          </span>
                        )}
                        {chat.unread_count > 0 && (
                          <div className="w-5 h-5 rounded-full bg-[#6B7FA8] flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold">{chat.unread_count}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                  {i < chats.length - 1 && <div className="h-px bg-[#DDE3EC] mx-4" />}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Уведомления */}
      {activeTab === 'notifications' && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-bold text-[#1F2A44]">Уведомления</span>
            {unreadNotifs > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#9AA3B8]">
                Прочитать все
              </button>
            )}
          </div>

          {loadingNotifs ? (
            <p className="text-sm text-[#9AA3B8] text-center py-8">Загрузка...</p>
          ) : notifs.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-2">
              <span className="text-2xl">·  ·  ·</span>
              <span className="text-sm text-[#9AA3B8]">Нет уведомлений</span>
            </div>
          ) : (
            <div className="bg-[#EDEFF3] rounded-2xl overflow-hidden">
              {notifs.map((n, i) => {
                const inner = (
                  <div className={`flex items-center gap-3 px-4 py-3 ${!n.is_read ? 'bg-[#E6EAF2]' : ''}`}>
                    <div className="relative shrink-0">
                      <Avatar name={n.actor.name} avatar={n.actor.avatar} size={10} />
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${n.type === 'like' ? 'bg-[#B06B8A]' : n.type === 'comment' ? 'bg-[#6B7FA8]' : 'bg-[#7A9E7E]'}`}>
                        {n.type === 'like' ? (
                          <svg width="8" height="8" viewBox="0 0 14 14" fill="white">
                            <path d="M7 12S1 8 1 4.5A3.5 3.5 0 0 1 7 2.5 3.5 3.5 0 0 1 13 4.5C13 8 7 12 7 12Z" />
                          </svg>
                        ) : n.type === 'comment' ? (
                          <svg width="8" height="8" viewBox="0 0 14 14" fill="white">
                            <path d="M2 2h10v8H8l-3 2v-2H2z" />
                          </svg>
                        ) : (
                          <svg width="8" height="8" viewBox="0 0 14 14" fill="white">
                            <path d="M7 1a6 6 0 100 12A6 6 0 007 1zm0 2a2 2 0 110 4 2 2 0 010-4zm0 8a4 4 0 01-3.4-1.9C4.7 8.4 6.2 8 7 8s2.3.4 3.4 1.1A4 4 0 017 11z" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1F2A44] leading-snug">
                        <span className="font-semibold">{n.actor.name}</span>
                        {notifText(n)}
                        {n.post_text && <span className="text-[#9AA3B8]"> «{n.post_text}»</span>}
                      </p>
                      <span className="text-xs text-[#9AA3B8]">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ru })}
                      </span>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-[#B06B8A] shrink-0" />}
                  </div>
                );

                return (
                  <div key={n.id}>
                    {n.post_id ? (
                      <Link href={`/post/${n.post_id}`}>{inner}</Link>
                    ) : (
                      <Link href={`/profile/${n.actor.id}`}>{inner}</Link>
                    )}
                    {i < notifs.length - 1 && <div className="h-px bg-[#DDE3EC] mx-4" />}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

    </main>
  );
}
