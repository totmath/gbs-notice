"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("approved")
        .eq("id", user.id)
        .single();
      if (profile?.approved) {
        router.replace("/");
      } else {
        router.replace("/pending");
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const email = username.includes("@") ? username : `${username}@gbs.school`;

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError("아이디 또는 비밀번호가 틀렸습니다.");
      setSubmitting(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("로그인 실패");
      setSubmitting(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("approved")
      .eq("id", user.id)
      .single();

    if (!profile?.approved) {
      router.push("/pending");
    } else {
      router.push("/");
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-7">
        {/* 상단 로고 영역 */}
        <div className="text-center space-y-2">
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            로그인
          </h1>
          <p className="text-sm" style={{ color: "var(--muted-fg)" }}>
            경기북과학고 공지 시스템
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="아이디"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            required
            className="input-base"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input-base"
          />
          {error && (
            <p className="text-sm px-1" style={{ color: "#f87171" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-2.5 mt-1"
          >
            {submitting ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: "var(--muted-fg)" }}>
          계정이 없으신가요?{" "}
          <Link
            href="/signup"
            className="font-medium transition-colors"
            style={{ color: "var(--primary)" }}
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
