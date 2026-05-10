'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import RichText from './RichText';

const MOODS = ['спокойствие', 'радость', 'грусть', 'тревога', 'злость', 'любовь'];
const MOOD_COLORS: Record<string, string> = {
  спокойствие: '#7A9AB8', радость: '#8AAA5A', грусть: '#7A85B0',
  тревога: '#C09060', злость: '#C07070', любовь: '#C07090',
};

export type Post = {
  id: string;
  authorId: string;
  author: { id: string; name: string; initials: string; avatarUrl?: string };
  createdAt: Date;
  images?: string[];
  moods: string[];
  text: string;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
};

type ShareChat = { partner: { id: number; name: string; avatar: string } };

function ImageGrid({ images, onOpen }: { images: string[]; onOpen: (src: string) => void }) {
  const count = images.length;
  if (count === 1) {
    return (
      <div className="w-full aspect-[4/3] relative cursor-pointer" onClick={() => onOpen(images[0])}>
        <Image src={images[0]} alt="фото" fill className="object-cover" />
      </div>
    );
  }
  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5">
        {images.map((src, i) => (
          <div key={i} className="aspect-square relative cursor-pointer" onClick={() => onOpen(src)}>
            <Image src={src} alt="фото" fill className="object-cover" />
          </div>
        ))}
      </div>
    );
  }
  if (count === 3) {
    return (
      <div className="grid grid-cols-2 gap-0.5">
        <div className="row-span-2 aspect-[3/4] relative cursor-pointer" onClick={() => onOpen(images[0])}>
          <Image src={images[0]} alt="фото" fill className="object-cover" />
        </div>
        {images.slice(1).map((src, i) => (
          <div key={i} className="aspect-[3/2] relative cursor-pointer" onClick={() => onOpen(src)}>
            <Image src={src} alt="фото" fill className="object-cover" />
          </div>
        ))}
      </div>
    );
  }
  // 4 photos
  return (
    <div className="grid grid-cols-2 gap-0.5">
      {images.map((src, i) => (
        <div key={i} className="aspect-square relative cursor-pointer" onClick={() => onOpen(src)}>
          <Image src={src} alt="фото" fill className="object-cover" />
        </div>
      ))}
    </div>
  );
}

