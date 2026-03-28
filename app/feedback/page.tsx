"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function FeedbackPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [author, setAuthor] = useState("");
  const [userId, setUserId] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [done, setDone] = useState(false);

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
        .select("name, student_id, approved")
        .eq("id", user.id)
        .single();
      if (!profile?.approved) {
        router.replace("/pending");
        return;
      }
      setAuthor(
        profile.student_id
          ? `${profile.student_id} ${profile.name}`
          : profile.name,
      );
      setUserId(user.id);
      setLoading(false);
    }
    init();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setStatus("");
    const { error } = await supabase.from("feedback").insert({
      user_id: userId,
      author,
      content: content.trim(),
    });
    setSubmitting(false);
    if (error) {
      setStatus("오류가 발생했습니다. 다시 시도해주세요.");
    } else {
      setDone(true);
    }
  }

  if (loading) return <p className="state-text">불러오는 중...</p>;

  return (
    <div className="max-w-md mx-auto space-y-5 py-4">
      <div className="flex items-center gap-3">
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
          건의하기
        </h1>
      </div>

      {done ? (
        <div
          className="rounded-xl p-6 text-center space-y-3"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <p className="text-2xl">✓</p>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            건의사항이 제출되었습니다
          </p>
          <p className="text-xs" style={{ color: "var(--muted-fg)" }}>
            관리자가 확인 후 처리할 예정입니다
          </p>
          <button
            onClick={() => {
              setContent("");
              setDone(false);
            }}
            className="btn-secondary text-sm px-4 py-1.5 mt-2"
          >
            추가 건의하기
          </button>
        </div>
      ) : (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div>
            <p className="text-xs" style={{ color: "var(--muted-fg)" }}>
              작성자
            </p>
            <p
              className="text-sm font-medium mt-0.5"
              style={{ color: "var(--foreground)" }}
            >
              {author}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              placeholder="건의하실 내용을 입력해주세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              required
              className="input-base resize-none"
            />
            {status && (
              <p className="text-sm" style={{ color: "#f87171" }}>
                {status}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="btn-primary w-full py-2"
            >
              {submitting ? "제출 중..." : "제출하기"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
