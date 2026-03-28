"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  postId?: string;
  boardPostId?: string;
};

export default function BookmarkButton({ postId, boardPostId }: Props) {
  const [bookmarked, setBookmarked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const col = postId ? "post_id" : "board_post_id";
      const val = postId ?? boardPostId;
      const { data } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq(col, val!)
        .maybeSingle();
      setBookmarked(!!data);
      setLoading(false);
    }
    init();
  }, [postId, boardPostId]);

  async function toggle() {
    if (!userId) return;
    const col = postId ? "post_id" : "board_post_id";
    const val = postId ?? boardPostId;
    if (bookmarked) {
      await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", userId)
        .eq(col, val!);
      setBookmarked(false);
    } else {
      await supabase.from("bookmarks").insert({
        user_id: userId,
        ...(postId ? { post_id: postId } : { board_post_id: boardPostId }),
      });
      setBookmarked(true);
    }
  }

  if (loading) return null;

  return (
    <button
      onClick={toggle}
      aria-label={bookmarked ? "북마크 해제" : "북마크"}
      className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-all"
      style={
        bookmarked
          ? {
              background: "rgba(245,158,11,0.15)",
              border: "1px solid rgba(245,158,11,0.35)",
              color: "#f59e0b",
            }
          : {
              background: "var(--surface)",
              border: "1px solid var(--border-subtle)",
              color: "var(--muted-fg)",
            }
      }
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 13 13"
        fill={bookmarked ? "currentColor" : "none"}
        aria-hidden
      >
        <path
          d="M2.5 2a1 1 0 011-1h6a1 1 0 011 1v10l-4-2.5L2.5 12V2z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
      {bookmarked ? "저장됨" : "북마크"}
    </button>
  );
}
