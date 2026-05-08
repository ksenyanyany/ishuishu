import Link from 'next/link';

export default function Home() {
  return (
    <main className="w-full max-w-sm flex flex-col gap-6 shrink-0">

      {/* верхняя карточка */}
      <div className="w-full bg-[#EDEFF3] rounded-2xl shadow-md p-6 text-center">

        <h1 className="text-5xl font-(--font-astroneer) text-[#1F2A44]">
          ishu.
        </h1>

        <p className="mt-1 text-s font-(--font-inter) text-[#4B5563]">
          место, где важны эмоции
        </p>
      </div>

      {/* нижняя карточка */}
      <div className="w-full bg-[#EDEFF3] rounded-2xl shadow-md p-6 flex flex-col items-center justify-center gap-4">

        <Link href="/register" className="w-full">
          <button className="w-full py-3 rounded-xl bg-[#8E9BB5] text-[#1F2A44] text-xl font-[var(--font-inter)] active:bg-[#68758D]">
            Зарегистрироваться
          </button>
        </Link>

        <Link href="/login">
          <button className="px-6 py-2 rounded-xl bg-[#D6DAE3] text-[#1F2A44] text-xl font-[var(--font-inter)] active:bg-[#ADB6C7]">
            Войти
          </button>
        </Link>
      </div>

    </main>
  )
}