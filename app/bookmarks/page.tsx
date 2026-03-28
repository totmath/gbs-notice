"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, Post, BoardPost } from "@/lib/supabase";
import PostCard from "@/components/PostCard";

type BookmarkItem =
  | (Post & { _source: "notice" })
  | (BoardPost & { _source: "board"; category: "자유게시판"; pinned: false });

export default function BookmarksPage() {
  const router = useRouter();
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("approved")
        .eq("id", user.id)
        .single();
      if (!profile?.approved) {
        router.replace("/pending");
        return;
      }

      const { data: bms } = await supabase
        .from("bookmarks")
        .select("post_id, board_post_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!bms || bms.length === 0) {
        setLoading(false);
        return;
      }

      const postIds = bms.filter((b) => b.post_id).map((b) => b.post_id!);
      const boardIds = bms
        .filter((b) => b.board_post_id)
        .map((b) => b.board_post_id!);

      const [{ data: posts }, { data: boards }] = await Promise.all([
        postIds.length > 0
          ? supabase.from("posts").select("*").in("id", postIds)
          : Promise.resolve({ data: [] }),
        boardIds.length > 0
          ? supabase.from("board_posts").select("*").in("id", boardIds)
          : Promise.resolve({ data: [] }),
      ]);

      // 북마크 순서 유지
      const noticeMap = new Map((posts ?? []).map((p) => [p.id, p]));
      const boardMap = new Map((boards ?? []).map((p) => [p.id, p]));

      const result: BookmarkItem[] = [];
      for (const bm of bms) {
        if (bm.post_id && noticeMap.has(bm.post_id)) {
          result.push({ ...noticeMap.get(bm.post_id)!, _source: "notice" });
        } else if (bm.board_post_id && boardMap.has(bm.board_post_id)) {
          result.push({
            ...boardMap.get(bm.board_post_id)!,
            _source: "board",
            category: "자유게시판",
            pinned: false,
          });
        }
      }

      setItems(result);
      setLoading(false);
    }
    init();
  }, [router]);

  if (loading) return <p className="state-text">불러오는 중...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm"
          style={{ color: "var(--muted-fg)" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden
          >
            <path
              d="M8.5 2L4 7l4.5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          돌아가기
        </Link>
        <h1
          className="text-lg font-bold"
          style={{ color: "var(--foreground)" }}
        >
          북마크
        </h1>
      </div>

      {items.length === 0 ? (
        <p className="state-text">저장한 게시글이 없습니다.</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <PostCard key={item.id} post={item} />
          ))}
        </div>
      )}
    </div>
  );
}
