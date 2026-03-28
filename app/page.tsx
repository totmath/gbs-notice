"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, Post, PostFile, BoardPost } from "@/lib/supabase";
import PostCard from "@/components/PostCard";
import CategoryFilter from "@/components/CategoryFilter";
import NoticeFormPanel from "@/components/NoticeFormPanel";

type FeedItem =
  | (Post & { _source: "notice" })
  | (BoardPost & { _source: "board"; category: "자유게시판"; pinned: false });

const CATEGORIES: Post["category"][] = ["공지", "동아리"];
const PAGE_SIZE = 10;

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

function Feed() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category =
    (searchParams.get("category") as Post["category"] | "전체") ?? "전체";

  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminBadge, setAdminBadge] = useState(0);
  const [noticeExpanded, setNoticeExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  // 공지 등록 폼
  const [readNoticeIds, setReadNoticeIds] = useState<Set<string>>(new Set());
  const [readKey, setReadKey] = useState("gbs-read-notices");

  // 공지 등록 폼
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postCategory, setPostCategory] = useState<Post["category"]>("공지");
  const [files, setFiles] = useState<File[]>([]);
  const [author, setAuthor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  // 수정
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState<Post["category"]>("공지");
  const [editPinned, setEditPinned] = useState(false);
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [editExistingFiles, setEditExistingFiles] = useState<PostFile[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("gbs-author");
    if (saved) setAuthor(saved);
  }, []);

  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  useEffect(() => {
    if (!bottomRef.current || !hasMore) return;
    const el = bottomRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingMoreRef.current) {
          handleLoadMore();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, page, search]);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("approved, is_admin")
        .eq("id", user.id)
        .single();
      if (!profile?.approved) {
        router.push("/pending");
        return;
      }
      const adminStatus = profile.is_admin ?? false;
      setIsAdmin(adminStatus);
      if (adminStatus) {
        const [{ count: pending }, { count: feedback }] = await Promise.all([
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("approved", false),
          supabase
            .from("feedback")
            .select("*", { count: "exact", head: true })
            .eq("is_read", false),
        ]);
        setAdminBadge((pending ?? 0) + (feedback ?? 0));
      }
      const key = `gbs-read-notices-${user.id}`;
      setReadKey(key);
      const readSaved = localStorage.getItem(key);
      if (readSaved) {
        try {
          setReadNoticeIds(new Set(JSON.parse(readSaved)));
        } catch {}
      } else {
        setReadNoticeIds(new Set());
      }
      setSearch("");
      setSearchInput("");
      setPage(1);
      await loadPosts(1, "", false, adminStatus);
    }
    init();
  }, [category]);

  async function loadPosts(
    pageNum: number,
    q: string,
    append = false,
    admin = isAdmin,
  ) {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    setFetchError(false);

    if (category !== "전체") {
      // 공지 전용 카테고리
      let query = supabase
        .from("posts")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE);
      query = query.eq("category", category);
      if (!admin) {
        const now = new Date().toISOString();
        query = query.or(`scheduled_at.is.null,scheduled_at.lte.${now}`);
      }
      if (q) query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) {
        setFetchError(true);
        setLoading(false);
        setLoadingMore(false);
        return;
      }
      const fetched = (data ?? []).map((p) => ({
        ...p,
        _source: "notice" as const,
      }));
      if (append) setPosts((prev) => [...prev, ...fetched.slice(0, PAGE_SIZE)]);
      else setPosts(fetched.slice(0, PAGE_SIZE));
      setHasMore(fetched.length > PAGE_SIZE);
    } else {
      // 전체: 공지 + 자유게시판 합산
      let noticeQ = supabase.from("posts").select("*");
      if (!admin) {
        const now = new Date().toISOString();
        noticeQ = noticeQ.or(`scheduled_at.is.null,scheduled_at.lte.${now}`);
      }
      let boardQ = supabase.from("board_posts").select("*");
      if (q) {
        noticeQ = noticeQ.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
        boardQ = boardQ.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
      }
      const [{ data: noticeData, error: ne }, { data: boardData, error: be }] =
        await Promise.all([noticeQ, boardQ]);
      if (ne || be) {
        setFetchError(true);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const notices: FeedItem[] = (noticeData ?? []).map((p) => ({
        ...p,
        _source: "notice" as const,
      }));
      const boards: FeedItem[] = (boardData ?? []).map((p) => ({
        ...p,
        _source: "board" as const,
        category: "자유게시판" as const,
        pinned: false as const,
      }));

      const merged = [...notices, ...boards].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        const aNotice = a.category === "공지" ? 1 : 0;
        const bNotice = b.category === "공지" ? 1 : 0;
        if (aNotice !== bNotice) return bNotice - aNotice;
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      const start = (pageNum - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      const slice = merged.slice(start, end);
      if (append) setPosts((prev) => [...prev, ...slice]);
      else setPosts(slice);
      setHasMore(merged.length > end);
    }

    setLoading(false);
    setLoadingMore(false);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus("");
    const uploadedFiles = await uploadFiles(files);
    const image_url =
      uploadedFiles.find((f) => f.type.startsWith("image/"))?.url ?? null;
    localStorage.setItem("gbs-author", author);
    const { error } = await supabase.from("posts").insert({
      title,
      content,
      category: postCategory,
      image_url,
      author: author || null,
      files: uploadedFiles,
    });
    setSubmitting(false);
    if (error) {
      setStatus("오류: " + error.message);
    } else {
      setTitle("");
      setContent("");
      setFiles([]);
      setStatus("등록되었습니다!");
      setShowForm(false);
      loadPosts(1, search);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("정말 삭제할까요?")) return;
    await supabase.from("posts").delete().eq("id", id);
    loadPosts(1, search);
  }

  function startEdit(post: FeedItem) {
    setEditingId(post.id);
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditCategory(
      (post.category === "자유게시판"
        ? "공지"
        : post.category) as Post["category"],
    );
    setEditPinned(post.pinned ?? false);
    setEditFiles([]);
    setEditExistingFiles(post.files ?? []);
  }

  async function handleEdit(id: string) {
    const newFiles = await uploadFiles(editFiles);
    const allFiles = [...editExistingFiles, ...newFiles];
    const image_url =
      allFiles.find((f) => f.type.startsWith("image/"))?.url ?? null;
    await supabase
      .from("posts")
      .update({
        title: editTitle,
        content: editContent,
        category: editCategory,
        image_url,
        files: allFiles,
        pinned: editPinned,
      })
      .eq("id", id);
    setEditingId(null);
    loadPosts(1, search);
  }

  return (
    <>
      {/* 검색 */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
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
        <p className="text-xs mb-4" style={{ color: "var(--muted-fg)" }}>
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

      {isAdmin && (
        <>
          <button
            onClick={() => router.push("/admin")}
            className="fixed right-6 z-30 flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-full"
            style={{
              bottom: "5rem",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              color: "var(--foreground)",
            }}
          >
            계정관리
            {adminBadge > 0 && (
              <span
                className="absolute flex items-center justify-center text-white font-bold"
                style={{
                  top: "-6px",
                  right: "-6px",
                  fontSize: "9px",
                  minWidth: "15px",
                  height: "15px",
                  borderRadius: "9999px",
                  background: "#f87171",
                  padding: "0 3px",
                }}
              >
                {adminBadge}
              </span>
            )}
          </button>
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
        </>
      )}

      <NoticeFormPanel
        open={showForm}
        onClose={() => setShowForm(false)}
        title={title}
        setTitle={setTitle}
        content={content}
        setContent={setContent}
        postCategory={postCategory}
        setPostCategory={setPostCategory}
        files={files}
        setFiles={setFiles}
        author={author}
        setAuthor={setAuthor}
        submitting={submitting}
        status={status}
        onSubmit={handleSubmit}
      />

      {loading ? (
        <p className="state-text">불러오는 중...</p>
      ) : fetchError ? (
        <p className="state-text" style={{ color: "#f87171" }}>
          데이터를 불러오지 못했습니다. 새로고침해주세요.
        </p>
      ) : posts.length === 0 ? (
        <p className="state-text">
          {search ? "검색 결과가 없습니다." : "공지가 없습니다."}
        </p>
      ) : (
        <div className="space-y-2.5">
          {/* 전체 탭에서 공지 묶음 박스 */}
          {category === "전체" &&
            (() => {
              const noticePosts = posts.filter((p) => p.category === "공지");
              const otherPosts = posts.filter((p) => p.category !== "공지");
              const unreadCount = noticePosts.filter(
                (p) => !readNoticeIds.has(p.id),
              ).length;
              return (
                <>
                  {noticePosts.length > 0 && (
                    <div
                      className="card overflow-hidden"
                      style={{ borderColor: "rgba(99,102,241,0.3)" }}
                    >
                      <button
                        onClick={() =>
                          setNoticeExpanded((v) => {
                            const next = !v;
                            if (next) {
                              const ids = noticePosts.map((p) => p.id);
                              setReadNoticeIds((prev) => {
                                const updated = new Set([...prev, ...ids]);
                                localStorage.setItem(
                                  readKey,
                                  JSON.stringify([...updated]),
                                );
                                return updated;
                              });
                            }
                            return next;
                          })
                        }
                        className="w-full flex items-center justify-between px-4 py-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="badge badge-notice">공지</span>
                          <span
                            className="text-sm font-medium"
                            style={{ color: "var(--foreground)" }}
                          >
                            공지사항 {noticePosts.length}개
                          </span>
                          {unreadCount > 0 && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                              style={{
                                background: "#ef4444",
                                color: "#fff",
                                lineHeight: 1,
                              }}
                            >
                              새 공지 {unreadCount}
                            </span>
                          )}
                        </div>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          style={{
                            color: "var(--muted-fg)",
                            transform: noticeExpanded
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                            transition: "transform 0.2s",
                          }}
                        >
                          <path
                            d="M2 4.5l5 5 5-5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      {noticeExpanded && (
                        <div
                          style={{
                            borderTop: "1px solid var(--border-subtle)",
                          }}
                        >
                          {noticePosts.map((post) => (
                            <div
                              key={post.id}
                              className="relative"
                              style={{
                                borderBottom: "1px solid var(--border-subtle)",
                              }}
                            >
                              <PostCard post={post} />
                              {isAdmin && (
                                <div className="absolute top-3 right-3 flex gap-1.5">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      startEdit(post);
                                    }}
                                    className="text-xs px-2 py-0.5 rounded-sm font-medium"
                                    style={{
                                      color: "#818cf8",
                                      background: "rgba(99,102,241,0.1)",
                                      border: "1px solid rgba(99,102,241,0.2)",
                                    }}
                                  >
                                    수정
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleDelete(post.id);
                                    }}
                                    className="text-xs px-2 py-0.5 rounded-sm font-medium"
                                    style={{
                                      color: "#f87171",
                                      background: "rgba(248,113,113,0.08)",
                                      border: "1px solid rgba(248,113,113,0.2)",
                                    }}
                                  >
                                    삭제
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {otherPosts.map((post) =>
                    editingId === post.id ? (
                      <div
                        key={post.id}
                        className="card p-4 space-y-3"
                        style={{ borderColor: "rgba(99,102,241,0.4)" }}
                      >
                        <select
                          value={editCategory}
                          onChange={(e) =>
                            setEditCategory(e.target.value as Post["category"])
                          }
                          className="input-base"
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
                          className="input-base"
                        />
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={4}
                          className="input-base resize-none"
                        />
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={editPinned}
                            onChange={(e) => setEditPinned(e.target.checked)}
                            className="w-4 h-4 accent-indigo-500"
                          />
                          <span
                            className="text-sm"
                            style={{ color: "var(--muted-fg)" }}
                          >
                            중요 공지 상단 고정
                          </span>
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(post.id)}
                            className="btn-primary flex-1 py-1.5"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="btn-secondary flex-1 py-1.5"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={post.id} className="relative">
                        <PostCard post={post} />
                        {isAdmin && post._source === "notice" && (
                          <div className="absolute top-3 right-3 flex gap-1.5">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                startEdit(post);
                              }}
                              className="text-xs px-2 py-0.5 rounded-sm font-medium"
                              style={{
                                color: "#818cf8",
                                background: "rgba(99,102,241,0.1)",
                                border: "1px solid rgba(99,102,241,0.2)",
                              }}
                            >
                              수정
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleDelete(post.id);
                              }}
                              className="text-xs px-2 py-0.5 rounded-sm font-medium"
                              style={{
                                color: "#f87171",
                                background: "rgba(248,113,113,0.08)",
                                border: "1px solid rgba(248,113,113,0.2)",
                              }}
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </>
              );
            })()}

          {/* 전체 탭 아닌 경우 기존 렌더링 */}
          {category !== "전체" &&
            posts.map((post) =>
              editingId === post.id ? (
                <div
                  key={post.id}
                  className="card p-4 space-y-3"
                  style={{ borderColor: "rgba(99, 102, 241, 0.4)" }}
                >
                  <select
                    value={editCategory}
                    onChange={(e) =>
                      setEditCategory(e.target.value as Post["category"])
                    }
                    className="input-base"
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
                    className="input-base"
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    className="input-base resize-none"
                  />
                  {editExistingFiles.length > 0 && (
                    <div className="space-y-1">
                      <p
                        className="text-xs font-medium"
                        style={{ color: "var(--muted-fg)" }}
                      >
                        첨부파일
                      </p>
                      {editExistingFiles.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs"
                        >
                          <span style={{ color: "var(--foreground)" }}>
                            📎 {f.name}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setEditExistingFiles((prev) =>
                                prev.filter((_, j) => j !== i),
                              )
                            }
                            className="text-xs"
                            style={{ color: "#f87171" }}
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input
                    type="file"
                    multiple
                    onChange={(e) =>
                      setEditFiles(Array.from(e.target.files ?? []))
                    }
                    className="input-base text-xs"
                    style={{ color: "var(--muted-fg)" }}
                  />
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editPinned}
                      onChange={(e) => setEditPinned(e.target.checked)}
                      className="w-4 h-4 accent-indigo-500"
                    />
                    <span
                      className="text-sm"
                      style={{ color: "var(--muted-fg)" }}
                    >
                      중요 공지 상단 고정
                    </span>
                  </label>
                  {editFiles.length > 0 && (
                    <ul
                      className="text-xs space-y-1"
                      style={{ color: "var(--muted-fg)" }}
                    >
                      {editFiles.map((f, i) => (
                        <li key={i}>📎 {f.name}</li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(post.id)}
                      className="btn-primary flex-1 py-1.5"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="btn-secondary flex-1 py-1.5"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div key={post.id} className="relative">
                  <PostCard post={post} />
                  {isAdmin && (
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          startEdit(post);
                        }}
                        className="text-xs px-2 py-0.5 rounded-sm font-medium"
                        style={{
                          color: "#818cf8",
                          background: "rgba(99, 102, 241, 0.1)",
                          border: "1px solid rgba(99, 102, 241, 0.2)",
                        }}
                      >
                        수정
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleDelete(post.id);
                        }}
                        className="text-xs px-2 py-0.5 rounded-sm font-medium"
                        style={{
                          color: "#f87171",
                          background: "rgba(248, 113, 113, 0.08)",
                          border: "1px solid rgba(248, 113, 113, 0.2)",
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              ),
            )}
          <div ref={bottomRef} className="py-3 text-center">
            {loadingMore && (
              <p className="text-sm" style={{ color: "var(--muted-fg)" }}>
                불러오는 중...
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <CategoryFilter />
      </Suspense>
      <Suspense fallback={<p className="state-text">불러오는 중...</p>}>
        <Feed />
      </Suspense>
    </>
  );
}
