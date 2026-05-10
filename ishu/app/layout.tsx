import "./globals.css";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import ThemeProvider from "@/components/ThemeProvider";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} ${astroneerFont.variable} min-h-screen bg-[#F3F6FC] dark:bg-[#0D1117]`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
