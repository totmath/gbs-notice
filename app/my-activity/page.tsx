"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, Post, BoardPost } from "@/lib/supabase";

type MyPost =
  | (Post & { _source: "notice" })
  | (BoardPost & { _source: "board" });

interface MyComment {
  id: string;
  content: string;
  created_at: string;
  post_id: string;
  post_title: string;
  type: "board" | "regular";
}

const badgeClass: Record<string, string> = {
  공지: "badge-notice",
  자유게시판: "badge-event",
};

export default function MyActivityPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"posts" | "comments">("posts");
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [comments, setComments] = useState<MyComment[]>([]);
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

      const [
        { data: noticePosts },
        { data: boardPosts },
        { data: boardComments },
        { data: regularComments },
      ] = await Promise.all([
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
        supabase
          .from("board_comments")
          .select("id, content, created_at, post_id")
          .eq("user_id", user.id),
        supabase
          .from("comments")
          .select("id, content, created_at, post_id")
          .eq("user_id", user.id),
      ]);

      const mergedPosts: MyPost[] = [
        ...(noticePosts ?? []).map((p) => ({
          ...p,
          _source: "notice" as const,
        })),
        ...(boardPosts ?? []).map((p) => ({ ...p, _source: "board" as const })),
      ].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setPosts(mergedPosts);

      const boardPostIds = [
        ...new Set((boardComments ?? []).map((c) => c.post_id)),
      ];
      const regularPostIds = [
        ...new Set((regularComments ?? []).map((c) => c.post_id)),
      ];
      const [{ data: boardPostTitles }, { data: regularPostTitles }] =
        await Promise.all([
          boardPostIds.length > 0
            ? supabase
                .from("board_posts")
                .select("id, title")
                .in("id", boardPostIds)
            : Promise.resolve({ data: [] }),
          regularPostIds.length > 0
            ? supabase
                .from("posts")
                .select("id, title")
                .in("id", regularPostIds)
            : Promise.resolve({ data: [] }),
        ]);
      const boardPostMap = new Map(
        (boardPostTitles ?? []).map((p) => [p.id, p.title]),
      );
      const regularPostMap = new Map(
        (regularPostTitles ?? []).map((p) => [p.id, p.title]),
      );

      const mergedComments: MyComment[] = [
        ...(boardComments ?? []).map((c) => ({
          ...c,
          post_title: boardPostMap.get(c.post_id) ?? "알 수 없는 게시글",
          type: "board" as const,
        })),
        ...(regularComments ?? []).map((c) => ({
          ...c,
          post_title: regularPostMap.get(c.post_id) ?? "알 수 없는 게시글",
          type: "regular" as const,
        })),
      ].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setComments(mergedComments);

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
          내 활동
        </h1>
      </div>

      <div className="flex gap-1.5">
        {(
          [
            { key: "posts", label: `글 ${posts.length}` },
            { key: "comments", label: `댓글 ${comments.length}` },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="text-sm px-4 py-1.5 rounded-lg font-medium transition-all"
            style={
              tab === key
                ? {
                    background: "#6366f1",
                    color: "#fff",
                    border: "1px solid transparent",
                  }
                : {
                    background: "var(--surface)",
                    color: "var(--muted-fg)",
                    border: "1px solid var(--border-subtle)",
                  }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "posts" &&
        (posts.length === 0 ? (
          <p className="state-text">작성한 글이 없습니다.</p>
        ) : (
          <div className="space-y-1.5">
            {posts.map((item) => {
              const href =
                item._source === "board"
                  ? `/board/${item.id}`
                  : `/post/${item.id}`;
              const cat =
                item._source === "board" ? "자유게시판" : item.category;
              const isAnon =
                item._source === "board" && (item as BoardPost).is_anonymous;
              const date = new Date(item.created_at).toLocaleDateString(
                "ko-KR",
                { month: "short", day: "numeric" },
              );
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
        ))}

      {tab === "comments" &&
        (comments.length === 0 ? (
          <p className="state-text">작성한 댓글이 없습니다.</p>
        ) : (
          <div className="space-y-1.5">
            {comments.map((c) => {
              const href =
                c.type === "board"
                  ? `/board/${c.post_id}`
                  : `/post/${c.post_id}`;
              const date = new Date(c.created_at).toLocaleDateString("ko-KR", {
                month: "short",
                day: "numeric",
              });
              return (
                <Link key={`${c.type}-${c.id}`} href={href} className="block">
                  <div className="card px-4 py-3 cursor-pointer space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className="text-xs font-medium truncate"
                        style={{ color: "var(--primary)" }}
                      >
                        {c.post_title}
                      </p>
                      <span
                        className="text-xs shrink-0"
                        style={{ color: "var(--muted-fg)" }}
                      >
                        {date}
                      </span>
                    </div>
                    <p
                      className="text-sm"
                      style={{
                        color: "var(--foreground)",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical" as const,
                      }}
                    >
                      {c.content}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
    </div>
  );
}
