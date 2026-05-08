'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PostCard, { Post } from '@/components/PostCard';

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

const API = process.env.NEXT_PUBLIC_API_URL;

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  return fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}`, ...options.headers },
  });
}

type ProfileData = {
  id: number;
  name: string;
  handle: string;
  bio: string;
  avatar: string;
  cover: string;
  followers_count: number;
  following_count: number;
  is_following: boolean;
};

type Comment = {
  id: number;
  text: string;
  image: string;
  created_at: string;
  likes_count: number;
  post: { id: number; text: string; author: { id: number; name: string; avatar: string } };
};

type TabType = 'posts' | 'replies' | 'likes';
const TAB_LABELS: Record<TabType, string> = { posts: 'Публикации', replies: 'Ответы', likes: 'Нравится' };

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [tab, setTab] = useState<TabType>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[] | null>(null);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [tabLoading, setTabLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, postsRes] = await Promise.all([
        apiFetch(`/api/profile/${id}/`),
        apiFetch(`/api/posts/?author_id=${id}`),
      ]);
      if (profileRes.status === 404) { setNotFound(true); return; }
      if (profileRes.ok) {
        const data: ProfileData = await profileRes.json();
        setProfile(data);
        setFollowing(data.is_following);
      }
      if (postsRes.ok) {
        const raw = await postsRes.json();
        setPosts(Array.isArray(raw) ? raw.map(mapPost) : []);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  async function handleTabChange(t: TabType) {
    setTab(t);
    if (t === 'likes' && likedPosts === null) {
      setTabLoading(true);
      const res = await apiFetch(`/api/posts/?liked_by=${id}`);
      if (res.ok) setLikedPosts((await res.json()).map(mapPost));
      setTabLoading(false);
    }
    if (t === 'replies' && comments === null) {
      setTabLoading(true);
      const res = await apiFetch(`/api/profile/${id}/comments/`);
      if (res.ok) setComments(await res.json());
      setTabLoading(false);
    }
  }

  async function toggleFollow() {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    try {
      const res = await apiFetch(`/api/profile/${id}/follow/`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
        setProfile((p) => p ? { ...p, followers_count: data.followers_count } : p);
      }
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center py-32 text-[#9AA3B8] text-sm">Загрузка...</div>;
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <span className="text-3xl">·  ·  ·</span>
        <span className="text-sm text-[#9AA3B8]">Пользователь не найден</span>
      </div>
    );
  }

  const userInitials = initials(profile.name);

  function EmptyState({ label }: { label: string }) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <span className="text-[#C5CEDC] text-3xl">·  ·  ·</span>
        <span className="text-sm text-[#9AA3B8]">{label}</span>
      </div>
    );
  }

  return (
    <>
      {/* Обложка с кнопкой назад */}
      <div className="-mx-4 relative z-0">
        <div className="w-full h-36 relative overflow-hidden">
          {profile.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.cover} alt="обложка" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#B8C4D8] to-[#8E9BB5]" />
          )}
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-white active:opacity-60"
            style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)' }}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M11 4L6 9l5 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Назад
          </button>
        </div>
      </div>

      {/* Аватар + кнопки */}
      <div className="relative z-10 flex items-end justify-between -mt-10 mb-3">
        <div className="w-20 h-20 rounded-full border-4 border-[#F3F6FC] bg-[#C5CEDC] flex items-center justify-center overflow-hidden shrink-0">
          {profile.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar} alt="аватар" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-[#4B5563]">{userInitials}</span>
          )}
        </div>

        <div className="flex items-center gap-2 pb-1 mt-12">
          <button
            onClick={() => router.push(`/activity/chat/${profile.id}`)}
            className="w-9 h-9 rounded-full border border-[#C5CEDC] bg-white flex items-center justify-center active:opacity-60"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="#6B7FA8" strokeWidth="1.8" strokeLinejoin="round"/>
            </svg>
          </button>

          <button
            onClick={toggleFollow}
            disabled={followLoading}
            className="px-4 py-1.5 rounded-full text-sm font-bold transition-all active:opacity-70 disabled:opacity-50"
            style={
              following
                ? { background: '#EDEFF3', color: '#9AA3B8', border: '1px solid #DDE3EC' }
                : { background: 'linear-gradient(135deg, #7D90B8, #5A6E96)', color: 'white' }
            }
          >
            {following ? 'Вы подписаны' : 'Подписаться'}
          </button>
        </div>
      </div>

      {/* Имя и хэндл */}
      <div className="mb-4 min-w-0">
        <h1 className="text-lg font-bold text-[#1F2A44] break-all">{profile.name}</h1>
        <p className="text-sm text-[#9AA3B8] truncate">{profile.handle}</p>
        {profile.bio && (
          <p className="text-sm text-[#3D4860] mt-1.5 leading-relaxed break-words">{profile.bio}</p>
        )}
      </div>

      {/* Статистика */}
      <div className="flex gap-6 mb-5">
        <div className="flex flex-col items-center">
          <span className="text-base font-bold text-[#1F2A44]">{posts.length}</span>
          <span className="text-xs text-[#9AA3B8]">публикаций</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-base font-bold text-[#1F2A44]">{profile.following_count}</span>
          <span className="text-xs text-[#9AA3B8]">подписок</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-base font-bold text-[#1F2A44]">{profile.followers_count}</span>
          <span className="text-xs text-[#9AA3B8]">подписчиков</span>
        </div>
      </div>

      {/* Вкладки */}
      <div className="flex border-b border-[#DDE3EC] mb-4 -mx-4">
        {(['posts', 'replies', 'likes'] as TabType[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === t ? 'text-[#1F2A44] border-b-2 border-[#6B7FA8]' : 'text-[#9AA3B8]'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tabLoading ? (
        <div className="text-sm text-[#9AA3B8] text-center py-8">Загрузка...</div>
      ) : tab === 'posts' ? (
        posts.length > 0
          ? <div className="flex flex-col gap-4 pb-4">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
          : <EmptyState label="Публикаций пока нет" />
      ) : tab === 'likes' ? (
        likedPosts === null ? null : likedPosts.length > 0
          ? <div className="flex flex-col gap-4 pb-4">{likedPosts.map((p) => <PostCard key={p.id} post={p} />)}</div>
          : <EmptyState label="Нет лайкнутых постов" />
      ) : (
        comments === null ? null : comments.length > 0 ? (
          <div className="flex flex-col gap-3 pb-4">
            {comments.map((c) => (
              <Link key={c.id} href={`/post/${c.post.id}`}>
                <div className="bg-[#EDEFF3] rounded-2xl px-4 py-3">
                  <p className="text-xs text-[#9AA3B8] mb-1 truncate">
                    В ответ на пост {c.post.author.name}: «{c.post.text}»
                  </p>
                  {c.text && <p className="text-sm text-[#1F2A44] leading-relaxed">{c.text}</p>}
                  {c.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt="фото" className="mt-2 rounded-xl max-w-full" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState label="Ответов пока нет" />
        )
      )}
    </>
  );
}
