'use client';

import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState } from 'react';

export type Comment = {
  id: string;
  authorId: string;
  author: {
    name: string;
    initials: string;
    avatarUrl?: string;
  };
  createdAt: Date;
  text: string;
  images?: string[];
  likesCount: number;
  isLiked?: boolean;
};

const currentUserId = 'user_1';

export default function CommentCard({ comment }: { comment: Comment }) {
  const [liked, setLiked] = useState(comment.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(comment.likesCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const isMyComment = comment.authorId === currentUserId;

  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
    locale: ru,
  });

  function handleLike() {
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
  }

  return (
    <>
      <div className="flex gap-3 py-3 relative">

        {/* Аватар */}
        <div className="w-8 h-8 rounded-full bg-[#C5CEDC] flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
          {comment.author.avatarUrl ? (
            <Image
              src={comment.author.avatarUrl}
              alt={comment.author.name}
              width={32}
              height={32}
              className="object-cover"
            />
          ) : (
            <span className="text-xs font-semibold text-[#4B5563]">
              {comment.author.initials}
            </span>
          )}
        </div>

        {/* Контент */}
        <div className="flex-1 min-w-0">
          <div className="bg-[#EDEFF3] rounded-2xl rounded-tl-sm px-3 py-2.5">

            {/* Шапка */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-bold text-[#1F2A44]">
                {comment.author.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#9AA3B8]">{timeAgo}</span>
                <button
                  className="relative"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <Image
                    src="/icons/more.svg"
                    alt="ещё"
                    width={14}
                    height={14}
                    style={{ width: 'auto' }}
                  />
                </button>
              </div>
            </div>

            {/* Текст */}
            {comment.text && (
              <p className="text-sm text-[#3D4860] leading-relaxed">
                {comment.text}
              </p>
            )}

            {/* Фото */}
            {comment.images && comment.images.length > 0 && (
              <div className={`mt-2 grid gap-1.5 ${
                comment.images.length === 1
                  ? 'grid-cols-1'
                  : comment.images.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-2'
              }`}>
                {comment.images.map((src, i) => {
                  // третья фотка на всю ширину если нечётное кол-во
                  const isLastOdd =
                    comment.images!.length % 2 !== 0 &&
                    i === comment.images!.length - 1;
                  return (
                    <div
                      key={i}
                      className={`relative rounded-xl overflow-hidden cursor-pointer ${
                        isLastOdd ? 'col-span-2' : ''
                      }`}
                      style={{ aspectRatio: isLastOdd ? '16/7' : '1/1' }}
                      onClick={() => setLightboxImg(src)}
                    >
                      <Image
                        src={src}
                        alt={`фото ${i + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Лайк под пузырём */}
          <button
            onClick={handleLike}
            className="flex items-center gap-1 mt-1.5 ml-1"
          >
            <Image
              src={liked ? '/icons/like.svg' : '/icons/notlike.svg'}
              alt="лайк"
              width={14}
              height={14}
              style={{ width: 'auto' }}
            />
            <span className={`text-xs ${liked ? 'text-[#B06B8A]' : 'text-[#9AA3B8]'}`}>
              {likesCount > 0 ? likesCount : ''}
            </span>
          </button>
        </div>

        {/* Меню */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute top-8 right-0 z-20 bg-white rounded-2xl shadow-lg overflow-hidden min-w-[160px]">
              {isMyComment ? (
                <>
                  <button className="w-full text-left px-4 py-3 text-sm text-[#1F2A44] hover:bg-[#F3F6FC]"
                    onClick={() => setMenuOpen(false)}>
                    Редактировать
                  </button>
                  <div className="h-px bg-[#EDEFF3]" />
                  <button className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-[#F3F6FC]"
                    onClick={() => setMenuOpen(false)}>
                    Удалить
                  </button>
                </>
              ) : (
                <>
                  <button className="w-full text-left px-4 py-3 text-sm text-[#1F2A44] hover:bg-[#F3F6FC]"
                    onClick={() => setMenuOpen(false)}>
                    Скрыть
                  </button>
                  <div className="h-px bg-[#EDEFF3]" />
                  <button className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-[#F3F6FC]"
                    onClick={() => setMenuOpen(false)}>
                    Пожаловаться
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden">
            <Image src={lightboxImg} alt="просмотр" fill className="object-contain" />
          </div>
        </div>
      )}
    </>
  );
}