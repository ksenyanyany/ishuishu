'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

type ReplyTo = {
  name: string;
  text: string;
};

type Props = {
  onSubmit: (text: string, images: string[]) => void;
  replyTo?: ReplyTo | null;
  onCancelReply?: () => void;
};

export default function CommentInput({ onSubmit, replyTo, onCancelReply }: Props) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Фокус при появлении ответа
  useEffect(() => {
    if (replyTo) {
      textareaRef.current?.focus();
    }
  }, [replyTo]);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      setImages((prev) => [...prev, URL.createObjectURL(file)]);
    });
    if (inputRef.current) inputRef.current.value = '';
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSend() {
    if (!text.trim() && images.length === 0) return;
    const finalText = replyTo ? `@${replyTo.name} ${text.trim()}` : text.trim();
    onSubmit(finalText, images);
    setText('');
    setImages([]);
    onCancelReply?.();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-30 bg-transparent">
      <div className="w-full px-4 pt-2 pb-24">

        {/* Баннер "отвечаю на..." */}
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="flex-1 min-w-0 bg-[#EDEFF3] rounded-xl px-3 py-1.5 border-l-2 border-[#6B7FA8]">
              <span className="text-xs font-semibold text-[#6B7FA8]">
                {replyTo.name}
              </span>
              <p className="text-xs text-[#9AA3B8] truncate">{replyTo.text}</p>
            </div>
            <button
              onClick={onCancelReply}
              className="w-6 h-6 rounded-full bg-[#EDEFF3] flex items-center justify-center shrink-0"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1L9 9M9 1L1 9" stroke="#9AA3B8" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* Превью прикреплённых фото */}
        {images.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {images.map((src, i) => (
              <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                <Image src={src} alt="фото" fill className="object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center"
                >
                  <span className="text-white text-xs leading-none">×</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Поле ввода */}
        <div className="flex items-end gap-2">

          {/* Кнопка прикрепить фото */}
          <label className="w-9 h-9 rounded-full bg-[#EDEFF3] flex items-center justify-center shrink-0 cursor-pointer mb-0.5">
            <Image
              src="/icons/photo.svg"
              alt="фото"
              width={18}
              height={18}
              style={{ width: 'auto' }}
            />
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImage}
            />
          </label>

          {/* Текстовое поле */}
          <div className="flex-1 bg-[#EDEFF3] rounded-2xl px-4 py-2.5 flex items-end gap-2">
            <textarea
              ref={textareaRef}
              className="flex-1 bg-transparent outline-none text-sm text-[#1F2A44] placeholder:text-[#9AA3B8] resize-none max-h-28 leading-relaxed"
              placeholder={replyTo ? `Ответить ${replyTo.name}...` : 'Напиши комментарий...'}
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onKeyDown={handleKeyDown}
            />

            {/* Кнопка отправить */}
            {(text.trim() || images.length > 0) && (
              <button
                onClick={handleSend}
                className="w-7 h-7 rounded-full bg-[#6B7FA8] flex items-center justify-center shrink-0 mb-0.5"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 7L13 1L7.5 13L6 8L1 7Z" fill="white" stroke="white" strokeWidth="0.5" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
