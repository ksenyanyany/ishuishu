'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PostCard, { Post } from '@/components/PostCard';
import ImageCropModal from '@/components/ImageCropModal';

type UserComment = {
  id: number;
  text: string;
  image: string;
  created_at: string;
  post: { id: number; text: string; author: { id: number; name: string; avatar: string } };
};

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

type ProfileData = {
  id: number;
  name: string;
  handle: string;
  bio: string;
  avatar: string;
  cover: string;
  followers_count: number;
  following_count: number;
};

type UserItem = { id: number; name: string; handle: string; avatar: string };
type ModalType = 'followers' | 'following' | null;
type TabType = 'posts' | 'replies' | 'likes';

const TAB_LABELS: Record<TabType, string> = { posts: 'Публикации', replies: 'Ответы', likes: 'Нравится' };

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [cropState, setCropState] = useState<{ src: string; type: 'cover' | 'avatar' } | null>(null);

  const [listModal, setListModal] = useState<ModalType>(null);
  const [listData, setListData] = useState<UserItem[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const [tab, setTab] = useState<TabType>('posts');
  const [likedPosts, setLikedPosts] = useState<Post[] | null>(null);
  const [userComments, setUserComments] = useState<UserComment[] | null>(null);
  const [tabLoading, setTabLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editHandle, setEditHandle] = useState('');
  const [editBio, setEditBio] = useState('');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/profile/');
      if (res.ok) {
        const data: ProfileData = await res.json();
        setProfile(data);
        if (data.avatar) setAvatarUrl(data.avatar);
        if (data.cover) setCoverUrl(data.cover);

        const postsRes = await apiFetch(`/api/posts/?author_id=${data.id}`);
        if (postsRes.ok) {
          const raw = await postsRes.json();
          setPosts(Array.isArray(raw) ? raw.map(mapPost) : []);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  async function openModal(type: ModalType) {
    setListModal(type);
    setListData([]);
    setListLoading(true);
    try {
      const res = await apiFetch(type === 'followers' ? '/api/profile/followers/' : '/api/profile/following/');
      if (res.ok) setListData(await res.json());
    } finally {
      setListLoading(false);
    }
  }

  function openEdit() {
    if (!profile) return;
    setEditName(profile.name);
    setEditHandle(profile.handle.replace(/^@/, ''));
    setEditBio(profile.bio);
    setEditError('');
    setEditOpen(true);
    requestAnimationFrame(() => setSheetVisible(true));
  }

  function closeEdit() {
    setSheetVisible(false);
    setTimeout(() => setEditOpen(false), 300);
  }

  async function saveEdit() {
    setSaving(true);
    setEditError('');
    try {
      const res = await apiFetch('/api/profile/', {
        method: 'PATCH',
        body: JSON.stringify({ name: editName.trim(), handle: editHandle.trim(), bio: editBio.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setEditError(data.error ?? 'Ошибка сохранения'); return; }
      setProfile(data);
      closeEdit();
    } finally {
      setSaving(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'avatar') {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropState({ src: URL.createObjectURL(file), type });
    e.target.value = '';
  }

  async function handleCropConfirm(dataUrl: string) {
    const type = cropState!.type;
    URL.revokeObjectURL(cropState!.src);
    setCropState(null);
    if (type === 'cover') setCoverUrl(dataUrl);
    else setAvatarUrl(dataUrl);
    const res = await apiFetch('/api/profile/', { method: 'PATCH', body: JSON.stringify({ [type]: dataUrl }) });
    if (res.ok) setProfile(await res.json());
  }

  function handleCropCancel() {
    URL.revokeObjectURL(cropState!.src);
    setCropState(null);
  }

  if (loading) {
    return <div className="flex justify-center items-center py-32 text-[#9AA3B8] text-sm">Загрузка...</div>;
  }
  if (!profile) {
    return <div className="flex justify-center items-center py-32 text-[#9AA3B8] text-sm">Не удалось загрузить профиль</div>;
  }

  const userInitials = initials(profile.name);
  const listTitle = listModal === 'followers' ? 'Подписчики' : 'Подписки';

  return (
    <>
      {cropState && (
        <ImageCropModal src={cropState.src} cropType={cropState.type} onConfirm={handleCropConfirm} onCancel={handleCropCancel} />
      )}

      {/* Модалка подписчики / подписки */}
      {listModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setListModal(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[65vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#DDE3EC] shrink-0">
              <span className="text-base font-bold text-[#1F2A44]">{listTitle}</span>
              <button onClick={() => setListModal(null)} className="text-sm text-[#9AA3B8]">Закрыть</button>
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-2">
              {listLoading && (
                <div className="flex justify-center py-8 text-sm text-[#9AA3B8]">Загрузка...</div>
              )}
              {!listLoading && listData.length === 0 && (
                <div className="flex justify-center py-8 text-sm text-[#9AA3B8]">Пока никого нет</div>
              )}
              {listData.map((user) => (
                <Link
                  key={user.id}
                  href={`/profile/${user.id}`}
                  onClick={() => setListModal(null)}
                  className="flex items-center gap-3 py-3 border-b border-[#F3F6FC] last:border-0"
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
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Обложка */}
      <div className="-mx-4 relative z-0">
        <div className="w-full h-36 relative overflow-hidden">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="обложка" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#B8C4D8] to-[#8E9BB5]" />
          )}
          <button
            onClick={() => coverInputRef.current?.click()}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
          >
            <Image src="/icons/image.svg" alt="изменить обложку" width={16} height={16} style={{ width: 'auto' }} />
          </button>
        </div>
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'cover')} />
      </div>

      {/* Аватар + редактировать */}
      <div className="relative z-10 flex items-end justify-between -mt-10 mb-3">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-[#F3F6FC] bg-[#C5CEDC] flex items-center justify-center overflow-hidden shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="аватар" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-[#4B5563]">{userInitials}</span>
            )}
          </div>
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-full bg-[#6B7FA8] flex items-center justify-center border-2 border-[#F3F6FC]"
          >
            <Image src="/icons/plus.svg" alt="изменить фото" width={10} height={10} style={{ width: 'auto' }} />
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'avatar')} />
        </div>
        <button
          onClick={openEdit}
          className="px-4 py-1.5 rounded-full border border-[#C5CEDC] text-sm font-semibold text-[#1F2A44] active:opacity-60"
        >
          Редактировать
        </button>
      </div>

      {/* Имя */}
      <div className="mb-4 min-w-0">
        <h1 className="text-lg font-bold text-[#1F2A44] break-all">{profile.name}</h1>
        <p className="text-sm text-[#9AA3B8] truncate">{profile.handle}</p>
        {profile.bio && <p className="text-sm text-[#3D4860] mt-1.5 leading-relaxed break-words">{profile.bio}</p>}
      </div>

      {/* Статистика */}
      <div className="flex gap-6 mb-5">
        <div className="flex flex-col items-center">
          <span className="text-base font-bold text-[#1F2A44]">{posts.length}</span>
          <span className="text-xs text-[#9AA3B8]">публикаций</span>
        </div>
        <button onClick={() => openModal('following')} className="flex flex-col items-center active:opacity-60">
          <span className="text-base font-bold text-[#1F2A44]">{profile.following_count}</span>
          <span className="text-xs text-[#9AA3B8]">подписок</span>
        </button>
        <button onClick={() => openModal('followers')} className="flex flex-col items-center active:opacity-60">
          <span className="text-base font-bold text-[#1F2A44]">{profile.followers_count}</span>
          <span className="text-xs text-[#9AA3B8]">подписчиков</span>
        </button>
      </div>

      {/* Вкладки */}
      <div className="flex border-b border-[#DDE3EC] mb-4 -mx-4">
        {(['posts', 'replies', 'likes'] as TabType[]).map((t) => (
          <button
            key={t}
            onClick={async () => {
              setTab(t);
              if (t === 'likes' && likedPosts === null) {
                setTabLoading(true);
                const res = await apiFetch(`/api/posts/?liked_by=${profile.id}`);
                if (res.ok) setLikedPosts((await res.json()).map(mapPost));
                setTabLoading(false);
              }
              if (t === 'replies' && userComments === null) {
                setTabLoading(true);
                const res = await apiFetch(`/api/profile/${profile.id}/comments/`);
                if (res.ok) setUserComments(await res.json());
                setTabLoading(false);
              }
            }}
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
        posts.length > 0 ? (
          <div className="flex flex-col gap-4 pb-4">
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="text-[#C5CEDC] text-3xl">·  ·  ·</span>
            <span className="text-sm text-[#9AA3B8]">Публикаций пока нет</span>
          </div>
        )
      ) : tab === 'likes' ? (
        likedPosts === null ? null : likedPosts.length > 0 ? (
          <div className="flex flex-col gap-4 pb-4">
            {likedPosts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="text-[#C5CEDC] text-3xl">·  ·  ·</span>
            <span className="text-sm text-[#9AA3B8]">Нет лайкнутых постов</span>
          </div>
        )
      ) : (
        userComments === null ? null : userComments.length > 0 ? (
          <div className="flex flex-col gap-3 pb-4">
            {userComments.map((c) => (
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
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="text-[#C5CEDC] text-3xl">·  ·  ·</span>
            <span className="text-sm text-[#9AA3B8]">Ответов пока нет</span>
          </div>
        )
      )}

      {/* Шторка редактирования */}
      {editOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-300"
            style={{ opacity: sheetVisible ? 1 : 0 }}
            onClick={closeEdit}
          />
          <div
            className="fixed bottom-0 inset-x-0 max-w-sm mx-auto z-50 bg-white rounded-t-2xl flex flex-col transition-transform duration-300 ease-out"
            style={{ transform: sheetVisible ? 'translateY(0)' : 'translateY(100%)' }}
          >
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#DDE3EC]" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#DDE3EC] shrink-0">
              <button onClick={closeEdit} className="text-sm text-[#9AA3B8] active:opacity-60">Отмена</button>
              <span className="text-base font-bold text-[#1F2A44]">Редактировать профиль</span>
              <button onClick={saveEdit} disabled={saving} className="text-sm font-bold text-[#6B7FA8] active:opacity-60 disabled:opacity-40">
                {saving ? '...' : 'Готово'}
              </button>
            </div>
            <div className="px-4 py-5 flex flex-col gap-5 overflow-y-auto pb-10">
              {editError && <p className="text-sm text-red-400">{editError}</p>}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#9AA3B8] uppercase tracking-wide">Имя</label>
                <input
                  type="text" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={50}
                  className="w-full bg-[#F3F6FC] rounded-xl px-4 py-3 text-sm text-[#1F2A44] placeholder:text-[#C5CEDC] outline-none focus:ring-2 focus:ring-[#6B7FA8]/30"
                  placeholder="Твоё имя"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#9AA3B8] uppercase tracking-wide">Никнейм</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#9AA3B8]">@</span>
                  <input
                    type="text" inputMode="url" value={editHandle} maxLength={29}
                    onChange={(e) => setEditHandle(e.target.value.replace(/^@/, '').replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase())}
                    className="w-full bg-[#F3F6FC] rounded-xl pl-8 pr-4 py-3 text-sm text-[#1F2A44] placeholder:text-[#C5CEDC] outline-none focus:ring-2 focus:ring-[#6B7FA8]/30"
                    placeholder="nickname"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#9AA3B8] uppercase tracking-wide">О себе</label>
                  <span className="text-xs text-[#C5CEDC]">{editBio.length}/150</span>
                </div>
                <textarea
                  value={editBio} onChange={(e) => setEditBio(e.target.value)} maxLength={150} rows={3}
                  className="w-full bg-[#F3F6FC] rounded-xl px-4 py-3 text-sm text-[#1F2A44] placeholder:text-[#C5CEDC] outline-none focus:ring-2 focus:ring-[#6B7FA8]/30 resize-none leading-relaxed"
                  placeholder="Расскажи о себе..."
                />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
