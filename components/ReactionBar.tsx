"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const EMOJIS = ["👍", "❤️", "😂", "😮"];

type Props = {
  postId?: string;
  boardPostId?: string;
};

export default function ReactionBar({ postId, boardPostId }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  const col = postId ? "post_id" : "board_post_id";
  const val = postId ?? boardPostId;

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    const { data } = await supabase
      .from("reactions")
      .select("emoji, user_id")
      .eq(col, val!);

    const c: Record<string, number> = {};
    const mine = new Set<string>();
    for (const r of data ?? []) {
      c[r.emoji] = (c[r.emoji] ?? 0) + 1;
      if (r.user_id === user?.id) mine.add(r.emoji);
    }
    setCounts(c);
    setMyReactions(mine);
  }, [col, val]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(emoji: string) {
    if (!userId) return;
    if (myReactions.has(emoji)) {
      await supabase
        .from("reactions")
        .delete()
        .eq("user_id", userId)
        .eq(col, val!)
        .eq("emoji", emoji);
    } else {
      await supabase.from("reactions").insert({
        user_id: userId,
        ...(postId ? { post_id: postId } : { board_post_id: boardPostId }),
        emoji,
      });
    }
    load();
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {EMOJIS.map((emoji) => {
        const active = myReactions.has(emoji);
        const count = counts[emoji] ?? 0;
        return (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all"
            style={
              active
                ? {
                    background: "rgba(99,102,241,0.18)",
                    border: "1px solid rgba(99,102,241,0.45)",
                    color: "var(--foreground)",
                  }
                : {
                    background: "var(--surface)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--muted-fg)",
                  }
            }
          >
            <span>{emoji}</span>
            {count > 0 && (
              <span
                className="text-xs font-medium"
                style={{
                  color: active ? "var(--foreground)" : "var(--muted-fg)",
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
