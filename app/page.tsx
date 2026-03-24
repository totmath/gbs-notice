"use client";

import { useEffect, useState } from "react";
import { supabase, Post } from "@/lib/supabase";
import PostCard from "@/components/PostCard";
import CategoryFilter from "@/components/CategoryFilter";

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [category, setCategory] = useState<Post["category"] | "전체">("전체");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setFetchError(false);
      let query = supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (category !== "전체") {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) {
        console.error(error);
        setFetchError(true);
        setLoading(false);
        return;
      }
      setPosts(data ?? []);
      setLoading(false);
    }
    load();
  }, [category]);

  return (
    <>
      <CategoryFilter selected={category} onChange={setCategory} />
      {loading ? (
        <p className="text-center text-slate-500 py-10">불러오는 중...</p>
      ) : fetchError ? (
        <p className="text-center text-red-400 py-10">
          데이터를 불러오지 못했습니다. 새로고침해주세요.
        </p>
      ) : posts.length === 0 ? (
        <p className="text-center text-slate-500 py-10">공지가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </>
  );
}
