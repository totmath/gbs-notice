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
  const [unreadNotif, setUnreadNotif] = useState(0);

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

  // 모든 로그인 유저: 알림 뱃지
  useEffect(() => {
    if (!loggedIn) return;
    async function fetchNotifCount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setUnreadNotif(count ?? 0);
    }
    fetchNotifCount();
    const channel = supabase
      .channel("notif-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        fetchNotifCount,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loggedIn]);

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

  const [panelOpen, setPanelOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!loggedIn) return null;

  const iconBtnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--muted-fg)",
    position: "relative",
    transition: "background 0.15s",
  };

  return (
    <>
      <div className="flex items-center gap-1">
        {/* 알림 벨 */}
        <Link href="/notifications" style={iconBtnStyle}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden
          >
            <path
              d="M9 2a5.5 5.5 0 0 0-5.5 5.5c0 2.5-.8 3.8-1.5 4.5h14c-.7-.7-1.5-2-1.5-4.5A5.5 5.5 0 0 0 9 2Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M7.5 14.5a1.5 1.5 0 0 0 3 0"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          {unreadNotif > 0 && (
            <span
              style={{
                position: "absolute",
                top: "2px",
                right: "2px",
                width: "8px",
                height: "8px",
                borderRadius: "9999px",
                background: "#6366f1",
                border: "1.5px solid var(--background)",
              }}
            />
          )}
        </Link>

        {/* 톱니바퀴 */}
        <button
          onClick={() => setPanelOpen(true)}
          style={iconBtnStyle}
          aria-label="설정"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden
          >
            <circle
              cx="9"
              cy="9"
              r="2.5"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path
              d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* 오버레이 */}
      <div
        aria-hidden="true"
        onClick={() => setPanelOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          transition: "opacity 0.25s",
          opacity: panelOpen ? 1 : 0,
          pointerEvents: panelOpen ? "auto" : "none",
        }}
      />

      {/* 슬라이드 패널 */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="설정"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          zIndex: 50,
          height: "100%",
          width: "100%",
          maxWidth: "320px",
          background: "var(--surface-2)",
          borderLeft: "1px solid var(--border-subtle)",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          transform: panelOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* 패널 헤더 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}
          >
            <span
              style={{
                display: "block",
                width: "4px",
                height: "20px",
                borderRadius: "9999px",
                background: "#6366f1",
              }}
            />
            <span
              style={{
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "var(--foreground)",
              }}
            >
              메뉴
            </span>
          </div>
          <button
            onClick={() => setPanelOpen(false)}
            style={{ ...iconBtnStyle, width: "28px", height: "28px" }}
            aria-label="닫기"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              aria-hidden
            >
              <path
                d="M3 3l9 9M12 3L3 12"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* 메뉴 항목 */}
        <nav
          style={{
            flex: 1,
            padding: "0.75rem 0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          {[
            { href: "/notifications", label: "알림", badge: unreadNotif },
            { href: "/feedback", label: "건의하기", badge: 0 },
            { href: "/account", label: "내 계정", badge: 0 },
          ].map(({ href, label, badge }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setPanelOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                fontSize: "0.9375rem",
                color: "var(--foreground)",
                textDecoration: "none",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--surface)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {label}
              {badge > 0 && (
                <span
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    minWidth: "18px",
                    height: "18px",
                    borderRadius: "9999px",
                    background: "#6366f1",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                  }}
                >
                  {badge}
                </span>
              )}
            </Link>
          ))}

          <div
            style={{
              borderTop: "1px solid var(--border-subtle)",
              margin: "0.5rem 0",
            }}
          />

          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              fontSize: "0.9375rem",
              color: "#f87171",
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(248,113,113,0.08)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            로그아웃
          </button>
        </nav>
      </aside>
    </>
  );
}
