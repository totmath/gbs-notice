"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, Notification } from "@/lib/supabase";

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

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

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setNotifications(data ?? []);

      // 전체 읽음 처리
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      setLoading(false);
    }
    init();
  }, [router]);

  async function handleDelete(id: string) {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  async function handleClearAll() {
    if (!confirm("알림을 모두 삭제할까요?")) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    setNotifications([]);
  }

  if (loading) return <p className="state-text">불러오는 중...</p>;

  return (
    <div className="max-w-lg mx-auto space-y-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm"
            style={{ color: "var(--muted-fg)" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden
            >
              <path
                d="M8.5 2L4 7l4.5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            돌아가기
          </Link>
          <h1
            className="text-lg font-bold"
            style={{ color: "var(--foreground)" }}
          >
            알림
          </h1>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs"
            style={{ color: "var(--muted-fg)" }}
          >
            전체 삭제
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="state-text">알림이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="px-4 py-3 rounded-xl flex items-start gap-3"
              style={{
                background: "var(--surface)",
                border: `1px solid ${!n.is_read ? "rgba(99,102,241,0.35)" : "var(--border-subtle)"}`,
              }}
            >
              <div className="flex-1 min-w-0">
                {n.post_id ? (
                  <Link href={`/post/${n.post_id}`}>
                    <p
                      className="text-sm font-semibold leading-snug"
                      style={{ color: "var(--foreground)" }}
                    >
                      {n.title}
                    </p>
                    <p
                      className="text-xs mt-0.5 line-clamp-2"
                      style={{ color: "var(--muted-fg)" }}
                    >
                      {n.body}
                    </p>
                  </Link>
                ) : (
                  <>
                    <p
                      className="text-sm font-semibold leading-snug"
                      style={{ color: "var(--foreground)" }}
                    >
                      {n.title}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--muted-fg)" }}
                    >
                      {n.body}
                    </p>
                  </>
                )}
                <p
                  className="text-xs mt-1.5"
                  style={{ color: "var(--muted-fg)" }}
                >
                  {new Date(n.created_at).toLocaleDateString("ko-KR", {
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                onClick={() => handleDelete(n.id)}
                className="text-xs shrink-0 mt-0.5"
                style={{ color: "var(--muted-fg)" }}
                aria-label="삭제"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
