import "./globals.css";
import { Inter } from "next/font/google";
import localFont from "next/font/local";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const astroneerFont = localFont({
  src: "../public/fonts/astroneer.ttf",
  variable: "--font-astroneer",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body
        className={`${inter.variable} ${astroneerFont.variable} min-h-screen`}
        style={{
          backgroundColor: "#F3F6FC",
        }}
      >
        {children}
      </body>
    </html>
  );
}