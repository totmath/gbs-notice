"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, Post, BoardPost } from "@/lib/supabase";

type MyItem =
  | (Post & { _source: "notice" })
  | (BoardPost & { _source: "board" });

const badgeClass: Record<string, string> = {
  공지: "badge-notice",
  일정: "badge-schedule",
  동아리: "badge-club",
  자유게시판: "badge-event",
};

export default function MyPostsPage() {
  const router = useRouter();
  const [items, setItems] = useState<MyItem[]>([]);
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

      const [{ data: noticePosts }, { data: boardPosts }] = await Promise.all([
        supabase
          .from("posts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("board_posts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      const merged: MyItem[] = [
        ...(noticePosts ?? []).map((p) => ({
          ...p,
          _source: "notice" as const,
        })),
        ...(boardPosts ?? []).map((p) => ({ ...p, _source: "board" as const })),
      ].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setItems(merged);
      setLoading(false);
    }
    init();
  }, [router]);

  if (loading) return <p className="state-text">불러오는 중...</p>;

  return (
    <div className="max-w-lg mx-auto space-y-5 py-4">
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
          내 글
        </h1>
      </div>

      {items.length === 0 ? (
        <p className="state-text">작성한 글이 없습니다.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => {
            const href =
              item._source === "board"
                ? `/board/${item.id}`
                : `/post/${item.id}`;
            const cat = item._source === "board" ? "자유게시판" : item.category;
            const date = new Date(item.created_at).toLocaleDateString("ko-KR", {
              month: "long",
              day: "numeric",
            });
            const isAnon =
              item._source === "board" && (item as BoardPost).is_anonymous;
            return (
              <Link
                key={`${item._source}-${item.id}`}
                href={href}
                className="block"
              >
                <div className="card px-4 py-2 cursor-pointer">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span
                        className={`badge ${badgeClass[cat] ?? "badge-notice"} shrink-0`}
                      >
                        {cat}
                      </span>
                      <p
                        className="text-sm font-medium leading-snug truncate"
                        style={{
                          color: isAnon
                            ? "var(--muted-fg)"
                            : "var(--foreground)",
                          fontStyle: isAnon ? "italic" : "normal",
                        }}
                      >
                        {item.title}
                      </p>
                    </div>
                    <span
                      className="text-xs shrink-0"
                      style={{ color: "var(--muted-fg)" }}
                    >
                      {date}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
