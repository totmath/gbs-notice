"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface MergedComment {
  id: string;
  content: string;
  created_at: string;
  post_id: string;
  post_title: string;
  type: "board" | "regular";
}

export default function MyCommentsPage() {
  const router = useRouter();
  const [comments, setComments] = useState<MergedComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComments = async () => {
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

      const [boardResult, regularResult] = await Promise.all([
        supabase
          .from("board_comments")
          .select("id, content, created_at, post_id")
          .eq("user_id", user.id),
        supabase
          .from("comments")
          .select("id, content, created_at, post_id")
          .eq("user_id", user.id),
      ]);

      const boardComments = boardResult.data ?? [];
      const regularComments = regularResult.data ?? [];

      // Fetch post titles for board_comments
      const boardPostIds = [...new Set(boardComments.map((c) => c.post_id))];
      const regularPostIds = [
        ...new Set(regularComments.map((c) => c.post_id)),
      ];

      const [boardPostsResult, regularPostsResult] = await Promise.all([
        boardPostIds.length > 0
          ? supabase
              .from("board_posts")
              .select("id, title")
              .in("id", boardPostIds)
          : Promise.resolve({ data: [] }),
        regularPostIds.length > 0
          ? supabase.from("posts").select("id, title").in("id", regularPostIds)
          : Promise.resolve({ data: [] }),
      ]);

      const boardPostMap = new Map(
        (boardPostsResult.data ?? []).map((p) => [p.id, p.title]),
      );
      const regularPostMap = new Map(
        (regularPostsResult.data ?? []).map((p) => [p.id, p.title]),
      );

      const merged: MergedComment[] = [
        ...boardComments.map((c) => ({
          id: c.id,
          content: c.content,
          created_at: c.created_at,
          post_id: c.post_id,
          post_title: boardPostMap.get(c.post_id) ?? "알 수 없는 게시글",
          type: "board" as const,
        })),
        ...regularComments.map((c) => ({
          id: c.id,
          content: c.content,
          created_at: c.created_at,
          post_id: c.post_id,
          post_title: regularPostMap.get(c.post_id) ?? "알 수 없는 게시글",
          type: "regular" as const,
        })),
      ].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setComments(merged);
      setLoading(false);
    };

    fetchComments();
  }, [router]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div
      style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "24px 16px",
        color: "var(--foreground)",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/"
          style={{
            color: "var(--muted-fg)",
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          ← 홈으로
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        내 댓글
      </h1>

      {loading ? (
        <p className="state-text" style={{ color: "var(--muted-fg)" }}>
          불러오는 중…
        </p>
      ) : comments.length === 0 ? (
        <p className="state-text" style={{ color: "var(--muted-fg)" }}>
          작성한 댓글이 없습니다.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {comments.map((comment) => {
            const href =
              comment.type === "board"
                ? `/board/${comment.post_id}`
                : `/post/${comment.post_id}`;

            return (
              <div
                key={`${comment.type}-${comment.id}`}
                className="card"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 10,
                  padding: "14px 16px",
                }}
              >
                <Link
                  href={href}
                  style={{
                    color: "var(--foreground)",
                    fontWeight: 600,
                    fontSize: 14,
                    textDecoration: "none",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  {comment.post_title}
                </Link>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: "var(--muted-fg)",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    lineHeight: 1.5,
                  }}
                >
                  {comment.content}
                </p>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: 12,
                    color: "var(--muted-fg)",
                  }}
                >
                  {formatDate(comment.created_at)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
