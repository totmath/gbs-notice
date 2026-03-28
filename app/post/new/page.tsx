"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, Post, PostFile } from "@/lib/supabase";

const CATEGORIES: Post["category"][] = ["공지", "동아리"];

async function uploadFiles(fileList: File[]): Promise<PostFile[]> {
  const uploaded: PostFile[] = [];
  for (const file of fileList) {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("post-image")
      .upload(path, file);
    if (!error) {
      const { data } = supabase.storage.from("post-image").getPublicUrl(path);
      uploaded.push({ name: file.name, url: data.publicUrl, type: file.type });
    }
  }
  return uploaded;
}

export default function NewPostPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorLabel, setAuthorLabel] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Post["category"]>("공지");
  const [files, setFiles] = useState<File[]>([]);
  const [pinned, setPinned] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function check() {
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
      if (!profile?.is_admin) {
        router.replace("/");
        return;
      }
      setAuthorLabel(
        profile.student_id
          ? `${profile.student_id} ${profile.name}`
          : profile.name,
      );
      setChecking(false);
    }
    check();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const uploadedFiles = await uploadFiles(files);
    const image_url =
      uploadedFiles.find((f) => f.type.startsWith("image/"))?.url ?? null;
    const { data: inserted, error: insertError } = await supabase
      .from("posts")
      .insert({
        title,
        content,
        category,
        image_url,
        author: authorLabel,
        files: uploadedFiles,
        pinned,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
    } else {
      // 예약 발행이면 푸시 알림 미전송
      if (!scheduledAt || new Date(scheduledAt) <= new Date()) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) return;
          fetch("/api/send-push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              title,
              body: `${category} · ${authorLabel}`,
              postId: inserted?.id,
            }),
          }).catch(() => {});
        });
      }
      router.push("/");
    }
  }

  if (checking) {
    return <p className="text-center text-slate-500 py-10">불러오는 중...</p>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-slate-400 hover:text-slate-200 text-sm">
          ← 돌아가기
        </Link>
        <h1 className="text-xl font-bold">글 올리기</h1>
      </div>

      <div className="text-sm text-slate-400 bg-slate-800 rounded-lg px-3 py-2">
        작성자: <span className="text-slate-200">{authorLabel}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
            카테고리
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Post["category"])}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
            제목 <span className="text-indigo-400">*</span>
          </label>
          <input
            type="text"
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
            내용 <span className="text-indigo-400">*</span>
          </label>
          <textarea
            placeholder="내용을 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
            첨부파일
          </label>
          <label className="flex items-center gap-2 w-full bg-slate-800 border border-slate-700 border-dashed rounded-lg px-3 py-3 cursor-pointer hover:border-indigo-500/60 transition-colors">
            <span className="text-sm text-slate-400">
              {files.length > 0
                ? `${files.length}개 파일 선택됨`
                : "파일 선택 (모든 형식)"}
            </span>
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="sr-only"
            />
          </label>
          {files.length > 0 && (
            <ul className="space-y-1 pt-1">
              {files.map((f, i) => (
                <li
                  key={i}
                  className="text-xs text-slate-400 bg-slate-800/60 rounded-md px-2.5 py-1.5"
                >
                  📎 {f.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            className="w-4 h-4 accent-indigo-500"
          />
          <span className="text-sm" style={{ color: "var(--muted-fg)" }}>
            중요 공지로 상단 고정
          </span>
        </label>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
            예약 발행 (선택)
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
          />
          {scheduledAt && (
            <p className="text-xs" style={{ color: "#f59e0b" }}>
              ⏰ {new Date(scheduledAt).toLocaleString("ko-KR")}에 공개됩니다
            </p>
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Link
            href="/"
            className="flex-1 text-center bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            {submitting ? "올리는 중..." : "올리기"}
          </button>
        </div>
      </form>
    </div>
  );
}
