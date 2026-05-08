// app/(main)/layout.tsx

import BottomNav from "@/components/BottomNav";
import DraggableFAB from "@/components/DraggableFAB";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: "url('/bg2.svg')",
        backgroundRepeat: "repeat-y",
        backgroundPosition: "center top",
        backgroundSize: "100%",
      }}
    >
      <div className="w-full max-w-sm mx-auto px-4 pb-32">
        {children}
      </div>
      <BottomNav />
      <DraggableFAB />
    </div>
  );
}