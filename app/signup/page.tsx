"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      setSubmitting(false);
      return;
    }

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim(),
        password,
        name: name.trim(),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "회원가입 실패");
      setSubmitting(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: `${username.trim()}@gbs.school`,
      password,
    });

    setSubmitting(false);
    if (signInError) {
      router.push("/login");
      return;
    }

    router.push("/pending");
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-7">
        <div className="text-center space-y-2">
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            회원가입
          </h1>
          <p className="text-sm" style={{ color: "var(--muted-fg)" }}>
            경기북과학고 구성원만 가입할 수 있습니다
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <input
            type="text"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="input-base"
          />
          <input
            type="text"
            placeholder="아이디 (영문·숫자·_ / 3~30자)"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            required
            className="input-base"
          />
          <input
            type="password"
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input-base"
          />
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
            {submitting ? "가입 중..." : "가입하기"}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: "var(--muted-fg)" }}>
          이미 계정이 있으신가요?{" "}
          <Link
            href="/login"
            className="font-medium transition-colors"
            style={{ color: "var(--primary)" }}
          >
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
