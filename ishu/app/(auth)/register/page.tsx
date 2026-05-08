'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#9AA3B8" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="3" stroke="#9AA3B8" strokeWidth="1.8"/>
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" stroke="#9AA3B8" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [error, setError]         = useState('');

  async function handleSubmit() {
    if (!name.trim())            { setError('Введите ваше имя'); return; }
    if (!email.trim())           { setError('Введите email'); return; }
    if (!email.includes('@'))    { setError('Некорректный email'); return; }
    if (password.length < 6)     { setError('Пароль должен быть не менее 6 символов'); return; }
    if (password !== confirm)    { setError('Пароли не совпадают'); return; }
    setError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) { setError(data.error ?? 'Ошибка регистрации'); return; }

      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('user_id', String(data.user_id));
      router.push('/feed');
    } catch {
      setError('Не удалось подключиться к серверу');
    }
  }

  return (
    <main className="w-full max-w-sm flex flex-col gap-6 shrink-0">
      <div className="w-full bg-[#EDEFF3] rounded-2xl shadow-md p-6 flex flex-col items-center gap-4">

        <h1 className="text-5xl font-(--font-astroneer) text-[#1F2A44]">Регистрация</h1>

        <input
          type="text"
          placeholder="Ваше имя"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          className="w-full px-4 py-3 rounded-xl bg-[#D6DAE3] text-[#1F2A44] placeholder-[#4B5563] outline-none focus:ring-2 focus:ring-[#8E9BB5] transition-all"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); }}
          className="w-full px-4 py-3 rounded-xl bg-[#D6DAE3] text-[#1F2A44] placeholder-[#4B5563] outline-none focus:ring-2 focus:ring-[#8E9BB5] transition-all"
        />

        {/* Пароль */}
        <div className="relative w-full">
          <input
            type={showPass ? 'text' : 'password'}
            placeholder="Пароль"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            className="w-full px-4 py-3 pr-12 rounded-xl bg-[#D6DAE3] text-[#1F2A44] placeholder-[#4B5563] outline-none focus:ring-2 focus:ring-[#8E9BB5] transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 active:opacity-60"
          >
            <EyeIcon open={showPass} />
          </button>
        </div>

        {/* Подтверждение пароля */}
        <div className="relative w-full">
          <input
            type={showConf ? 'text' : 'password'}
            placeholder="Подтвердите пароль"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(''); }}
            className="w-full px-4 py-3 pr-12 rounded-xl bg-[#D6DAE3] text-[#1F2A44] placeholder-[#4B5563] outline-none focus:ring-2 focus:ring-[#8E9BB5] transition-all"
          />
          <button
            type="button"
            onClick={() => setShowConf((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 active:opacity-60"
          >
            <EyeIcon open={showConf} />
          </button>
        </div>

        {error && <p className="w-full text-sm text-red-400 -mt-2">{error}</p>}

        <button
          onClick={handleSubmit}
          className="w-full py-3 rounded-xl bg-[#8E9BB5] text-[#1F2A44] text-xl active:bg-[#68758D] transition-colors"
        >
          Зарегистрироваться
        </button>

        <div className="border-t border-gray-200 py-2 flex justify-between items-center text-[#94A3B8] text-sm gap-4">
          <span className="whitespace-nowrap">Уже есть аккаунт?</span>
          <Link href="/login" className="text-[#1F2A44] font-semibold">Войти</Link>
        </div>

      </div>
    </main>
  );
}
