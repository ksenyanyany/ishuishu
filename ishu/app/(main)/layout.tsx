import BottomNav from "@/components/BottomNav";
import DraggableFAB from "@/components/DraggableFAB";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div
        className="min-h-screen"
        style={{
          backgroundImage: "url('/bg2.svg')",
          backgroundRepeat: "repeat-y",
          backgroundPosition: "center top",
          backgroundSize: "100%",
        }}
      >
        {/* Левый сайдбар (только десктоп, fixed) */}
        <Sidebar />

        {/* Контентная область */}
        {/* Мобайл: центрированная колонка sm */}
        {/* Десктоп: отступ под сайдбар, контент по центру доступного пространства */}
        <div className="lg:ml-64 lg:flex lg:justify-center lg:min-h-screen">
          <div className="w-full max-w-sm mx-auto px-4 pb-32 lg:max-w-2xl lg:mx-0 lg:px-8 lg:py-8 lg:pb-12">
            {children}
          </div>
        </div>
      </div>

      {/* Мобильная навигация — скрыта на десктопе */}
      <div className="lg:hidden">
        <BottomNav />
        <DraggableFAB />
      </div>
    </AuthGuard>
  );
}
