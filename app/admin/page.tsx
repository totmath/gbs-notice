"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, Post } from "@/lib/supabase";

const CATEGORIES: Post["category"][] = ["공지", "일정", "행사", "동아리"];

export default function AdminPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Post["category"]>("공지");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus("");
    const { error } = await supabase
      .from("posts")
      .insert({ title, content, category });
    setSubmitting(false);
    if (error) {
      setStatus("오류: " + error.message);
    } else {
      setTitle("");
      setContent("");
      setStatus("공지가 등록되었습니다!");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">공지 등록</h2>
        <button
          onClick={handleLogout}
          className="text-sm text-slate-400 hover:text-white"
        >
          로그아웃
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Post["category"])}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm"
          required
        />
        <textarea
          placeholder="내용"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm resize-none"
          required
        />
        {status && (
          <p
            className={`text-sm ${status.startsWith("오류") ? "text-red-400" : "text-green-400"}`}
          >
            {status}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg py-2 font-medium"
        >
          {submitting ? "등록 중..." : "등록"}
        </button>
      </form>
    </div>
  );
}
