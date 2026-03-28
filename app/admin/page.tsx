"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, Profile, Feedback } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"pending" | "members" | "feedback">("pending");
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
      await Promise.all([loadPending(), loadMembers(), loadFeedback()]);
      setLoading(false);
    }
    init();
  }, [router]);

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
    await supabase.from("profiles").delete().eq("id", id);
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

  async function handleToggleAdmin(id: string, current: boolean) {
    await supabase.from("profiles").update({ is_admin: !current }).eq("id", id);
    loadMembers();
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
          계정 관리
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
                <div className="flex gap-1.5">
                  {user.id !== currentUserId && (
                    <button
                      onClick={() => handleToggleAdmin(user.id, user.is_admin)}
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
    </div>
  );
}
