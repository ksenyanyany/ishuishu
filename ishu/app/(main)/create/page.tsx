'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const moods = [
  { label: 'спокойствие', color: '#7A9AB8' },
  { label: 'радость', color: '#8AAA5A' },
  { label: 'грусть', color: '#7A85B0' },
  { label: 'тревога', color: '#C09060' },
  { label: 'злость', color: '#C07070' },
  { label: 'любовь', color: '#C07090' },
];

export default function CreatePage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);

  function toggleMood(label: string) {
    setSelectedMoods((prev) =>
      prev.includes(label)
        ? prev.filter((m) => m !== label)
        : [...prev, label]
    );
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImages((prev) => [...prev, ev.target?.result as string]);
    reader.readAsDataURL(file);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handlePublish() {
    if (!text.trim()) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/posts/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
      body: JSON.stringify({ text: text.trim(), moods: selectedMoods, image: images[0] ?? '' }),
    });
    if (res.ok) router.push('/feed');
  }

  return (
    <div className="flex flex-col min-h-screen">

      {/* Топбар */}
      <div className="flex items-center justify-between pt-14 pb-4">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-[#EDEFF3] flex items-center justify-center"
        >
          <Image src="/icons/back.svg" alt="назад" width={16} height={16} style={{ width: 'auto' }} />
        </button>
        <span className="text-base font-bold text-[#1F2A44]">Новый пост</span>
        <button
          onClick={handlePublish}
          className="px-4 py-2 rounded-xl bg-[#8E9BB5] text-white text-sm font-bold"
        >
          Опубликовать
        </button>
      </div>

      {/* Автор */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[#C5CEDC] flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-[#4B5563]">Я</span>
        </div>
        <span className="text-sm font-bold text-[#1F2A44]">Вы</span>
      </div>

      {/* Текст */}
      <textarea
        className="w-full bg-transparent outline-none text-sm text-[#1F2A44] placeholder:text-[#9AA3B8] resize-none mb-1"
        placeholder="Что ты чувствуешь прямо сейчас?.."
        rows={5}
        maxLength={500}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="text-right text-xs text-[#9AA3B8] mb-3">
        {text.length} / 500
      </div>

      <div className="h-px bg-[#DDE3EC] mb-4" />

      {/* Настроение */}
      <span className="text-xs font-bold text-[#9AA3B8] uppercase tracking-wide mb-3">
        Настроение
      </span>
      <div className="flex flex-wrap gap-2 mb-4">
        {moods.map((mood) => {
          const selected = selectedMoods.includes(mood.label);
          return (
            <button
              key={mood.label}
              onClick={() => toggleMood(mood.label)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all"
              style={
                selected
                  ? { background: mood.color, borderColor: mood.color, color: 'white' }
                  : { background: 'transparent', borderColor: '#DDE3EC', color: '#5A6878' }
              }
            >
              <div
                className="w-2 h-2 rounded-full shrink-0 mt-px"
                style={{ background: selected ? 'rgba(255,255,255,0.7)' : mood.color }}
              />
              {mood.label}
            </button>
          );
        })}
      </div>

      <div className="h-px bg-[#DDE3EC] mb-4" />

      {/* Фото */}
      <span className="text-xs font-bold text-[#9AA3B8] uppercase tracking-wide mb-3">
        Фото / видео
      </span>
      <div className="flex gap-3 mb-4 flex-wrap">
        {images.map((src, index) => (
          <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
            <Image src={src} alt="фото" fill className="object-cover" />
            <button
              onClick={() => removeImage(index)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/40 flex items-center justify-center"
            >
              <span className="text-white text-xs leading-none">×</span>
            </button>
          </div>
        ))}

        {/* Кнопка добавить — всегда видна */}
        <label className="w-20 h-20 rounded-xl border-2 border-dashed border-[#C5CEDC] flex flex-col items-center justify-center gap-1 cursor-pointer shrink-0">
          <Image src="/icons/plus-gray.svg" alt="добавить" width={22} height={22} style={{ width: 'auto' }} />
          <span className="text-xs text-[#9AA3B8]">Добавить</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
        </label>
      </div>

    </div>
  );
}