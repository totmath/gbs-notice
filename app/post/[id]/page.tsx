"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, Post, Comment } from "@/lib/supabase";
import BookmarkButton from "@/components/BookmarkButton";
import ReactionBar from "@/components/ReactionBar";
import FilePreview from "@/components/FilePreview";

const BADGE_CLASS: Record<Post["category"], string> = {
  공지: "badge badge-notice",
  일정: "badge badge-schedule",
  행사: "badge badge-event",
  동아리: "badge badge-club",
};

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentAnon, setCommentAnon] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentAuthor, setCurrentAuthor] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("approved, is_admin, name, student_id")
        .eq("id", user.id)
        .single();
      if (!profile?.approved) {
        router.replace("/pending");
        return;
      }

      const isAdminUser = profile.is_admin ?? false;
      const grade = profile.student_id?.split("-")[0] ?? null;
      setCurrentUserId(user.id);
      setIsAdmin(isAdminUser);
      // 읽음 처리
      const key = `gbs-read-notices-${user.id}`;
      try {
        const prev = new Set<string>(
          JSON.parse(localStorage.getItem(key) ?? "[]"),
        );
        prev.add(id);
        localStorage.setItem(key, JSON.stringify([...prev]));
      } catch {}
      setCurrentAuthor(
        profile.student_id
          ? `${profile.student_id} ${profile.name}`
          : profile.name,
      );

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        setError(true);
      } else if (data.deleted_at && !isAdminUser) {
        router.replace("/");
        return;
      } else if (!isAdminUser && data.visible_to && data.visible_to !== grade) {
        router.replace("/");
        return;
      } else {
        setPost(data);
        // 조회수 증가
        await supabase.rpc("increment_post_view", { post_id: id });
      }
      setLoading(false);
      loadComments();
    }
    load();
  }, [id]);

  async function loadComments() {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    setComments(data ?? []);
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || !currentUserId) return;
    setSubmittingComment(true);
    await supabase.from("comments").insert({
      post_id: id,
      user_id: currentUserId,
      author: currentAuthor,
      content: commentText.trim(),
      is_anonymous: commentAnon,
    });
    if (post && post.user_id !== currentUserId) {
      await supabase.from("notifications").insert({
        user_id: post.user_id,
        title: "새 댓글",
        body: `${commentAnon ? "익명" : currentAuthor}님이 댓글을 달았습니다: ${commentText.trim().slice(0, 50)}`,
        post_id: id,
        board_post_id: null,
      });
    }
    setCommentText("");
    setCommentAnon(false);
    setSubmittingComment(false);
    loadComments();
  }

  async function handleDeleteComment(commentId: string) {
    let query = supabase
      .from("comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", commentId);
    if (!isAdmin) query = query.eq("user_id", currentUserId);
    await query;
    loadComments();
  }

  if (loading) return <p className="state-text">불러오는 중...</p>;

  if (error || !post) {
    return (
      <div className="text-center py-12 space-y-3">
        <p style={{ color: "#f87171" }}>공지를 불러오지 못했습니다.</p>
        <button
          onClick={() => router.back()}
          className="text-sm"
          style={{ color: "var(--muted-fg)" }}
        >
          돌아가기
        </button>
      </div>
    );
  }

  const date = new Date(post.created_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm transition-colors"
        style={{ color: "var(--muted-fg)" }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M8.5 2L4 7l4.5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        목록으로
      </Link>

      <div className="space-y-2.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          {post.pinned && <span style={{ color: "#f59e0b" }}>📌</span>}
          <span className={BADGE_CLASS[post.category]}>{post.category}</span>
          <span className="text-xs" style={{ color: "var(--muted-fg)" }}>
            {date}
          </span>
          {post.author && (
            <span className="text-xs" style={{ color: "var(--muted-fg)" }}>
              · {post.author}
            </span>
          )}
          <span
            className="text-xs flex items-center gap-0.5 ml-auto"
            style={{ color: "var(--muted-fg)" }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden
            >
              <path
                d="M6 2C3.5 2 1.5 4 1.5 6s2 4 4.5 4 4.5-2 4.5-4-2-4-4.5-4z"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <circle cx="6" cy="6" r="1.5" fill="currentColor" />
            </svg>
            {(post.view_count ?? 0) + 1}
          </span>
        </div>
        <h1
          className="text-xl font-bold leading-snug"
          style={{ color: "var(--foreground)" }}
        >
          {post.title}
        </h1>
        {post.updated_at && (
          <span className="text-xs" style={{ color: "var(--muted-fg)" }}>
            수정됨
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <BookmarkButton postId={id} />
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className="text-xs flex items-center gap-1"
          style={{ color: copied ? "#6366f1" : "var(--muted-fg)" }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          {copied ? "복사됨!" : "공유"}
        </button>
      </div>

      {post.image_url && (
        <button
          className="overflow-hidden rounded-xl w-full"
          style={{ border: "1px solid var(--border-subtle)" }}
          onClick={() => setLightboxUrl(post.image_url)}
        >
          <img
            src={post.image_url}
            alt=""
            className="w-full max-h-80 object-contain"
            style={{ background: "var(--surface)" }}
          />
        </button>
      )}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 flex items-center justify-center rounded-full"
            style={{
              width: 36,
              height: 36,
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
            }}
            onClick={() => setLightboxUrl(null)}
            aria-label="닫기"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className="rounded-lg"
            style={{
              maxWidth: "calc(100vw - 96px)",
              maxHeight: "calc(100vh - 80px)",
              objectFit: "contain",
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div
        className="divider"
        style={{ borderColor: "var(--border-subtle)" }}
      />

      <p
        className="whitespace-pre-wrap leading-loose text-sm"
        style={{ color: "#c8cdd8" }}
      >
        {post.content}
      </p>

      {post.files && post.files.length > 0 && (
        <FilePreview files={post.files} />
      )}

      <ReactionBar postId={id} />

      {/* 댓글 */}
      <div className="space-y-4 pt-2">
        <div
          className="divider"
          style={{ borderColor: "var(--border-subtle)" }}
        />
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          댓글{" "}
          {comments.length > 0 && (
            <span style={{ color: "var(--primary)" }}>{comments.length}</span>
          )}
        </p>

        {comments.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted-fg)" }}>
            첫 댓글을 남겨보세요.
          </p>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <div
                key={c.id}
                className="rounded-lg px-3.5 py-3 space-y-1"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {c.is_anonymous && !isAdmin && c.user_id !== currentUserId
                      ? "익명"
                      : c.author}
                    {c.is_anonymous &&
                      (isAdmin || c.user_id === currentUserId) && (
                        <span
                          className="text-xs ml-1"
                          style={{ color: "var(--muted-fg)" }}
                        >
                          (익명)
                        </span>
                      )}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs"
                      style={{ color: "var(--muted-fg)" }}
                    >
                      {new Date(c.created_at).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {(c.user_id === currentUserId || isAdmin) && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-xs"
                        style={{ color: "#f87171" }}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
                <p
                  className="text-sm whitespace-pre-wrap"
                  style={{ color: "#c8cdd8" }}
                >
                  {c.content}
                </p>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleCommentSubmit} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="댓글 입력..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="input-base flex-1"
              maxLength={1000}
            />
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className="btn-primary px-4"
            >
              등록
            </button>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={commentAnon}
              onChange={(e) => setCommentAnon(e.target.checked)}
            />
            <span className="text-xs" style={{ color: "var(--muted-fg)" }}>
              익명으로 달기
            </span>
          </label>
        </form>
      </div>
    </article>
  );
}
