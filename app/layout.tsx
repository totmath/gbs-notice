import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "경기북과학고 공지",
  description: "경기북과학고등학교 공지사항, 학사일정, 행사, 동아리 정보",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "경북과 공지",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <header className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-4 py-3">
          <h1 className="text-lg font-bold text-indigo-400">
            경기북과학고 공지
          </h1>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
