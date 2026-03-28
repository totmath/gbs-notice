"use client";

import { usePathname, useSearchParams } from "next/navigation";

const CATEGORIES = ["전체", "공지", "일정", "동아리"] as const;

const getHref = (cat: string) =>
  cat === "전체" ? "/" : `/?category=${encodeURIComponent(cat)}`;

const btnStyle = (isSelected: boolean): React.CSSProperties =>
  isSelected
    ? {
        background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)",
        color: "#fff",
        borderRadius: "6px",
        border: "1px solid transparent",
        boxShadow: "0 1px 6px rgba(99, 102, 241, 0.35)",
        display: "inline-block",
        padding: "4px 12px",
        fontSize: "12px",
        fontWeight: 500,
        textDecoration: "none",
        cursor: "pointer",
      }
    : {
        background: "var(--surface)",
        color: "var(--muted-fg)",
        borderRadius: "6px",
        border: "1px solid var(--border-subtle)",
        display: "inline-block",
        padding: "4px 12px",
        fontSize: "12px",
        fontWeight: 500,
        textDecoration: "none",
        cursor: "pointer",
      };

export default function CategoryFilter() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category") ?? "전체";
  const isBoard = pathname.startsWith("/board");

  return (
    <div className="flex gap-1.5 flex-wrap mb-5">
      {CATEGORIES.map((cat) => (
        <a
          key={cat}
          href={getHref(cat)}
          style={btnStyle(!isBoard && currentCategory === cat)}
        >
          {cat}
        </a>
      ))}
      <a href="/board" style={btnStyle(isBoard)}>
        자유게시판
      </a>
    </div>
  );
}
