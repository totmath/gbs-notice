import type { Metadata, Viewport } from "next";
import Link from "next/link";
import AdminHeaderButton from "@/components/AdminHeaderButton";
import ThemeToggle from "@/components/ThemeToggle";
import HeaderTitle from "@/components/HeaderTitle";
import "./globals.css";

export const metadata: Metadata = {
  title: "GBSHS",
  description: "경기북과학고등학교 공지사항 앱",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GBSHS",
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
          __html: `(function(){var t=localStorage.getItem('gbs-theme')||'dark';var bg=t==='light'?'#f8f9fa':t==='dim'?'#1c1e26':'#131319';document.documentElement.setAttribute('data-theme',t);document.documentElement.style.backgroundColor=bg;document.documentElement.style.colorScheme=t==='light'?'light':'dark';})()`,
        }}
      />
      <body
        className="min-h-screen"
        style={{ background: "var(--background)", color: "var(--foreground)" }}
      >
        <header
          className="sticky top-0 z-40 px-5 py-3 flex justify-between items-center"
          style={{
            background: "var(--header-bg)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <HeaderTitle />
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
