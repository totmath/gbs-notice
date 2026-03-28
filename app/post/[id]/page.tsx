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
  const [error, setError] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
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

      setCurrentUserId(user.id);
      setIsAdmin(profile.is_admin ?? false);
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
      } else {
        setPost(data);
        // 조회수 증가
        await supabase
          .from("posts")
          .update({ view_count: (data.view_count ?? 0) + 1 })
          .eq("id", id);
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
    });
    setCommentText("");
    setSubmittingComment(false);
    loadComments();
  }

  async function handleDeleteComment(commentId: string) {
    await supabase.from("comments").delete().eq("id", commentId);
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
      </div>

      <div className="flex items-center gap-2">
        <BookmarkButton postId={id} />
      </div>

      {post.image_url && (
        <div
          className="overflow-hidden rounded-xl"
          style={{ border: "1px solid var(--border-subtle)" }}
        >
          <img
            src={post.image_url}
            alt=""
            className="w-full max-h-80 object-contain"
            style={{ background: "var(--surface)" }}
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
                    {c.author}
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

        <form onSubmit={handleCommentSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="댓글 입력..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="input-base flex-1"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={submittingComment || !commentText.trim()}
            className="btn-primary px-4"
          >
            등록
          </button>
        </form>
      </div>
    </article>
  );
}