export default function PostCard({ post, onDelete }: { post: Post; onDelete?: (id: string) => void }) {
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [editMoods, setEditMoods] = useState<string[]>(post.moods);
  const [currentText, setCurrentText] = useState(post.text);
  const [currentMoods, setCurrentMoods] = useState<string[]>(post.moods);
  const [saving, setSaving] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareStep, setShareStep] = useState<'main' | 'dm'>('main');
  const [shareChats, setShareChats] = useState<ShareChat[]>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareSent, setShareSent] = useState<number | null>(null);

  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('user_id') ?? '' : '';
  const isMyPost = post.authorId === currentUserId;

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setMenuOpen(false);
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/posts/${post.id}/`, {
      method: 'DELETE',
      headers: { Authorization: `Token ${token}` },
    });
    if (res.ok) onDelete?.(post.id);
    else setDeleting(false);
  }

  function openEdit() {
    setEditText(currentText);
    setEditMoods([...currentMoods]);
    setMenuOpen(false);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editText.trim() || saving) return;
    setSaving(true);
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/posts/${post.id}/`, {
      method: 'POST',
      headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: editText.trim(), moods: editMoods }),
    });
    if (res.ok) {
      setCurrentText(editText.trim());
      setCurrentMoods(editMoods);
      setEditOpen(false);
    }
    setSaving(false);
  }

  async function handleLike() {
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
    const token = localStorage.getItem('token');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/posts/${post.id}/like/`, {
      method: 'POST',
      headers: { Authorization: `Token ${token}` },
    });
  }

  function openShare() { setShareStep('main'); setShareOpen(true); }

  async function handleShareCopy() {
    await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    setShareCopied(true);
    setTimeout(() => { setShareCopied(false); setShareOpen(false); }, 1500);
  }

  async function openShareDM() {
    setShareStep('dm');
    setShareLoading(true);
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chats/`, {
      headers: { Authorization: `Token ${token}` },
    });
    if (res.ok) setShareChats(await res.json());
    setShareLoading(false);
  }

  async function sendToDM(partnerId: number) {
    const token = localStorage.getItem('token');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chats/${partnerId}/`, {
      method: 'POST',
      headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `${window.location.origin}/post/${post.id}`, image: '' }),
    });
    setShareSent(partnerId);
    setTimeout(() => { setShareSent(null); setShareOpen(false); setShareStep('main'); setShareChats([]); }, 1200);
  }

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ru });

  return (
    <>
      <div className="w-full bg-[#EDEFF3] dark:bg-[#161C2A] rounded-2xl shadow-sm overflow-hidden relative">

        {/* Шапка */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <div className="w-10 h-10 rounded-full bg-[#C5CEDC] dark:bg-[#252F45] flex items-center justify-center shrink-0 overflow-hidden">
            {post.author.avatarUrl ? (
              <Image src={post.author.avatarUrl} alt={post.author.name} width={40} height={40} className="object-cover" />
            ) : (
              <span className="text-sm font-semibold text-[#4B5563]">{post.author.initials}</span>
            )}
          </div>
          <Link href={isMyPost ? '/profile' : `/profile/${post.author.id}`} className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-semibold text-[#1F2A44] dark:text-[#E4EAF5] leading-tight">{post.author.name}</span>
            <span className="text-xs text-[#9AA3B8]">{timeAgo}</span>
          </Link>
          <button className="p-1 relative" onClick={() => setMenuOpen(!menuOpen)}>
            <Image src="/icons/more.svg" alt="ещё" width={18} height={18} style={{ width: 'auto' }} />
          </button>
        </div>

        {/* Меню */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute top-12 right-4 z-20 bg-white dark:bg-[#1C2438] rounded-2xl shadow-lg overflow-hidden min-w-[180px]">
              {isMyPost ? (
                <>
                  <button className="w-full text-left px-4 py-3 text-sm text-[#1F2A44] dark:text-[#E4EAF5] hover:bg-[#F3F6FC] dark:hover:bg-[#252F45]" onClick={openEdit}>
                    Редактировать
                  </button>
                  <div className="h-px bg-[#EDEFF3] dark:bg-[#252F45]" />
                  <button className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-[#F3F6FC] dark:hover:bg-[#252F45] disabled:opacity-40" onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Удаление...' : 'Удалить пост'}
                  </button>
                </>
              ) : (
                <>
                  <button className="w-full text-left px-4 py-3 text-sm text-[#1F2A44] dark:text-[#E4EAF5] hover:bg-[#F3F6FC] dark:hover:bg-[#252F45]" onClick={() => setMenuOpen(false)}>Скрыть пост</button>
                  <div className="h-px bg-[#EDEFF3] dark:bg-[#252F45]" />
                  <button className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-[#F3F6FC] dark:hover:bg-[#252F45]" onClick={() => setMenuOpen(false)}>Пожаловаться</button>
                </>
              )}
            </div>
          </>
        )}

        {/* Фото */}
        {post.images && post.images.length > 0 && (
          <ImageGrid images={post.images} onOpen={setLightboxImg} />
        )}

        {/* Теги */}
        {currentMoods.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-3">
            {currentMoods.map((mood) => (
              <span key={mood} className="text-xs font-semibold px-2.5 pt-0.5 pb-1 rounded-full text-white" style={{ background: MOOD_COLORS[mood] ?? '#9AA3B8' }}>
                {mood}
              </span>
            ))}
          </div>
        )}

        {/* Текст */}
        <div className="px-4 pt-2 pb-2">
          <RichText text={currentText} className="text-sm text-[#3D4860] dark:text-[#B8C4D4] leading-relaxed" />
        </div>

        {/* Действия */}
        <div className="flex items-center gap-4 px-4 pb-4 pt-1">
          <button onClick={handleLike} className="flex items-center gap-1.5">
            <Image src={liked ? '/icons/like.svg' : '/icons/notlike.svg'} alt="лайк" width={22} height={22} style={{ width: 'auto' }} />
            <span className={`text-sm ${liked ? 'text-[#B06B8A]' : 'text-[#9AA3B8]'}`}>{likesCount}</span>
          </button>
          <Link href={`/post/${post.id}`} className="flex items-center gap-1.5">
            <Image src="/icons/comment.svg" alt="комментарии" width={22} height={22} style={{ width: 'auto' }} />
            <span className="text-sm text-[#9AA3B8]">{post.commentsCount}</span>
          </Link>
          <button className="ml-auto" onClick={openShare}>
            <Image src="/icons/share.svg" alt="поделиться" width={22} height={22} style={{ width: 'auto' }} />
          </button>
        </div>
      </div>

      {/* Шторка редактирования */}
      {editOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setEditOpen(false)} />
          <div className="fixed bottom-0 inset-x-0 max-w-sm mx-auto z-50 bg-white dark:bg-[#161C2A] rounded-t-2xl flex flex-col">
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#DDE3EC]" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#DDE3EC] dark:border-[#252F45]">
              <button onClick={() => setEditOpen(false)} className="text-sm text-[#9AA3B8]">Отмена</button>
              <span className="text-base font-bold text-[#1F2A44] dark:text-[#E4EAF5]">Редактировать пост</span>
              <button onClick={saveEdit} disabled={saving || !editText.trim()} className="text-sm font-bold text-[#6B7FA8] disabled:opacity-40">
                {saving ? '...' : 'Готово'}
              </button>
            </div>
            <div className="px-4 py-4 flex flex-col gap-4 pb-10">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                maxLength={500}
                rows={4}
                className="w-full bg-[#F3F6FC] dark:bg-[#1C2438] rounded-xl px-4 py-3 text-sm text-[#1F2A44] dark:text-[#E4EAF5] outline-none resize-none leading-relaxed"
              />
              <div className="flex flex-wrap gap-2">
                {MOODS.map((mood) => {
                  const active = editMoods.includes(mood);
                  return (
                    <button
                      key={mood}
                      onClick={() => setEditMoods(active ? editMoods.filter((m) => m !== mood) : [...editMoods, mood])}
                      className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all${active ? '' : ' dark:border-[#252F45]'}`}
                      style={active ? { background: MOOD_COLORS[mood], color: 'white', borderColor: 'transparent' } : { background: 'transparent', color: '#9AA3B8', borderColor: '#DDE3EC' }}
                    >
                      {mood}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Share sheet */}
      {shareOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => { setShareOpen(false); setShareStep('main'); }} />
          <div className="fixed bottom-0 inset-x-0 max-w-sm mx-auto z-50 bg-white dark:bg-[#161C2A] rounded-t-2xl flex flex-col">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#DDE3EC] dark:bg-[#252F45]" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#DDE3EC] dark:border-[#252F45]">
              {shareStep === 'dm' ? (
                <button onClick={() => setShareStep('main')} className="text-sm text-[#9AA3B8]">Назад</button>
              ) : <div className="w-10" />}
              <span className="text-base font-bold text-[#1F2A44] dark:text-[#E4EAF5]">
                {shareStep === 'dm' ? 'Отправить' : 'Поделиться'}
              </span>
              <button onClick={() => { setShareOpen(false); setShareStep('main'); }} className="text-sm text-[#9AA3B8]">Закрыть</button>
            </div>

            {shareStep === 'main' ? (
              <div className="px-4 py-3 flex flex-col gap-2 pb-10">
                <button
                  onClick={handleShareCopy}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#F3F6FC] dark:bg-[#1C2438] active:opacity-70"
                >
                  <div className="w-9 h-9 rounded-full bg-[#E4EAF5] dark:bg-[#252F45] flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="#6B7FA8" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="#6B7FA8" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-[#1F2A44] dark:text-[#E4EAF5]">
                    {shareCopied ? 'Скопировано!' : 'Скопировать ссылку'}
                  </span>
                </button>
                <button
                  onClick={openShareDM}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#F3F6FC] dark:bg-[#1C2438] active:opacity-70"
                >
                  <div className="w-9 h-9 rounded-full bg-[#E4EAF5] dark:bg-[#252F45] flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="#6B7FA8" strokeWidth="2" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-[#1F2A44] dark:text-[#E4EAF5]">Отправить в сообщение</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col pb-10 max-h-72 overflow-y-auto">
                {shareLoading && <div className="text-sm text-[#9AA3B8] text-center py-8">Загрузка...</div>}
                {!shareLoading && shareChats.length === 0 && (
                  <div className="text-sm text-[#9AA3B8] text-center py-8">Нет диалогов</div>
                )}
                {shareChats.map((chat) => (
                  <button
                    key={chat.partner.id}
                    onClick={() => sendToDM(chat.partner.id)}
                    className="flex items-center gap-3 px-4 py-3 active:bg-[#F3F6FC] dark:active:bg-[#252F45]"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#C5CEDC] dark:bg-[#252F45] flex items-center justify-center shrink-0 overflow-hidden">
                      {chat.partner.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={chat.partner.avatar} alt={chat.partner.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-semibold text-[#4B5563]">
                          {chat.partner.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
                        </span>
                      )}
                    </div>
                    <span className="flex-1 text-left text-sm font-semibold text-[#1F2A44] dark:text-[#E4EAF5]">{chat.partner.name}</span>
                    {shareSent === chat.partner.id && (
                      <span className="text-xs text-[#6B7FA8] font-semibold">Отправлено ✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <img
            src={lightboxImg}
            alt="просмотр"
            className="max-w-full max-h-full rounded-xl object-contain"
            style={{ maxWidth: '100vw', maxHeight: '100vh' }}
          />
        </div>
      )}
    </>
  );
}
