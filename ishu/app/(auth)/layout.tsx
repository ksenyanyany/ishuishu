export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center w-full max-w-xl mx-auto px-10 py-6"
      style={{
        backgroundImage: "url('/bg.svg')",
        backgroundPosition: "center 55%",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        minHeight: "100vh",
      }}
    >
      {children}
    </div>
  )
}
