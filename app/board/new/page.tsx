"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, PostFile } from "@/lib/supabase";

const MAX_FILES = 5;

async function uploadFiles(
  fileList: File[],
  token: string,
): Promise<{ files: PostFile[]; error?: string }> {
  const limited = fileList.slice(0, MAX_FILES);
  const uploaded: PostFile[] = [];
  for (const file of limited) {
    const signRes = await fetch("/api/upload-sign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ size: file.size, type: file.type }),
    });
    if (!signRes.ok) {
      const err = await signRes.json().catch(() => ({}));
      return { files: uploaded, error: err.error ?? "서명 발급 실패" };
    }
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
      uploaded.push({ name: file.name, url: data.secure_url, type: file.type });
    } else {
      const err = await res.json().catch(() => ({}));
      return { files: uploaded, error: err.error?.message ?? "업로드 실패" };
    }
  }
  const skipped = fileList.length - limited.length;
  return {
    files: uploaded,
    error:
      skipped > 0
        ? `파일은 최대 ${MAX_FILES}개까지 첨부 가능합니다.`
        : undefined,
  };
}

export default function BoardNewPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorLabel, setAuthorLabel] = useState("");
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
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
        .select("approved, name, student_id")
        .eq("id", user.id)
        .single();
      if (!profile?.approved) {
        router.replace("/pending");
        return;
      }
      setUserId(user.id);
      setAuthorLabel(
        profile.student_id
          ? `${profile.student_id} ${profile.name}`
          : profile.name,
      );
      setChecking(false);
    }
    check();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";
    const { files: uploadedFiles, error: uploadError } = await uploadFiles(
      files,
      token,
    );
    if (uploadError) {
      setError(uploadError);
      setSubmitting(false);
      return;
    }
    const { error: insertError } = await supabase.from("board_posts").insert({
      user_id: userId,
      author: authorLabel,
      title,
      content,
      files: uploadedFiles,
    });
    setSubmitting(false);
    if (insertError) setError(insertError.message);
    else router.push("/board");
  }

  if (checking) return <p className="state-text">불러오는 중...</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      <div className="flex items-center gap-3">
        <Link
          href="/board"
          className="text-sm transition-colors"
          style={{ color: "var(--muted-fg)" }}
        >
          ← 돌아가기
        </Link>
        <h1 className="text-xl font-bold">글쓰기</h1>
      </div>

      <div
        className="text-sm rounded-lg px-3 py-2"
        style={{ background: "var(--surface)", color: "var(--muted-fg)" }}
      >
        작성자:{" "}
        <span style={{ color: "var(--foreground)" }}>{authorLabel}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          className="input-base"
        />
        <textarea
          placeholder="내용을 입력하세요"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          required
          maxLength={10000}
          className="input-base resize-none"
        />

        <div className="space-y-1.5">
          <label
            className="flex items-center gap-2 w-full rounded-lg px-3 py-3 cursor-pointer transition-colors"
            style={{
              background: "var(--surface)",
              border: "1px dashed var(--border-subtle)",
            }}
          >
            <span className="text-sm" style={{ color: "var(--muted-fg)" }}>
              {files.length > 0
                ? `${files.length}개 파일 선택됨`
                : "파일 첨부 (모든 형식)"}
            </span>
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="sr-only"
            />
          </label>
          {files.length > 0 && (
            <ul className="space-y-1">
              {files.map((f, i) => (
                <li
                  key={i}
                  className="text-xs px-2.5 py-1.5 rounded-md"
                  style={{
                    background: "var(--surface)",
                    color: "var(--muted-fg)",
                  }}
                >
                  📎 {f.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p className="text-sm" style={{ color: "#f87171" }}>
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Link
            href="/board"
            className="flex-1 text-center py-2.5 text-sm font-medium rounded-lg"
            style={{
              background: "var(--surface)",
              color: "var(--muted-fg)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 btn-primary py-2.5"
          >
            {submitting ? "등록 중..." : "등록"}
          </button>
        </div>
      </form>
    </div>
  );
}
