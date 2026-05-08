'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import PostCard, { Post } from '@/components/PostCard';

const API = process.env.NEXT_PUBLIC_API_URL;

function authHeaders() {
  const token = localStorage.getItem('token');
  return { Authorization: `Token ${token}` };
}

function mapPost(raw: any): Post {
  const name: string = raw.author.name || '';
  const ini = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  return {
    id: String(raw.id),
    authorId: String(raw.author.id),
    author: { id: String(raw.author.id), name, initials: ini, avatarUrl: raw.author.avatar || undefined },
    createdAt: new Date(raw.created_at),
    image: raw.image || undefined,
    moods: raw.moods,
    text: raw.text,
    likesCount: raw.likes_count,
    commentsCount: raw.comments_count,
    isLiked: raw.is_liked,
  };
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

type UserResult = { id: number; name: string; handle: string; avatar: string; is_following: boolean };

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ users: UserResult[]; posts: Post[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // загрузка ленты
  useEffect(() => {
    fetch(`${API}/api/posts/`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => setPosts(Array.isArray(data) ? data.map(mapPost) : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // поиск с дебаунсом
  useEffect(() => {
    if (!searchOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API}/api/search/?q=${encodeURIComponent(query)}`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setSearchResults({ users: data.users, posts: data.posts.map(mapPost) });
        }
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [query, searchOpen]);

  function closeSearch() {
    setSearchOpen(false);
    setQuery('');
    setSearchResults(null);
  }

  return (
    <main className="w-full max-w-sm flex flex-col gap-4 py-6">

      {/* шапка */}
      <div className="flex items-center gap-2 overflow-hidden">
        <h1
          className="text-3xl text-[#2D3452] whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            fontFamily: 'var(--font-inter), sans-serif',
            maxWidth: searchOpen ? '0px' : '160px',
            opacity: searchOpen ? 0 : 1,
          }}
        >
          ishu.
        </h1>

        <div
          className="flex items-center gap-2 bg-[#E8ECF2] rounded-2xl overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            flex: searchOpen ? 1 : 0,
            maxWidth: searchOpen ? '100%' : '0px',
            opacity: searchOpen ? 1 : 0,
            paddingLeft: searchOpen ? '14px' : 0,
            paddingRight: searchOpen ? '14px' : 0,
            paddingTop: '10px',
            paddingBottom: '10px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none" className="shrink-0 opacity-40">
            <circle cx="8" cy="8" r="5.5" stroke="#1F2A44" strokeWidth="1.8"/>
            <path d="M12.5 12.5L16 16" stroke="#1F2A44" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <input
            tabIndex={searchOpen ? 0 : -1}
            ref={(el) => { if (searchOpen && el) el.focus(); }}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск людей и постов..."
            className="flex-1 bg-transparent text-sm text-[#1F2A44] placeholder:text-[#9AA3B8] outline-none min-w-0"
          />
        </div>

        <button
          onClick={() => { if (searchOpen) closeSearch(); else setSearchOpen(true); }}
          className="ml-auto shrink-0 w-9 h-9 rounded-xl flex items-center justify-center active:opacity-60 transition-colors"
          style={{ background: searchOpen ? '#6B7FA815' : 'transparent' }}
        >
          <div className="transition-all duration-200" style={{ transform: searchOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            {searchOpen ? (
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M2 2l11 11M13 2L2 13" stroke="#6B7FA8" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="8" cy="8" r="5.5" stroke="#9AA3B8" strokeWidth="1.8"/>
                <path d="M12.5 12.5L16 16" stroke="#9AA3B8" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            )}
          </div>
        </button>
      </div>

      {/* режим поиска */}
      {searchOpen ? (
        <>
          {!query.trim() && (
            <p className="text-sm text-[#9AA3B8] text-center py-8">Начни вводить имя или текст поста</p>
          )}

          {searching && (
            <p className="text-sm text-[#9AA3B8] text-center py-8">Поиск...</p>
          )}

          {!searching && searchResults && (
            <>
              {/* Люди */}
              {searchResults.users.length > 0 && (
                <section>
                  <p className="text-xs font-bold text-[#9AA3B8] uppercase tracking-wide mb-2">Люди</p>
                  <div className="flex flex-col gap-2">
                    {searchResults.users.map((user) => (
                      <Link
                        key={user.id}
                        href={`/profile/${user.id}`}
                        onClick={closeSearch}
                        className="flex items-center gap-3 bg-[#EDEFF3] rounded-2xl px-4 py-3"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#C5CEDC] flex items-center justify-center shrink-0 overflow-hidden">
                          {user.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-semibold text-[#4B5563]">{initials(user.name)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1F2A44]">{user.name}</p>
                          <p className="text-xs text-[#9AA3B8]">{user.handle}</p>
                        </div>
                        {user.is_following && (
                          <span className="text-xs text-[#9AA3B8] shrink-0">подписана</span>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Посты */}
              {searchResults.posts.length > 0 && (
                <section>
                  <p className="text-xs font-bold text-[#9AA3B8] uppercase tracking-wide mb-2">Посты</p>
                  <div className="flex flex-col gap-3">
                    {searchResults.posts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                </section>
              )}

              {searchResults.users.length === 0 && searchResults.posts.length === 0 && (
                <div className="flex flex-col items-center py-16 gap-2">
                  <span className="text-2xl">·  ·  ·</span>
                  <span className="text-sm text-[#9AA3B8]">Ничего не нашлось</span>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        /* обычная лента */
        loading ? (
          <div className="flex justify-center py-16 text-sm text-[#9AA3B8]">Загрузка...</div>
        ) : posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="flex flex-col items-center py-16 gap-2">
            <span className="text-2xl">·  ·  ·</span>
            <span className="text-sm text-[#9AA3B8]">Пока нет постов</span>
          </div>
        )
      )}

    </main>
  );
}
