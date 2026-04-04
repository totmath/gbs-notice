"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, BoardPost, Comment, PostFile } from "@/lib/supabase";
import BookmarkButton from "@/components/BookmarkButton";
import FilePreview from "@/components/FilePreview";

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
  const [commentAnon, setCommentAnon] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyAnon, setReplyAnon] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editExistingFiles, setEditExistingFiles] = useState<PostFile[]>([]);
  const [editNewFiles, setEditNewFiles] = useState<File[]>([]);

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
        .from("board_posts")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        setLoading(false);
        return;
      }
      if (data.deleted_at && !(profile.is_admin ?? false)) {
        router.replace("/board");
        return;
      }
      setPost(data);
      await supabase.rpc("increment_board_post_view", { post_id: id });
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
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    setComments(data ?? []);
  }

  async function handleDelete() {
    if (!confirm("정말 삭제할까요?")) return;
    let query = supabase
      .from("board_posts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (!isAdmin) query = query.eq("user_id", currentUserId);
    await query;
    router.push("/board");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    let allFiles = [...editExistingFiles];
    if (editNewFiles.length > 0) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      for (const file of editNewFiles) {
        const signRes = await fetch("/api/upload-sign", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ size: file.size, type: file.type }),
        });
        if (!signRes.ok) continue;
        const { signature, timestamp, folder, apiKey, cloudName } =
          await signRes.json();
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", apiKey);
        formData.append("timestamp", String(timestamp));
        formData.append("signature", signature);
        formData.append("folder", folder);
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
          { method: "POST", body: formData },
        );
        if (res.ok) {
          const data = await res.json();
          allFiles.push({
            name: file.name,
            url: data.secure_url,
            type: file.type,
          });
        }
      }
    }
    let editQuery = supabase
      .from("board_posts")
      .update({
        title: editTitle,
        content: editContent,
        files: allFiles,
        updated_at: now,
      })
      .eq("id", id);
    if (!isAdmin) editQuery = editQuery.eq("user_id", currentUserId);
    await editQuery;
    setPost((prev) =>
      prev
        ? {
            ...prev,
            title: editTitle,
            content: editContent,
            files: allFiles,
            updated_at: now,
          }
        : prev,
    );
    setEditing(false);
    setEditNewFiles([]);
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
      is_anonymous: commentAnon,
    });
    if (post && post.user_id !== currentUserId) {
      await supabase.from("notifications").insert({
        user_id: post.user_id,
        title: "새 댓글",
        body: `${commentAnon ? "익명" : currentAuthor}님이 댓글을 달았습니다: ${commentText.trim().slice(0, 50)}`,
        board_post_id: id,
        post_id: null,
      });
    }
    setCommentText("");
    setCommentAnon(false);
    setSubmittingComment(false);
    loadComments();
  }

  async function handleReplySubmit(parentId: string) {
    if (!replyText.trim()) return;
    await supabase.from("board_comments").insert({
      post_id: id,
      user_id: currentUserId,
      author: currentAuthor,
      content: replyText.trim(),
      parent_id: parentId,
      is_anonymous: replyAnon,
    });
    setReplyText("");
    setReplyAnon(false);
    setReplyingTo(null);
    loadComments();
  }

  async function handleDeleteComment(commentId: string) {
    let query = supabase
      .from("board_comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", commentId);
    if (!isAdmin) query = query.eq("user_id", currentUserId);
    await query;
    loadComments();
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
          {editExistingFiles.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs" style={{ color: "var(--muted-fg)" }}>
                첨부파일
              </p>
              {editExistingFiles.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md"
                  style={{ background: "var(--surface)" }}
                >
                  <span style={{ color: "var(--foreground)" }}>
                    📎 {f.name}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditExistingFiles(
                        editExistingFiles.filter((_, j) => j !== i),
                      )
                    }
                    style={{ color: "#f87171" }}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
          <label
            className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 cursor-pointer"
            style={{
              background: "var(--surface)",
              border: "1px dashed var(--border-subtle)",
            }}
          >
            <span className="text-sm" style={{ color: "var(--muted-fg)" }}>
              {editNewFiles.length > 0
                ? `${editNewFiles.length}개 파일 선택됨`
                : "파일 추가"}
            </span>
            <input
              type="file"
              multiple
              onChange={(e) =>
                setEditNewFiles(Array.from(e.target.files ?? []))
              }
              className="sr-only"
            />
          </label>
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
                · {post.is_anonymous && !isAdmin ? "익명" : post.author}
                {post.is_anonymous && isAdmin && (
                  <span style={{ color: "#f59e0b", marginLeft: "2px" }}>
                    (익명)
                  </span>
                )}
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
                      setEditExistingFiles(post.files ?? []);
                      setEditNewFiles([]);
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
            {post.updated_at && (
              <span className="text-xs" style={{ color: "var(--muted-fg)" }}>
                수정됨
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <BookmarkButton boardPostId={id} />
            <button
              onClick={handleShare}
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

        {comments.filter((c) => !c.parent_id).length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted-fg)" }}>
            첫 댓글을 남겨보세요.
          </p>
        ) : (
          <div className="space-y-3">
            {comments
              .filter((c) => !c.parent_id)
              .map((c) => {
                const replies = comments.filter((r) => r.parent_id === c.id);
                return (
                  <div key={c.id}>
                    <div
                      className="rounded-lg px-3.5 py-3 space-y-1.5"
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
                          {c.is_anonymous &&
                          !isAdmin &&
                          c.user_id !== currentUserId
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
                            {new Date(c.created_at).toLocaleDateString(
                              "ko-KR",
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                          <button
                            onClick={() =>
                              setReplyingTo(replyingTo === c.id ? null : c.id)
                            }
                            className="text-xs"
                            style={{ color: "var(--primary)" }}
                          >
                            답글
                          </button>
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
                    {/* 답글 */}
                    {replies.length > 0 && (
                      <div className="ml-6 mt-1.5 space-y-1.5">
                        {replies.map((r) => (
                          <div
                            key={r.id}
                            className="rounded-lg px-3.5 py-2.5 space-y-1"
                            style={{
                              background: "var(--surface-2)",
                              border: "1px solid var(--border-subtle)",
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className="text-xs font-medium"
                                style={{ color: "var(--foreground)" }}
                              >
                                ↳{" "}
                                {r.is_anonymous &&
                                !isAdmin &&
                                r.user_id !== currentUserId
                                  ? "익명"
                                  : r.author}
                                {r.is_anonymous &&
                                  (isAdmin || r.user_id === currentUserId) && (
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
                                  {new Date(r.created_at).toLocaleDateString(
                                    "ko-KR",
                                    { month: "short", day: "numeric" },
                                  )}
                                </span>
                                {(r.user_id === currentUserId || isAdmin) && (
                                  <button
                                    onClick={() => handleDeleteComment(r.id)}
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
                              {r.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* 답글 입력 */}
                    {replyingTo === c.id && (
                      <div className="ml-6 mt-1.5 space-y-1.5">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="답글 입력..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="input-base flex-1 text-sm"
                            maxLength={1000}
                            autoFocus
                          />
                          <button
                            onClick={() => handleReplySubmit(c.id)}
                            className="btn-primary px-3 text-sm"
                            disabled={!replyText.trim()}
                          >
                            등록
                          </button>
                          <button
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText("");
                              setReplyAnon(false);
                            }}
                            className="btn-secondary px-3 text-sm"
                          >
                            취소
                          </button>
                        </div>
                        <label className="flex items-center gap-1.5 cursor-pointer w-fit">
                          <input
                            type="checkbox"
                            checked={replyAnon}
                            onChange={(e) => setReplyAnon(e.target.checked)}
                          />
                          <span
                            className="text-xs"
                            style={{ color: "var(--muted-fg)" }}
                          >
                            익명으로 달기
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
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
