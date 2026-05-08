'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export type Post = {
  id: string;
  authorId: string;
  author: {
    id: string;
    name: string;
    initials: string;
    avatarUrl?: string;
  };
  createdAt: Date;
  image?: string;
  moods: string[];
  text: string;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
};

export default function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [menuOpen, setMenuOpen] = useState(false);

  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('user_id') ?? '' : '';
  const isMyPost = post.authorId === currentUserId;

  async function handleLike() {
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
    const token = localStorage.getItem('token');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/posts/${post.id}/like/`, {
      method: 'POST',
      headers: { Authorization: `Token ${token}` },
    });
  }

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
    locale: ru,
  });

  return (
    <div className="w-full bg-[#EDEFF3] rounded-2xl shadow-sm overflow-hidden relative">

      {/* Шапка */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="w-10 h-10 rounded-full bg-[#C5CEDC] flex items-center justify-center shrink-0 overflow-hidden">
          {post.author.avatarUrl ? (
            <Image
              src={post.author.avatarUrl}
              alt={post.author.name}
              width={40}
              height={40}
              className="object-cover"
            />
          ) : (
            <span className="text-sm font-semibold text-[#4B5563]">
              {post.author.initials}
            </span>
          )}
        </div>

        <Link
          href={isMyPost ? '/profile' : `/profile/${post.author.id}`}
          className="flex flex-col flex-1 min-w-0"
        >
          <span className="text-sm font-semibold text-[#1F2A44] leading-tight">
            {post.author.name}
          </span>
          <span className="text-xs text-[#9AA3B8]">{timeAgo}</span>
        </Link>

        {/* Три точки */}
        <button className="p-1 relative" onClick={() => setMenuOpen(!menuOpen)}>
          <Image src="/icons/more.svg" alt="ещё" width={18} height={18} style={{ width: 'auto' }} />
        </button>
      </div>

      {/* Меню три точки */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-12 right-4 z-20 bg-white rounded-2xl shadow-lg overflow-hidden min-w-[180px]">
            {isMyPost ? (
              <>
                <button
                  className="w-full text-left px-4 py-3 text-sm text-[#1F2A44] hover:bg-[#F3F6FC]"
                  onClick={() => setMenuOpen(false)}
                >
                  Редактировать
                </button>
                <div className="h-px bg-[#EDEFF3]" />
                <button
                  className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-[#F3F6FC]"
                  onClick={() => setMenuOpen(false)}
                >
                  Удалить пост
                </button>
              </>
            ) : (
              <>
                <button
                  className="w-full text-left px-4 py-3 text-sm text-[#1F2A44] hover:bg-[#F3F6FC]"
                  onClick={() => setMenuOpen(false)}
                >
                  Скрыть пост
                </button>
                <div className="h-px bg-[#EDEFF3]" />
                <button
                  className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-[#F3F6FC]"
                  onClick={() => setMenuOpen(false)}
                >
                  Пожаловаться
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Фото */}
      {post.image && (
        <div className="w-full aspect-[4/3] relative">
          <Image src={post.image} alt="пост" fill className="object-cover" />
        </div>
      )}

      {/* Теги настроения */}
      {post.moods.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-3">
          {post.moods.map((mood) => {
            const moodColor: Record<string, string> = {
              спокойствие: '#7A9AB8',
              радость: '#8AAA5A',
              грусть: '#7A85B0',
              тревога: '#C09060',
              злость: '#C07070',
              любовь: '#C07090',
            };
            return (
              <span
                key={mood}
                className="text-xs font-semibold px-2.5 pt-0.5 pb-1 rounded-full text-white"
                style={{ background: moodColor[mood] ?? '#9AA3B8' }}
              >
                {mood}
              </span>
            );
          })}
        </div>
      )}

      {/* Текст */}
      <div className="px-4 pt-2 pb-2">
        <p className="text-sm text-[#3D4860] leading-relaxed">
          {post.text}
        </p>
      </div>

      {/* Действия */}
      <div className="flex items-center gap-4 px-4 pb-4 pt-1">
        <button onClick={handleLike} className="flex items-center gap-1.5">
          <Image
            src={liked ? '/icons/like.svg' : '/icons/notlike.svg'}
            alt="лайк"
            width={22}
            height={22}
            style={{ width: 'auto' }}
          />
          <span className={`text-sm ${liked ? 'text-[#B06B8A]' : 'text-[#9AA3B8]'}`}>
            {likesCount}
          </span>
        </button>

        <Link href={`/post/${post.id}`} className="flex items-center gap-1.5">
          <Image src="/icons/comment.svg" alt="комментарии" width={22} height={22} style={{ width: 'auto' }} />
          <span className="text-sm text-[#9AA3B8]">{post.commentsCount}</span>
        </Link>

        <button className="ml-auto">
          <Image src="/icons/share.svg" alt="поделиться" width={22} height={22} style={{ width: 'auto' }} />
        </button>
      </div>

    </div>
  );
}