"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, Post } from "@/lib/supabase";

const CATEGORIES: Post["category"][] = ["공지", "일정", "행사", "동아리"];

export default function AdminPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Post["category"]>("공지");
  const [image, setImage] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [author, setAuthor] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState<Post["category"]>("공지");
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);

  async function loadPosts() {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });
    setPosts(data ?? []);
  }

  useEffect(() => {
    loadPosts();
    const saved = localStorage.getItem("gbs-author");
    if (saved) setAuthor(saved);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus("");

    let image_url: string | null = null;

    if (image) {
      const ext = image.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("post-image")
        .upload(path, image);
      if (uploadError) {
        setStatus("오류: 이미지 업로드 실패 - " + uploadError.message);
        setSubmitting(false);
        return;
      }
      const { data } = supabase.storage.from("post-image").getPublicUrl(path);
      image_url = data.publicUrl;
    }

    localStorage.setItem("gbs-author", author);
    const { error } = await supabase
      .from("posts")
      .insert({ title, content, category, image_url, author: author || null });
    setSubmitting(false);
    if (error) {
      setStatus("오류: " + error.message);
    } else {
      setTitle("");
      setContent("");
      setImage(null);
      setStatus("공지가 등록되었습니다!");
      loadPosts();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("정말 삭제할까요?")) return;
    await supabase.from("posts").delete().eq("id", id);
    loadPosts();
  }

  function startEdit(post: Post) {
    setEditingId(post.id);
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditCategory(post.category);
    setEditImage(null);
    setEditImageUrl(post.image_url);
  }

  async function handleEdit(id: string) {
    let image_url = editImageUrl;

    if (editImage) {
      const ext = editImage.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("post-image")
        .upload(path, editImage);
      if (!uploadError) {
        const { data } = supabase.storage.from("post-image").getPublicUrl(path);
        image_url = data.publicUrl;
      }
    }

    await supabase
      .from("posts")
      .update({
        title: editTitle,
        content: editContent,
        category: editCategory,
        image_url,
      })
      .eq("id", id);
    setEditingId(null);
    loadPosts();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div className="flex justify-between items-center">
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
          placeholder="작성자 이름"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm"
          required
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files?.[0] ?? null)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-400"
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

      <div>
        <h3 className="text-lg font-bold mb-3 text-slate-300">등록된 공지</h3>
        <div className="space-y-3">
          {posts.map((post) =>
            editingId === post.id ? (
              <div
                key={post.id}
                className="bg-slate-900 border border-indigo-500 rounded-xl p-4 space-y-3"
              >
                <select
                  value={editCategory}
                  onChange={(e) =>
                    setEditCategory(e.target.value as Post["category"])
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
                />
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm resize-none"
                />
                {editImageUrl && (
                  <div className="relative">
                    <img
                      src={editImageUrl}
                      alt=""
                      className="w-full rounded-lg max-h-40 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setEditImageUrl(null)}
                      className="absolute top-1 right-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded"
                    >
                      삭제
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditImage(e.target.files?.[0] ?? null)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(post.id)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 rounded-lg py-1.5 text-sm font-medium"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 rounded-lg py-1.5 text-sm"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={post.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs text-slate-500 mr-2">
                      {post.category}
                    </span>
                    <span className="text-sm font-medium">{post.title}</span>
                  </div>
                  <div className="flex gap-2 ml-2 shrink-0">
                    <button
                      onClick={() => startEdit(post)}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {post.content}
                </p>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
