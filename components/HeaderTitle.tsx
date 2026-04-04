"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ROUTE_NAMES: Record<string, string> = {
  "/": "GBSHS",
  "/board": "자유게시판",
  "/bookmarks": "북마크",
  "/notifications": "알림",
  "/my-posts": "내 글",
  "/my-comments": "내 댓글",
  "/my-activity": "활동 내역",
  "/feedback": "건의하기",
  "/account": "계정",
  "/admin": "관리자",
  "/post/new": "공지 작성",
  "/board/new": "글쓰기",
  "/signup": "회원가입",
  "/login": "로그인",
  "/pending": "승인 대기",
};

export default function HeaderTitle() {
  const pathname = usePathname();

  // 동적 라우트 처리
  let name = ROUTE_NAMES[pathname];
  if (!name) {
    if (pathname.startsWith("/post/")) name = "공지";
    else if (pathname.startsWith("/board/")) name = "자유게시판";
    else if (pathname.startsWith("/admin")) name = "관리자";
    else name = "GBSHS";
  }

  const title = (
    <span
      className="text-base font-semibold tracking-tight"
      style={{ color: "var(--foreground)" }}
    >
      {name}
    </span>
  );

  if (pathname === "/") return title;
  return <Link href="/">{title}</Link>;
}
