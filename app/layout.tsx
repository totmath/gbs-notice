import type { Metadata, Viewport } from "next";
import Link from "next/link";
import AdminHeaderButton from "@/components/AdminHeaderButton";
import ThemeToggle from "@/components/ThemeToggle";
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
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var t=localStorage.getItem('gbs-theme')||'dark';document.documentElement.setAttribute('data-theme',t);})()`,
        }}
      />
      <body
        className="min-h-screen"
        style={{ background: "var(--background)", color: "var(--foreground)" }}
      >
        <header
          className="sticky top-0 z-40 px-5 py-3 flex justify-between items-center"
          style={{
            background: "rgba(9, 9, 15, 0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <Link href="/">
            <h1
              className="text-base font-semibold tracking-tight"
              style={{ color: "var(--foreground)" }}
            >
              경기북과학고
            </h1>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <AdminHeaderButton />
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-7">{children}</main>
      </body>
    </html>
  );
}
