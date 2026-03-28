"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, BoardPost, Comment } from "@/lib/supabase";

export default function BoardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<BoardPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentAuthor, setCurrentAuthor] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

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
        .from("board_posts")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        setLoading(false);
        return;
      }
      setPost(data);
      await supabase
        .from("board_posts")
        .update({ view_count: (data.view_count ?? 0) + 1 })
        .eq("id", id);
      setLoading(false);
      loadComments();
    }
    load();
  }, [id]);

  async function loadComments() {
    const { data } = await supabase
      .from("board_comments")
      .select("*")
      .eq("post_id", id)
      .order("created_at", { ascending: true });
    setComments(data ?? []);
  }

  async function handleDelete() {
    if (!confirm("정말 삭제할까요?")) return;
    await supabase.from("board_posts").delete().eq("id", id);
    router.push("/board");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    await supabase
      .from("board_posts")
      .update({ title: editTitle, content: editContent })
      .eq("id", id);
    setPost((prev) =>
      prev ? { ...prev, title: editTitle, content: editContent } : prev,
    );
    setEditing(false);
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    await supabase.from("board_comments").insert({
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
    await supabase.from("board_comments").delete().eq("id", commentId);
    loadComments();
  }

  if (loading) return <p className="state-text">불러오는 중...</p>;
  if (!post)
    return (
      <div className="text-center py-12 space-y-3">
        <p style={{ color: "#f87171" }}>글을 불러오지 못했습니다.</p>
        <Link
          href="/board"
          className="text-sm"
          style={{ color: "var(--muted-fg)" }}
        >
          돌아가기
        </Link>
      </div>
    );

  const date = new Date(post.created_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const canEdit = post.user_id === currentUserId || isAdmin;

  return (
    <article className="space-y-6">
      <Link
        href="/board"
        className="inline-flex items-center gap-1.5 text-sm"
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
        자유게시판
      </Link>

      {editing ? (
        <form onSubmit={handleEdit} className="space-y-3">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="input-base text-lg font-bold"
            required
          />
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={12}
            className="input-base resize-none"
            required
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1 py-2">
              저장
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="btn-secondary flex-1 py-2"
            >
              취소
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs" style={{ color: "var(--muted-fg)" }}>
                {date}
              </span>
              <span className="text-xs" style={{ color: "var(--muted-fg)" }}>
                · {post.author}
              </span>
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
              {canEdit && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditTitle(post.title);
                      setEditContent(post.content);
                      setEditing(true);
                    }}
                    className="text-xs"
                    style={{ color: "#818cf8" }}
                  >
                    수정
                  </button>
                  <button
                    onClick={handleDelete}
                    className="text-xs"
                    style={{ color: "#f87171" }}
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
            <h1
              className="text-xl font-bold leading-snug"
              style={{ color: "var(--foreground)" }}
            >
              {post.title}
            </h1>
          </div>

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
            <div
              className="rounded-xl p-4 space-y-2.5"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--muted-fg)" }}
              >
                첨부파일
              </p>
              <div className="space-y-1.5">
                {post.files.map((f, i) => (
                  <a
                    key={i}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={f.name}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: "#818cf8" }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 13 13"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M2 9.5V11h9V9.5M6.5 2v7m0 0-2.5-2.5M6.5 9l2.5-2.5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {f.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}

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
