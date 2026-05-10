'use client';

import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState } from 'react';
import RichText from './RichText';

export type Comment = {
  id: string;
  authorId: string;
  author: {
    name: string;
    initials: string;
    avatarUrl?: string;
    handle?: string;
  };
  createdAt: Date;
  text: string;
  images?: string[];
  likesCount: number;
  isLiked?: boolean;
  replies?: Comment[];
};

const API = process.env.NEXT_PUBLIC_API_URL;

function Avatar({ comment }: { comment: Comment }) {
  return (
    <div className="w-8 h-8 rounded-full bg-[#C5CEDC] dark:bg-[#252F45] flex items-center justify-center shrink-0 overflow-hidden">
      {comment.author.avatarUrl ? (
        <Image src={comment.author.avatarUrl} alt={comment.author.name} width={32} height={32} className="object-cover" />
      ) : (
        <span className="text-xs font-semibold text-[#4B5563]">{comment.author.initials}</span>
      )}
    </div>
  );
}

function CommentBody({
  comment,
  onReply,
  isReply = false,
}: {
  comment: Comment;
  onReply?: (comment: Comment) => void;
  isReply?: boolean;
}) {
  const [liked, setLiked] = useState(comment.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(comment.likesCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('user_id') ?? '' : '';
  const isMyComment = comment.authorId === currentUserId;
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ru });

  async function handleLike() {
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    await fetch(`${API}/api/comments/${comment.id}/like/`, {
      method: 'POST',
      headers: { Authorization: `Token ${token}` },
    });
  }

  return (
    <>
      <div className="flex gap-2.5">
        <Avatar comment={comment} />
        <div className="flex-1 min-w-0">
          <div className={`bg-[#EDEFF3] dark:bg-[#161C2A] rounded-2xl ${isReply ? 'rounded-tl-sm' : 'rounded-tl-sm'} px-3 py-2.5`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-bold text-[#1F2A44] dark:text-[#E4EAF5]">{comment.author.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#9AA3B8]">{timeAgo}</span>
                <button className="relative" onClick={() => setMenuOpen(!menuOpen)}>
                  <Image src="/icons/more.svg" alt="ещё" width={14} height={14} style={{ width: 'auto' }} />
                </button>
              </div>
            </div>

            {comment.text && (
              <RichText text={comment.text} className="text-sm text-[#3D4860] dark:text-[#B8C4D4] leading-relaxed" />
            )}

            {comment.images && comment.images.length > 0 && (
              <div className={`mt-2 grid gap-1.5 ${comment.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {comment.images.map((src, i) => {
                  const isLastOdd = comment.images!.length % 2 !== 0 && i === comment.images!.length - 1;
                  return (
                    <div
                      key={i}
                      className={`relative rounded-xl overflow-hidden cursor-pointer ${isLastOdd ? 'col-span-2' : ''}`}
                      style={{ aspectRatio: isLastOdd ? '16/7' : '1/1' }}
                      onClick={() => setLightboxImg(src)}
                    >
                      <Image src={src} alt={`фото ${i + 1}`} fill className="object-cover" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5 ml-1">
            <button onClick={handleLike} className="flex items-center gap-1">
              <Image
                src={liked ? '/icons/like.svg' : '/icons/notlike.svg'}
                alt="лайк" width={14} height={14} style={{ width: 'auto' }}
              />
              <span className={`text-xs ${liked ? 'text-[#B06B8A]' : 'text-[#9AA3B8]'}`}>
                {likesCount > 0 ? likesCount : ''}
              </span>
            </button>
            {onReply && (
              <button onClick={() => onReply(comment)} className="text-xs text-[#9AA3B8] font-medium">
                Ответить
              </button>
            )}
          </div>
        </div>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute top-8 right-0 z-20 bg-white dark:bg-[#1C2438] rounded-2xl shadow-lg overflow-hidden min-w-[160px]">
              {isMyComment ? (
                <>
                  <button className="w-full text-left px-4 py-3 text-sm text-[#1F2A44] dark:text-[#E4EAF5] hover:bg-[#F3F6FC] dark:hover:bg-[#252F45]" onClick={() => setMenuOpen(false)}>
                    Редактировать
                  </button>
                  <div className="h-px bg-[#EDEFF3] dark:bg-[#252F45]" />
                  <button className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-[#F3F6FC] dark:hover:bg-[#252F45]" onClick={() => setMenuOpen(false)}>
                    Удалить
                  </button>
                </>
              ) : (
                <>
                  <button className="w-full text-left px-4 py-3 text-sm text-[#1F2A44] dark:text-[#E4EAF5] hover:bg-[#F3F6FC] dark:hover:bg-[#252F45]" onClick={() => setMenuOpen(false)}>
                    Скрыть
                  </button>
                  <div className="h-px bg-[#EDEFF3] dark:bg-[#252F45]" />
                  <button className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-[#F3F6FC] dark:hover:bg-[#252F45]" onClick={() => setMenuOpen(false)}>
                    Пожаловаться
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {lightboxImg && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
          <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden">
            <Image src={lightboxImg} alt="просмотр" fill className="object-contain" />
          </div>
        </div>
      )}
    </>
  );
}

export default function CommentCard({
  comment,
  onReply,
}: {
  comment: Comment;
  onReply?: (comment: Comment) => void;
}) {
  const replies = comment.replies ?? [];
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="py-3 relative">
      <CommentBody comment={comment} onReply={onReply} />

      {replies.length > 0 && (
        <div className="mt-2 ml-5 flex gap-0">
          {/* Вертикальная линия — кликабельна для сворачивания */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-5 shrink-0 flex justify-center group"
            title={collapsed ? 'Развернуть' : 'Свернуть'}
          >
            <div className="w-0.5 rounded-full bg-[#DDE3EC] dark:bg-[#252F45] group-hover:bg-[#6B7FA8] dark:group-hover:bg-[#6B7FA8] transition-colors h-full min-h-full" />
          </button>

          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              className="ml-2 mt-1 text-xs text-[#6B7FA8] font-medium"
            >
              {replies.length} {replies.length === 1 ? 'ответ' : replies.length < 5 ? 'ответа' : 'ответов'} ▼
            </button>
          ) : (
            <div className="flex-1 min-w-0 flex flex-col gap-3 pl-1">
              {replies.map((reply) => (
                <div key={reply.id} className="relative">
                  <CommentBody comment={reply} onReply={onReply} isReply />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
