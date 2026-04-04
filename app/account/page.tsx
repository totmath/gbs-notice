"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  // 알림 구독
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  // 비밀번호 변경
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwStatus, setPwStatus] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);
  // 아이디 변경
  const [newUsername, setNewUsername] = useState("");
  const [idStatus, setIdStatus] = useState("");
  const [idSubmitting, setIdSubmitting] = useState(false);

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
        .select("name, student_id, email, approved")
        .eq("id", user.id)
        .single();
      if (!profile?.approved) {
        router.replace("/pending");
        return;
      }
      setName(profile.name);
      setStudentId(profile.student_id ?? "");
      setUsername(profile.email);
      setUserId(user.id);
      // 푸시 구독 상태 확인
      if ("serviceWorker" in navigator && "PushManager" in window) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setPushSubscribed(!!sub);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwStatus("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    if (newPassword.length < 6) {
      setPwStatus("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    setPwSubmitting(true);
    setPwStatus("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const email = user?.email ?? "";
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (signInError) {
      setPwStatus("현재 비밀번호가 틀렸습니다.");
      setPwSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwSubmitting(false);
    if (error) {
      setPwStatus("오류: " + error.message);
    } else {
      setPwStatus("비밀번호가 변경되었습니다.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  async function handleUsernameChange(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newUsername.trim();
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(trimmed)) {
      setIdStatus("영문, 숫자, 밑줄(_)만 사용 가능하며 3~30자여야 합니다.");
      return;
    }
    setIdSubmitting(true);
    setIdStatus("");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch("/api/update-username", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ newUsername: trimmed }),
    });
    const json = await res.json();
    setIdSubmitting(false);
    if (!res.ok) {
      setIdStatus(json.error ?? "오류가 발생했습니다.");
    } else {
      setUsername(trimmed);
      setNewUsername("");
      setIdStatus("아이디가 변경되었습니다.");
    }
  }

  async function handlePushUnsubscribe() {
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await fetch("/api/push-subscribe", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      setPushSubscribed(false);
    } finally {
      setPushLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return <p className="state-text">불러오는 중...</p>;
  }

  return (
    <div className="max-w-md mx-auto space-y-5 py-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm transition-colors"
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
          내 계정
        </h1>
      </div>

      {/* 계정 정보 카드 */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <h2
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--muted-fg)" }}
        >
          계정 정보
        </h2>
        <div className="space-y-3">
          {[
            { label: "학번", value: studentId || "—" },
            { label: "이름", value: name },
            { label: "아이디", value: username },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between py-1.5"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <span className="text-sm" style={{ color: "var(--muted-fg)" }}>
                {label}
              </span>
              <span
                className="text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 아이디 변경 카드 */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <h2
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--muted-fg)" }}
        >
          아이디 변경
        </h2>
        <form onSubmit={handleUsernameChange} className="space-y-2.5">
          <input
            type="text"
            placeholder="새 아이디"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value.replace(/\s/g, ""))}
            required
            className="input-base"
          />
          {idStatus && (
            <p
              className="text-sm px-1"
              style={{
                color: idStatus.includes("변경되었습니다")
                  ? "#34d399"
                  : "#f87171",
              }}
            >
              {idStatus}
            </p>
          )}
          <button
            type="submit"
            disabled={idSubmitting}
            className="btn-primary w-full py-2"
          >
            {idSubmitting ? "변경 중..." : "변경하기"}
          </button>
        </form>
      </div>

      {/* 비밀번호 변경 카드 */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <h2
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--muted-fg)" }}
        >
          비밀번호 변경
        </h2>
        <form onSubmit={handlePasswordChange} className="space-y-2.5">
          <input
            type="password"
            placeholder="현재 비밀번호"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="input-base"
          />
          <input
            type="password"
            placeholder="새 비밀번호"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="input-base"
          />
          <input
            type="password"
            placeholder="새 비밀번호 확인"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="input-base"
          />
          {pwStatus && (
            <p
              className="text-sm px-1"
              style={{
                color: pwStatus.includes("변경되었습니다")
                  ? "#34d399"
                  : "#f87171",
              }}
            >
              {pwStatus}
            </p>
          )}
          <button
            type="submit"
            disabled={pwSubmitting}
            className="btn-primary w-full py-2"
          >
            {pwSubmitting ? "변경 중..." : "변경하기"}
          </button>
        </form>
      </div>

      {/* 알림 구독 해제 */}
      {pushSubscribed && (
        <button
          onClick={handlePushUnsubscribe}
          disabled={pushLoading}
          className="w-full py-2.5 text-sm font-medium rounded-xl"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-subtle)",
            color: "var(--muted-fg)",
          }}
        >
          {pushLoading ? "처리 중..." : "푸시 알림 구독 해제"}
        </button>
      )}

      {/* 로그아웃 */}
      <button
        onClick={handleLogout}
        className="btn-secondary w-full py-2.5"
        style={{ borderRadius: "10px" }}
      >
        로그아웃
      </button>
    </div>
  );
}
