"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, BoardPost } from "@/lib/supabase";
import CategoryFilter from "@/components/CategoryFilter";

const PAGE_SIZE = 15;

export default function BoardPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [commentCounts, setCommentCounts] = useState<Map<string, number>>(
    new Map(),
  );

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
        .select("approved")
        .eq("id", user.id)
        .single();
      if (!profile?.approved) {
        router.replace("/pending");
        return;
      }
      setLoggedIn(true);
      loadPosts(1, "");
    }
    init();
  }, []);

  async function loadPosts(pageNum: number, q: string, append = false) {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    let query = supabase
      .from("board_posts")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE);

    if (q) query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);

    const { data } = await query;
    const fetched = data ?? [];
    const slice = fetched.slice(0, PAGE_SIZE);
    if (append) setPosts((prev) => [...prev, ...slice]);
    else setPosts(slice);
    setHasMore(fetched.length > PAGE_SIZE);
    setLoading(false);
    setLoadingMore(false);

    // 댓글 수 fetch
    const ids = slice.map((p) => p.id);
    if (ids.length > 0) {
      supabase
        .from("board_comments")
        .select("post_id")
        .in("post_id", ids)
        .then(({ data: cd }) => {
          const map = new Map<string, number>();
          for (const r of cd ?? [])
            map.set(r.post_id, (map.get(r.post_id) ?? 0) + 1);
          setCommentCounts((prev) => new Map([...prev, ...map]));
        });
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
    loadPosts(1, searchInput);
  }

  function handleLoadMore() {
    const next = page + 1;
    setPage(next);
    loadPosts(next, search, true);
  }

  return (
    <div className="space-y-5">
      <Suspense fallback={null}>
        <CategoryFilter />
      </Suspense>
      <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
        자유게시판
      </h1>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="제목·내용 검색"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="input-base flex-1"
        />
        <button type="submit" className="btn-primary px-4">
          검색
        </button>
      </form>

      {search && (
        <p className="text-xs" style={{ color: "var(--muted-fg)" }}>
          &quot;{search}&quot; 검색 결과
          <button
            onClick={() => {
              setSearch("");
              setSearchInput("");
              setPage(1);
              loadPosts(1, "");
            }}
            className="ml-2"
            style={{ color: "var(--primary)" }}
          >
            초기화
          </button>
        </p>
      )}

      {loading ? (
        <p className="state-text">불러오는 중...</p>
      ) : posts.length === 0 ? (
        <p className="state-text">
          {search ? "검색 결과가 없습니다." : "아직 글이 없습니다."}
        </p>
      ) : (
        <div className="space-y-1.5">
          {posts.map((post) => {
            const date = new Date(post.created_at).toLocaleDateString("ko-KR", {
              month: "short",
              day: "numeric",
            });
            return (
              <Link key={post.id} href={`/board/${post.id}`} className="block">
                <div className="card px-4 py-2 cursor-pointer space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className="text-sm font-medium leading-snug flex-1 min-w-0 truncate"
                      style={{ color: "var(--foreground)" }}
                    >
                      {post.title}
                    </p>
                    <span
                      className="text-xs shrink-0"
                      style={{ color: "var(--muted-fg)" }}
                    >
                      {date}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs"
                      style={{ color: "var(--muted-fg)" }}
                    >
                      {post.is_anonymous ? "익명" : post.author}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--muted-fg)" }}
                    >
                      · 조회 {post.view_count ?? 0}
                    </span>
                    {(commentCounts.get(post.id) ?? 0) > 0 && (
                      <span
                        className="text-xs inline-flex items-center gap-0.5"
                        style={{ color: "var(--primary)" }}
                      >
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 11 11"
                          fill="none"
                          aria-hidden
                        >
                          <path
                            d="M1 1h9v7H6.5L5 9.5 3.5 8H1V1z"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {commentCounts.get(post.id)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="btn-secondary w-full py-2.5 mt-2"
            >
              {loadingMore ? "불러오는 중..." : "더 보기"}
            </button>
          )}
        </div>
      )}
      {loggedIn && (
        <button
          onClick={() => router.push("/post/new")}
          className="fixed bottom-6 right-6 z-30 flex items-center gap-1.5 text-white text-sm font-semibold px-4 py-2.5 rounded-full"
          style={{
            background: "#6366f1",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            aria-hidden
          >
            <path
              d="M7.5 1v13M1 7.5h13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          글 올리기
        </button>
      )}
    </div>
  );
}
