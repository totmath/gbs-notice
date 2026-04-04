"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  boardPostId: string;
};

export default function VoteBar({ boardPostId }: Props) {
  const [upCount, setUpCount] = useState(0);
  const [downCount, setDownCount] = useState(0);
  const [myVote, setMyVote] = useState<"up" | "down" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    const { data } = await supabase
      .from("reactions")
      .select("emoji, user_id")
      .eq("board_post_id", boardPostId)
      .in("emoji", ["up", "down"]);

    let up = 0,
      down = 0;
    let mine: "up" | "down" | null = null;
    for (const r of data ?? []) {
      if (r.emoji === "up") up++;
      else if (r.emoji === "down") down++;
      if (r.user_id === user?.id) mine = r.emoji as "up" | "down";
    }
    setUpCount(up);
    setDownCount(down);
    setMyVote(mine);
  }, [boardPostId]);

  useEffect(() => {
    load();
  }, [load]);

  async function vote(type: "up" | "down") {
    if (!userId) return;

    if (myVote === type) {
      // 취소
      await supabase
        .from("reactions")
        .delete()
        .eq("user_id", userId)
        .eq("board_post_id", boardPostId)
        .eq("emoji", type);
    } else {
      // 기존 반대 투표 제거 후 새로 추가
      if (myVote) {
        await supabase
          .from("reactions")
          .delete()
          .eq("user_id", userId)
          .eq("board_post_id", boardPostId)
          .eq("emoji", myVote);
      }
      await supabase.from("reactions").insert({
        user_id: userId,
        board_post_id: boardPostId,
        emoji: type,
      });
    }
    load();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => vote("up")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all"
        style={
          myVote === "up"
            ? {
                background: "rgba(99,102,241,0.18)",
                border: "1px solid rgba(99,102,241,0.45)",
                color: "#818cf8",
              }
            : {
                background: "var(--surface)",
                border: "1px solid var(--border-subtle)",
                color: "var(--muted-fg)",
              }
        }
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M7 2l5 5H8.5v5h-3V7H2L7 2z"
            fill={myVote === "up" ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
        <span>추천</span>
        {upCount > 0 && (
          <span className="text-xs font-semibold">{upCount}</span>
        )}
      </button>

      <button
        onClick={() => vote("down")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all"
        style={
          myVote === "down"
            ? {
                background: "rgba(248,113,113,0.12)",
                border: "1px solid rgba(248,113,113,0.4)",
                color: "#f87171",
              }
            : {
                background: "var(--surface)",
                border: "1px solid var(--border-subtle)",
                color: "var(--muted-fg)",
              }
        }
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M7 12L2 7h3.5V2h3v5H12L7 12z"
            fill={myVote === "down" ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
        <span>비추천</span>
        {downCount > 0 && (
          <span className="text-xs font-semibold">{downCount}</span>
        )}
      </button>
    </div>
  );
}
