export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen w-full flex"
      style={{
        backgroundImage: "url('/bg.svg')",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      {/* Десктоп: левая декоративная колонка */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center px-16 gap-4">
        <h1
          className="text-8xl text-[#1F2A44] select-none"
          style={{ fontFamily: 'var(--font-astroneer)' }}
        >
          ishu.
        </h1>
        <p className="text-xl text-[#4B5563] text-center max-w-xs">
          место, где важны эмоции
        </p>
      </div>

      {/* Форма — по центру на мобайле, справа на десктопе */}
      <div className="flex-1 flex items-center justify-center px-6 py-8 lg:max-w-lg lg:flex-none">
        {children}
      </div>
    </div>
  );
}
