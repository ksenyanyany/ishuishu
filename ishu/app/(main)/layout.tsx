import BottomNav from "@/components/BottomNav";
import DraggableFAB from "@/components/DraggableFAB";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div
        className="min-h-screen dark:bg-[#0D1117]"
        style={{ backgroundImage: 'var(--bg-main)', backgroundRepeat: 'repeat-y', backgroundPosition: 'center top', backgroundSize: '100%' }}
      >
        <Sidebar />
        <div className="w-full max-w-sm mx-auto px-4 pb-32 lg:max-w-2xl lg:ml-64 lg:mx-0 lg:pb-12 lg:pt-8 lg:px-8">
          {children}
        </div>
      </div>
      <div className="lg:hidden">
        <BottomNav />
        <DraggableFAB />
      </div>
    </AuthGuard>
  );
}
