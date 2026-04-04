"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, Profile, Feedback } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<
    "pending" | "members" | "feedback" | "content" | "posts" | "settings"
  >("pending");
  const [autoApprove, setAutoApprove] = useState(false);
  const [savingAutoApprove, setSavingAutoApprove] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newStudentId, setNewStudentId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState(false);
  const [allPosts, setAllPosts] = useState<
    {
      id: string;
      title: string;
      author: string;
      created_at: string;
      source: "notice" | "board";
      category: string;
      is_anonymous?: boolean;
      user_id?: string | null;
      deleted_at?: string | null;
    }[]
  >([]);
  const [allComments, setAllComments] = useState<
    {
      id: string;
      content: string;
      author: string;
      created_at: string;
      source: "notice" | "board";
      post_id: string;
      user_id?: string | null;
      deleted_at?: string | null;
    }[]
  >([]);
  const [contentTab, setContentTab] = useState<"posts" | "comments">("posts");

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
        .select("approved, is_admin")
        .eq("id", user.id)
        .single();
      if (!profile?.approved) {
        router.replace("/pending");
        return;
      }
      if (!profile?.is_admin) {
        router.replace("/");
        return;
      }
      setCurrentUserId(user.id);
      await Promise.all([
        loadPending(),
        loadMembers(),
        loadFeedback(),
        loadAllPosts(),
        loadAllComments(),
        loadSettings(),
      ]);
      setLoading(false);
    }
    init();
  }, [router]);

  async function loadSettings() {
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "auto_approve")
      .single();
    if (data) setAutoApprove(data.value === "true");
  }

  async function saveAutoApprove(val: boolean) {
    setSavingAutoApprove(true);
    await supabase
      .from("settings")
      .update({ value: val ? "true" : "false" })
      .eq("key", "auto_approve");
    setAutoApprove(val);
    setSavingAutoApprove(false);
  }

  async function loadPending() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("approved", false)
      .order("created_at", { ascending: true });
    setPendingUsers(data ?? []);
  }

  async function loadMembers() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("approved", true)
      .order("created_at", { ascending: true });
    setMembers(data ?? []);
  }

  async function loadAllPosts() {
    const [{ data: notices }, { data: boards }] = await Promise.all([
      supabase
        .from("posts")
        .select("id, title, author, created_at, category, user_id, deleted_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("board_posts")
        .select(
          "id, title, author, created_at, is_anonymous, user_id, deleted_at",
        )
        .order("created_at", { ascending: false }),
    ]);
    const merged = [
      ...(notices ?? []).map((p) => ({
        ...p,
        source: "notice" as const,
        category: p.category,
      })),
      ...(boards ?? []).map((p) => ({
        ...p,
        source: "board" as const,
        category: "자유게시판",
      })),
    ].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    setAllPosts(merged);
  }

  async function loadAllComments() {
    const [{ data: noticeComments }, { data: boardComments }] =
      await Promise.all([
        supabase
          .from("comments")
          .select(
            "id, content, author, created_at, post_id, user_id, deleted_at",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("board_comments")
          .select(
            "id, content, author, created_at, post_id, user_id, deleted_at",
          )
          .order("created_at", { ascending: false }),
      ]);
    const merged = [
      ...(noticeComments ?? []).map((c) => ({
        ...c,
        source: "notice" as const,
      })),
      ...(boardComments ?? []).map((c) => ({ ...c, source: "board" as const })),
    ].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    setAllComments(merged);
  }

  async function loadFeedback() {
    const { data } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    setFeedbacks(data ?? []);
  }

  async function handleMarkRead(id: string, is_read: boolean) {
    await supabase.from("feedback").update({ is_read }).eq("id", id);
    loadFeedback();
  }

  async function handleDeleteFeedback(id: string) {
    if (!confirm("이 건의사항을 삭제할까요?")) return;
    await supabase.from("feedback").delete().eq("id", id);
    loadFeedback();
  }

  async function handleApprove(id: string) {
    await supabase.from("profiles").update({ approved: true }).eq("id", id);
    loadPending();
    loadMembers();
  }

  async function handleReject(id: string) {
    if (!confirm("이 사용자를 거절할까요?")) return;
    const pendingUser = pendingUsers.find((u) => u.id === id);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // auth 유저 삭제 (프로필도 cascade 삭제)
    await fetch("/api/delete-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ userId: id }),
    });

    loadPending();
  }

  async function handleDelete(id: string) {
    if (!confirm("이 계정을 삭제할까요?")) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    await fetch("/api/delete-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ userId: id }),
    });
    loadMembers();
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    setCreateSuccess(false);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch("/api/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        username: newUsername,
        password: newPassword,
        name: newName,
        studentId: newStudentId,
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setCreateError(data.error ?? "생성 실패");
    } else {
      setCreateSuccess(true);
      setNewUsername("");
      setNewPassword("");
      setNewName("");
      setNewStudentId("");
      loadMembers();
    }
  }

  async function handleToggleAdmin(id: string, current: boolean) {
    await supabase.from("profiles").update({ is_admin: !current }).eq("id", id);
    loadMembers();
  }

  async function handleToggleCanPost(id: string, current: boolean) {
    await supabase.from("profiles").update({ can_post: !current }).eq("id", id);
    loadMembers();
  }

  async function handleToggleCanView(id: string, current: boolean) {
    await supabase.from("profiles").update({ can_view: !current }).eq("id", id);
    loadMembers();
  }

  async function handleDeleteComment(id: string, source: "notice" | "board") {
    if (!confirm("이 댓글을 삭제할까요?")) return;
    const table = source === "notice" ? "comments" : "board_comments";
    await supabase
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    loadAllComments();
  }

  async function handleRestoreComment(id: string, source: "notice" | "board") {
    const table = source === "notice" ? "comments" : "board_comments";
    await supabase.from(table).update({ deleted_at: null }).eq("id", id);
    loadAllComments();
  }

  async function handleDeletePost(id: string, source: "notice" | "board") {
    if (!confirm("이 글을 삭제할까요?")) return;
    const now = new Date().toISOString();
    if (source === "notice") {
      await supabase.from("posts").update({ deleted_at: now }).eq("id", id);
    } else {
      await supabase
        .from("board_posts")
        .update({ deleted_at: now })
        .eq("id", id);
    }
    loadAllPosts();
  }

  async function handleRestorePost(id: string, source: "notice" | "board") {
    if (source === "notice") {
      await supabase.from("posts").update({ deleted_at: null }).eq("id", id);
    } else {
      await supabase
        .from("board_posts")
        .update({ deleted_at: null })
        .eq("id", id);
    }
    loadAllPosts();
  }

  async function handleDeleteAllNotices() {
    const first = confirm(
      "공지사항 전체를 삭제할까요?\n이 작업은 되돌릴 수 없습니다.",
    );
    if (!first) return;
    const second = confirm("정말요? 공지사항이 모두 삭제됩니다.");
    if (!second) return;
    await supabase
      .from("posts")
      .update({ deleted_at: new Date().toISOString() })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    alert("공지사항이 모두 삭제됐습니다.");
    loadAllPosts();
  }

  async function handleDeleteAllBoard() {
    const first = confirm(
      "자유게시판 글 전체를 삭제할까요?\n이 작업은 되돌릴 수 없습니다.",
    );
    if (!first) return;
    const second = confirm("정말요? 자유게시판 글이 모두 삭제됩니다.");
    if (!second) return;
    await supabase
      .from("board_posts")
      .update({ deleted_at: new Date().toISOString() })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    alert("자유게시판 글이 모두 삭제됐습니다.");
    loadAllPosts();
  }

  if (loading) {
    return <p className="state-text">불러오는 중...</p>;
  }

  return (
    <div className="max-w-lg mx-auto space-y-5 py-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="text-sm transition-colors"
          style={{ color: "var(--muted-fg)" }}
        >
          ← 돌아가기
        </Link>
        <h1
          className="text-lg font-bold"
          style={{ color: "var(--foreground)" }}
        >
          관리
        </h1>
      </div>

      {/* 탭 */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          {
            key: "pending" as const,
            label: `승인 대기${pendingUsers.length > 0 ? ` (${pendingUsers.length})` : ""}`,
          },
          { key: "members" as const, label: "회원 관리" },
          {
            key: "feedback" as const,
            label: `건의함${feedbacks.filter((f) => !f.is_read).length > 0 ? ` (${feedbacks.filter((f) => !f.is_read).length})` : ""}`,
          },
          {
            key: "posts" as const,
            label: `글 목록${allPosts.length > 0 ? ` (${allPosts.length})` : ""}`,
          },
          { key: "content" as const, label: "콘텐츠" },
          { key: "settings" as const, label: "설정" },
        ].map(({ key, label }) => (
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

      {/* 승인 대기 */}
      {tab === "pending" && (
        <div className="space-y-2">
          {pendingUsers.length > 1 && (
            <button
              onClick={async () => {
                if (
                  !confirm(
                    `대기 중인 ${pendingUsers.length}명을 전체 승인할까요?`,
                  )
                )
                  return;
                await Promise.all(
                  pendingUsers.map((u) =>
                    supabase
                      .from("profiles")
                      .update({ approved: true })
                      .eq("id", u.id),
                  ),
                );
                loadPending();
                loadMembers();
              }}
              className="w-full py-2 text-sm font-medium rounded-lg"
              style={{
                background: "rgba(52,211,153,0.1)",
                color: "#34d399",
                border: "1px solid rgba(52,211,153,0.25)",
              }}
            >
              전체 승인 ({pendingUsers.length}명)
            </button>
          )}
          {pendingUsers.length === 0 ? (
            <p className="state-text">대기 중인 사용자가 없습니다.</p>
          ) : (
            pendingUsers.map((user) => (
              <div
                key={user.id}
                className="flex justify-between items-center px-4 py-3 card"
              >
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {user.student_id
                      ? `${user.student_id} ${user.name}`
                      : user.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted-fg)" }}>
                    {user.email}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(user.id)}
                    className="text-xs px-3 py-1.5 rounded-md font-medium"
                    style={{
                      background: "rgba(52,211,153,0.12)",
                      color: "#34d399",
                      border: "1px solid rgba(52,211,153,0.25)",
                    }}
                  >
                    승인
                  </button>
                  <button
                    onClick={() => handleReject(user.id)}
                    className="text-xs px-3 py-1.5 rounded-md font-medium"
                    style={{
                      background: "rgba(248,113,113,0.1)",
                      color: "#f87171",
                      border: "1px solid rgba(248,113,113,0.22)",
                    }}
                  >
                    거절
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 회원 관리 */}
      {tab === "members" && (
        <div className="space-y-4">
          {/* 계정 생성 폼 */}
          <form
            onSubmit={handleCreateUser}
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
              계정 만들기
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="학번 (선택)"
                value={newStudentId}
                onChange={(e) => setNewStudentId(e.target.value.trim())}
                className="input-base text-sm"
              />
              <input
                type="text"
                placeholder="이름 (선택)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input-base text-sm"
              />
            </div>
            <input
              type="text"
              placeholder="아이디 *"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value.trim())}
              required
              className="input-base text-sm"
            />
            <input
              type="password"
              placeholder="비밀번호 *"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="input-base text-sm"
            />
            {createError && (
              <p className="text-xs" style={{ color: "#f87171" }}>
                {createError}
              </p>
            )}
            {createSuccess && (
              <p className="text-xs" style={{ color: "#34d399" }}>
                계정이 생성됐어요!
              </p>
            )}
            <button
              type="submit"
              disabled={creating}
              className="btn-primary w-full py-2 text-sm"
            >
              {creating ? "생성 중..." : "계정 만들기"}
            </button>
          </form>

          <div className="space-y-2">
            {members.length === 0 ? (
              <p className="state-text">회원이 없습니다.</p>
            ) : (
              members.map((user) => (
                <div
                  key={user.id}
                  className="flex justify-between items-center px-4 py-3 card"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--foreground)" }}
                      >
                        {user.student_id
                          ? `${user.student_id} ${user.name}`
                          : user.name}
                      </p>
                      {user.is_admin && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-sm font-medium"
                          style={{
                            background: "rgba(99,102,241,0.12)",
                            color: "#818cf8",
                            border: "1px solid rgba(99,102,241,0.2)",
                          }}
                        >
                          관리자
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: "var(--muted-fg)" }}>
                      {user.email}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    <button
                      onClick={() =>
                        handleToggleCanView(user.id, user.can_view ?? true)
                      }
                      className="text-xs px-2.5 py-1 rounded-md font-medium"
                      style={{
                        background:
                          (user.can_view ?? true)
                            ? "rgba(99,179,237,0.12)"
                            : "var(--surface)",
                        color:
                          (user.can_view ?? true)
                            ? "#63b3ed"
                            : "var(--muted-fg)",
                        border: `1px solid ${(user.can_view ?? true) ? "rgba(99,179,237,0.25)" : "var(--border-subtle)"}`,
                      }}
                    >
                      {(user.can_view ?? true) ? "글보기 ✓" : "글보기"}
                    </button>
                    <button
                      onClick={() =>
                        handleToggleCanPost(user.id, user.can_post)
                      }
                      className="text-xs px-2.5 py-1 rounded-md font-medium"
                      style={{
                        background: user.can_post
                          ? "rgba(52,211,153,0.12)"
                          : "var(--surface)",
                        color: user.can_post ? "#34d399" : "var(--muted-fg)",
                        border: `1px solid ${user.can_post ? "rgba(52,211,153,0.25)" : "var(--border-subtle)"}`,
                      }}
                    >
                      {user.can_post ? "글쓰기 ✓" : "글쓰기"}
                    </button>
                    {user.id !== currentUserId && (
                      <button
                        onClick={() =>
                          handleToggleAdmin(user.id, user.is_admin)
                        }
                        className="text-xs px-2.5 py-1 rounded-md font-medium"
                        style={{
                          background: "rgba(99,102,241,0.1)",
                          color: "#818cf8",
                          border: "1px solid rgba(99,102,241,0.2)",
                        }}
                      >
                        {user.is_admin ? "권한 해제" : "관리자"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-xs px-2.5 py-1 rounded-md font-medium"
                      style={{
                        background: "rgba(248,113,113,0.08)",
                        color: "#f87171",
                        border: "1px solid rgba(248,113,113,0.2)",
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 글 목록 */}
      {tab === "posts" && (
        <div className="space-y-3">
          {/* 글/댓글 서브탭 */}
          <div className="flex gap-1.5">
            {(
              [
                ["posts", "글"],
                ["comments", "댓글"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setContentTab(key)}
                className="text-sm px-3 py-1 rounded-lg font-medium transition-all"
                style={
                  contentTab === key
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

          {contentTab === "posts" && allPosts.length === 0 ? (
            <p className="state-text">글이 없습니다.</p>
          ) : (
            allPosts.map((post) => (
              <div
                key={`${post.source}-${post.id}`}
                className="flex items-start justify-between gap-3 px-4 py-3 card"
                style={post.deleted_at ? { opacity: 0.5 } : undefined}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-sm font-medium flex-shrink-0"
                      style={{
                        background:
                          post.source === "notice"
                            ? "rgba(99,102,241,0.12)"
                            : "rgba(52,211,153,0.1)",
                        color: post.source === "notice" ? "#818cf8" : "#34d399",
                        border: `1px solid ${post.source === "notice" ? "rgba(99,102,241,0.2)" : "rgba(52,211,153,0.2)"}`,
                      }}
                    >
                      {post.category}
                    </span>
                    {post.deleted_at && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-sm font-medium flex-shrink-0"
                        style={{
                          background: "rgba(248,113,113,0.1)",
                          color: "#f87171",
                          border: "1px solid rgba(248,113,113,0.2)",
                        }}
                      >
                        삭제됨
                      </span>
                    )}
                    <span
                      className="text-xs"
                      style={{ color: "var(--muted-fg)" }}
                    >
                      {post.is_anonymous
                        ? `${post.author} (익명)`
                        : (post.author ?? "익명")}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--muted-fg)" }}
                    >
                      ·{" "}
                      {new Date(post.created_at).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p
                    className="text-sm truncate"
                    style={{ color: "var(--foreground)" }}
                  >
                    {post.title}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {post.deleted_at ? (
                    <button
                      onClick={() => handleRestorePost(post.id, post.source)}
                      className="text-xs px-2.5 py-1 rounded-md font-medium"
                      style={{
                        background: "rgba(52,211,153,0.1)",
                        color: "#34d399",
                        border: "1px solid rgba(52,211,153,0.2)",
                      }}
                    >
                      복구
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDeletePost(post.id, post.source)}
                      className="text-xs px-2.5 py-1 rounded-md font-medium"
                      style={{
                        background: "rgba(248,113,113,0.08)",
                        color: "#f87171",
                        border: "1px solid rgba(248,113,113,0.2)",
                      }}
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {/* 댓글 목록 */}
          {contentTab === "comments" && (
            <div className="space-y-2">
              {allComments.length === 0 ? (
                <p className="state-text">댓글이 없습니다.</p>
              ) : (
                allComments.map((comment) => (
                  <div
                    key={`${comment.source}-${comment.id}`}
                    className="flex items-start justify-between gap-3 px-4 py-3 card"
                    style={comment.deleted_at ? { opacity: 0.5 } : undefined}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-sm font-medium flex-shrink-0"
                          style={{
                            background:
                              comment.source === "notice"
                                ? "rgba(99,102,241,0.12)"
                                : "rgba(52,211,153,0.1)",
                            color:
                              comment.source === "notice"
                                ? "#818cf8"
                                : "#34d399",
                            border: `1px solid ${comment.source === "notice" ? "rgba(99,102,241,0.2)" : "rgba(52,211,153,0.2)"}`,
                          }}
                        >
                          {comment.source === "notice" ? "공지" : "자유게시판"}
                        </span>
                        {comment.deleted_at && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-sm font-medium flex-shrink-0"
                            style={{
                              background: "rgba(248,113,113,0.1)",
                              color: "#f87171",
                              border: "1px solid rgba(248,113,113,0.2)",
                            }}
                          >
                            삭제됨
                          </span>
                        )}
                        <span
                          className="text-xs"
                          style={{ color: "var(--muted-fg)" }}
                        >
                          {comment.author}
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: "var(--muted-fg)" }}
                        >
                          ·{" "}
                          {new Date(comment.created_at).toLocaleDateString(
                            "ko-KR",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>
                      <p
                        className="text-sm"
                        style={{ color: "var(--foreground)" }}
                      >
                        {comment.content}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {comment.deleted_at ? (
                        <button
                          onClick={() =>
                            handleRestoreComment(comment.id, comment.source)
                          }
                          className="text-xs px-2.5 py-1 rounded-md font-medium"
                          style={{
                            background: "rgba(52,211,153,0.1)",
                            color: "#34d399",
                            border: "1px solid rgba(52,211,153,0.2)",
                          }}
                        >
                          복구
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            handleDeleteComment(comment.id, comment.source)
                          }
                          className="text-xs px-2.5 py-1 rounded-md font-medium"
                          style={{
                            background: "rgba(248,113,113,0.08)",
                            color: "#f87171",
                            border: "1px solid rgba(248,113,113,0.2)",
                          }}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* 콘텐츠 관리 */}
      {tab === "content" && (
        <div className="space-y-3">
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              border: "1px solid rgba(248,113,113,0.3)",
              background: "rgba(248,113,113,0.05)",
            }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#f87171" }}
            >
              위험 구역
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    학년 전환
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted-fg)" }}>
                    전체 계정 미승인 전환 (새 학년 시작 시)
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const first = confirm(
                      "학년 전환을 진행할까요?\n모든 학생 계정이 미승인 상태로 바뀝니다.",
                    );
                    if (!first) return;
                    const second = confirm("정말요? 되돌릴 수 없습니다.");
                    if (!second) return;
                    const {
                      data: { session },
                    } = await supabase.auth.getSession();
                    const res = await fetch("/api/admin/year-transition", {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${session?.access_token}`,
                      },
                    });
                    if (res.ok) {
                      alert("학년 전환 완료.");
                      loadMembers();
                    } else {
                      alert("오류가 발생했습니다.");
                    }
                  }}
                  className="text-xs px-3 py-1.5 rounded-md font-medium flex-shrink-0"
                  style={{
                    background: "rgba(248,113,113,0.12)",
                    color: "#f87171",
                    border: "1px solid rgba(248,113,113,0.3)",
                  }}
                >
                  학년 전환
                </button>
              </div>
              <div style={{ borderTop: "1px solid rgba(248,113,113,0.15)" }} />
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    공지사항 전체 삭제
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted-fg)" }}>
                    모든 공지글과 첨부파일이 삭제됩니다
                  </p>
                </div>
                <button
                  onClick={handleDeleteAllNotices}
                  className="text-xs px-3 py-1.5 rounded-md font-medium flex-shrink-0"
                  style={{
                    background: "rgba(248,113,113,0.12)",
                    color: "#f87171",
                    border: "1px solid rgba(248,113,113,0.3)",
                  }}
                >
                  전체 삭제
                </button>
              </div>
              <div style={{ borderTop: "1px solid rgba(248,113,113,0.15)" }} />
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    자유게시판 전체 삭제
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted-fg)" }}>
                    모든 자유게시판 글이 삭제됩니다
                  </p>
                </div>
                <button
                  onClick={handleDeleteAllBoard}
                  className="text-xs px-3 py-1.5 rounded-md font-medium flex-shrink-0"
                  style={{
                    background: "rgba(248,113,113,0.12)",
                    color: "#f87171",
                    border: "1px solid rgba(248,113,113,0.3)",
                  }}
                >
                  전체 삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 건의함 */}
      {tab === "feedback" && (
        <div className="space-y-2">
          {feedbacks.length === 0 ? (
            <p className="state-text">건의사항이 없습니다.</p>
          ) : (
            feedbacks.map((fb) => (
              <div
                key={fb.id}
                className="px-4 py-3 card space-y-2"
                style={
                  !fb.is_read
                    ? { borderColor: "rgba(99,102,241,0.35)" }
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {fb.author}
                    </p>
                    {!fb.is_read && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: "#6366f1", color: "#fff" }}
                      >
                        새
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: "var(--muted-fg)" }}>
                    {new Date(fb.created_at).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <p
                  className="text-sm whitespace-pre-wrap"
                  style={{ color: "var(--foreground)" }}
                >
                  {fb.content}
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleMarkRead(fb.id, !fb.is_read)}
                    className="text-xs px-2.5 py-1 rounded-md font-medium"
                    style={{
                      background: "rgba(99,102,241,0.1)",
                      color: "#818cf8",
                      border: "1px solid rgba(99,102,241,0.2)",
                    }}
                  >
                    {fb.is_read ? "읽지 않음으로" : "읽음"}
                  </button>
                  <button
                    onClick={() => handleDeleteFeedback(fb.id)}
                    className="text-xs px-2.5 py-1 rounded-md font-medium"
                    style={{
                      background: "rgba(248,113,113,0.08)",
                      color: "#f87171",
                      border: "1px solid rgba(248,113,113,0.2)",
                    }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {/* 설정 */}
      {tab === "settings" && (
        <div className="space-y-4">
          <div className="card px-4 py-4 flex items-center justify-between">
            <div>
              <p
                className="text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                자동 승인
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--muted-fg)" }}
              >
                켜면 가입 즉시 자동으로 승인됩니다
              </p>
            </div>
            <button
              onClick={() => saveAutoApprove(!autoApprove)}
              disabled={savingAutoApprove}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{
                background: autoApprove ? "#6366f1" : "var(--border-subtle)",
              }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{
                  transform: autoApprove ? "translateX(20px)" : "translateX(0)",
                }}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
