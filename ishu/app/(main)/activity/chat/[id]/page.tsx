'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const API = process.env.NEXT_PUBLIC_API_URL;

function authHeaders(extra: Record<string, string> = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return { Authorization: `Token ${token}`, ...extra };
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

type Message = {
  id: number | string;
  text: string;
  image: string;
  created_at: string;
  is_mine: boolean;
  is_read: boolean;
  pending?: boolean;
};

type Partner = { id: number; name: string; avatar: string };

function Ticks({ msg }: { msg: Message }) {
  if (!msg.is_mine) return null;
  if (msg.pending) {
    return (
      <span className="ml-1 shrink-0 self-end mb-[3px]">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/>
          <path d="M12 7v5l3 3" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </span>
    );
  }
  const color = msg.is_read ? '#a8c5ff' : 'rgba(255,255,255,0.45)';
  return (
    <span className="ml-1 shrink-0 self-end mb-[3px]">
      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
        <path d="M1 3.5L3.2 5.5L8 1" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    try {
      const [profileRes, msgsRes] = await Promise.all([
        fetch(`${API}/api/profile/${id}/`, { headers: authHeaders() }),
        fetch(`${API}/api/chats/${id}/`, { headers: authHeaders() }),
      ]);
      if (profileRes.ok) {
        const p = await profileRes.json();
        setPartner({ id: p.id, name: p.name, avatar: p.avatar });
      }
      if (msgsRes.ok) {
        setMessages(await msgsRes.json());
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if ((!text.trim() && !image) || sending) return;
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      text: text.trim(),
      image,
      created_at: new Date().toISOString(),
      is_mine: true,
      is_read: false,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText('');
    setImage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const res = await fetch(`${API}/api/chats/${id}/`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ text: optimistic.text, image: optimistic.image }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => prev.map((m) => m.id === tempId ? msg : m));
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="flex flex-col h-screen">

      {/* Шапка */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 pt-14 pb-3 px-4 bg-[#F3F6FC]/95 backdrop-blur-sm border-b border-[#DDE3EC]">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#EDEFF3] flex items-center justify-center shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="#6B7FA8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {partner && (
          <>
            <div className="w-10 h-10 rounded-full bg-[#C5CEDC] flex items-center justify-center shrink-0 overflow-hidden">
              {partner.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={partner.avatar} alt={partner.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-[#4B5563]">{initials(partner.name)}</span>
              )}
            </div>
            <span className="text-base font-bold text-[#1F2A44] flex-1">{partner.name}</span>
          </>
        )}
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto pt-[110px]">
        <div className="flex flex-col justify-end min-h-full px-4 pt-4 pb-0">
          {loading ? (
            <p className="text-sm text-[#9AA3B8] text-center py-8">Загрузка...</p>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-16 gap-2">
              <span className="text-2xl">·  ·  ·</span>
              <span className="text-sm text-[#9AA3B8]">Начните диалог</span>
            </div>
          ) : (
            messages.map((msg, i) => {
              const showTime =
                i === messages.length - 1 ||
                messages[i + 1].is_mine !== msg.is_mine;

              return (
                <div key={msg.id} className={`flex mb-1.5 ${msg.is_mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] flex flex-col ${msg.is_mine ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed ${
                        msg.is_mine
                          ? 'bg-[#6B7FA8] text-white rounded-br-sm'
                          : 'bg-[#EDEFF3] text-[#1F2A44] rounded-bl-sm'
                      } ${msg.pending ? 'opacity-70' : ''}`}
                    >
                      {msg.text && (
                        <span className="flex items-end gap-1">
                          <p className="flex-1">{msg.text}</p>
                          {msg.is_mine && <Ticks msg={msg} />}
                        </span>
                      )}
                      {msg.image && (
                        <div className="mt-1 rounded-xl overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={msg.image} alt="фото" className="max-w-full rounded-xl" />
                        </div>
                      )}
                      {!msg.text && msg.image && msg.is_mine && (
                        <div className="flex justify-end mt-1">
                          <Ticks msg={msg} />
                        </div>
                      )}
                    </div>
                    {showTime && (
                      <span className="text-xs text-[#9AA3B8] mt-1 mx-1">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ru })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Инпут */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-transparent">
        <div className="w-full px-4 pt-2 pb-6">

          {/* Превью фото */}
          {image && (
            <div className="mb-2">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="фото" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImage('')}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center"
                >
                  <span className="text-white text-xs leading-none">×</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-end gap-2">
            <label className="w-10 h-10 rounded-full bg-[#EDEFF3] flex items-center justify-center shrink-0 cursor-pointer mb-0.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="6" width="18" height="14" rx="3" stroke="#9AA3B8" strokeWidth="1.6"/>
                <circle cx="12" cy="13" r="3.5" stroke="#9AA3B8" strokeWidth="1.6"/>
                <path d="M9 6l1.5-2h3L15 6" stroke="#9AA3B8" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>

            <div className="flex-1 bg-[#EDEFF3] rounded-2xl px-4 py-3 flex items-end gap-2">
              <textarea
                ref={textareaRef}
                className="flex-1 bg-transparent outline-none text-[15px] text-[#1F2A44] placeholder:text-[#9AA3B8] resize-none max-h-28 leading-relaxed"
                placeholder="Сообщение..."
                rows={1}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onKeyDown={handleKeyDown}
              />
              {(text.trim() || image) && (
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="w-8 h-8 rounded-full bg-[#6B7FA8] flex items-center justify-center shrink-0 mb-0.5 disabled:opacity-50"
                >
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                    <path d="M1 7L13 1L7.5 13L6 8L1 7Z" fill="white" stroke="white" strokeWidth="0.5" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
