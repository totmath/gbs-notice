"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AdminHeaderButton() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadFeedback, setUnreadFeedback] = useState(0);

  useEffect(() => {
    async function checkUser(userId: string | undefined) {
      if (!userId) {
        setLoggedIn(false);
        setIsAdmin(false);
        return;
      }
      setLoggedIn(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userId)
        .single();
      setIsAdmin(profile?.is_admin ?? false);
    }

    supabase.auth.getUser().then(({ data: { user } }) => checkUser(user?.id));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUser(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    async function fetchCounts() {
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
      setPendingCount(pending ?? 0);
      setUnreadFeedback(feedback ?? 0);
    }

    fetchCounts();

    const channel = supabase
      .channel("pending-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchCounts(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feedback" },
        () => fetchCounts(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!loggedIn) return null;

  const btnStyle: React.CSSProperties = {
    fontSize: "0.75rem",
    color: "var(--muted-fg)",
    background: "var(--surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "6px",
    padding: "0.3rem 0.75rem",
    cursor: "pointer",
    transition: "color 0.15s",
  };

  return (
    <div className="flex items-center gap-2">
      {isAdmin && (
        <Link href="/admin" className="relative" style={btnStyle}>
          계정관리
          {pendingCount + unreadFeedback > 0 && (
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
              {pendingCount + unreadFeedback}
            </span>
          )}
        </Link>
      )}
      <Link href="/feedback" style={btnStyle}>
        건의하기
      </Link>
      <Link href="/account" style={btnStyle}>
        내 계정
      </Link>
      <button
        onClick={handleLogout}
        className="text-xs transition-colors"
        style={{ color: "var(--muted-fg)", fontSize: "0.75rem" }}
      >
        로그아웃
      </button>
    </div>
  );
}
