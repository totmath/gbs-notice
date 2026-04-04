"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
    async function autoPushSubscribe() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      if (Notification.permission === "denied") return;
      let perm: NotificationPermission = Notification.permission;
      if (perm !== "granted") {
        perm = await Notification.requestPermission();
      }
      if (perm !== "granted") return;
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        setPushGranted(true);
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await fetch("/api/push-subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      setPushGranted(true);
    }
    autoPushSubscribe();
  }, [loggedIn]);

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
  const [panelVisible, setPanelVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({});
  const [pushGranted, setPushGranted] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    try {
      setNotifPrefs(
        JSON.parse(localStorage.getItem("gbs-notif-prefs") ?? "{}"),
      );
    } catch {}
    if ("Notification" in window) {
      setPushGranted(Notification.permission === "granted");
    }
  }, []);
  const isNotifOn = (cat: string) =>
    cat === "자유게시판" ? notifPrefs[cat] === true : notifPrefs[cat] !== false;
  async function handlePushToggle() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!pushGranted && Notification.permission === "denied") {
      alert("브라우저 설정에서 알림 차단을 해제해주세요.");
      return;
    }
    setPushLoading(true);
    if (pushGranted) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await fetch("/api/push-subscribe", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({}),
      });
      setPushGranted(false);
    } else {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setPushLoading(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await fetch("/api/push-subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      setPushGranted(true);
    }
    setPushLoading(false);
  }

  const toggleNotif = (cat: string) => {
    const next = { ...notifPrefs, [cat]: !isNotifOn(cat) };
    setNotifPrefs(next);
    localStorage.setItem("gbs-notif-prefs", JSON.stringify(next));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "gbs-notif-prefs",
        newValue: JSON.stringify(next),
      }),
    );
  };

  useEffect(() => {
    if (panelOpen) {
      setPanelVisible(true);
    } else {
      const t = setTimeout(() => setPanelVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [panelOpen]);

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
            <path
              d="M7.2 1.5h3.6l.4 2c.55.2 1.05.5 1.5.87l1.9-.8 1.8 3.1-1.5 1.28c.06.28.1.57.1.85s-.04.57-.1.85l1.5 1.28-1.8 3.1-1.9-.8c-.45.37-.95.67-1.5.87l-.4 2H7.2l-.4-2a5.5 5.5 0 0 1-1.5-.87l-1.9.8-1.8-3.1 1.5-1.28A5.4 5.4 0 0 1 2.9 9c0-.28.04-.57.1-.85L1.5 6.87l1.8-3.1 1.9.8c.45-.37.95-.67 1.5-.87l.4-2Z"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            <circle
              cx="9"
              cy="9"
              r="2.3"
              stroke="currentColor"
              strokeWidth="1.3"
            />
          </svg>
        </button>
      </div>

      {mounted &&
        createPortal(
          <>
            {/* 오버레이 */}
            <div
              aria-hidden="true"
              onClick={() => setPanelOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 40,
                background: "rgba(0,0,0,0.85)",
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
              className="slide-panel"
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                zIndex: 50,
                height: "100dvh",
                width: "100%",
                maxWidth: "320px",
                display: panelVisible ? "flex" : "none",
                flexDirection: "column",
                transform: panelOpen ? "translateX(0)" : "translateX(100%)",
                transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
                willChange: "transform",
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
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.625rem",
                  }}
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
                  overflowY: "auto",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {[
                  { href: "/notifications", label: "알림", badge: unreadNotif },
                  { href: "/my-activity", label: "내 활동", badge: 0 },
                  { href: "/bookmarks", label: "북마크", badge: 0 },
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

                {/* 알림 설정 */}
                <div style={{ padding: "0.5rem 1rem 0.25rem" }}>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--muted-fg)",
                      marginBottom: "0.5rem",
                      letterSpacing: "0.05em",
                    }}
                  >
                    알림 설정
                  </p>
                  {"Notification" in
                    (typeof window !== "undefined" ? window : {}) && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.5rem 0",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--foreground)",
                        }}
                      >
                        푸시 알림
                      </span>
                      <button
                        onClick={handlePushToggle}
                        disabled={pushLoading}
                        style={{
                          width: "40px",
                          height: "22px",
                          borderRadius: "9999px",
                          border: "none",
                          cursor: "pointer",
                          background: pushGranted ? "#6366f1" : "var(--border)",
                          position: "relative",
                          transition: "background 0.2s",
                          flexShrink: 0,
                        }}
                        aria-label={`푸시 알림 ${pushGranted ? "끄기" : "켜기"}`}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: "3px",
                            left: pushGranted ? "21px" : "3px",
                            width: "16px",
                            height: "16px",
                            borderRadius: "9999px",
                            background: "#fff",
                            transition: "left 0.2s",
                          }}
                        />
                      </button>
                    </div>
                  )}
                  {(["공지", "자유게시판"] as const).map((cat) => (
                    <div
                      key={cat}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.5rem 0",
                        borderBottom:
                          cat !== "자유게시판"
                            ? "1px solid var(--border-subtle)"
                            : "none",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--foreground)",
                        }}
                      >
                        {cat}
                      </span>
                      <button
                        onClick={() => toggleNotif(cat)}
                        style={{
                          width: "40px",
                          height: "22px",
                          borderRadius: "9999px",
                          border: "none",
                          cursor: "pointer",
                          background: isNotifOn(cat)
                            ? "#6366f1"
                            : "var(--border)",
                          position: "relative",
                          transition: "background 0.2s",
                          flexShrink: 0,
                        }}
                        aria-label={`${cat} 알림 ${isNotifOn(cat) ? "끄기" : "켜기"}`}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: "3px",
                            left: isNotifOn(cat) ? "21px" : "3px",
                            width: "16px",
                            height: "16px",
                            borderRadius: "9999px",
                            background: "#fff",
                            transition: "left 0.2s",
                          }}
                        />
                      </button>
                    </div>
                  ))}
                </div>

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
                    (e.currentTarget.style.background =
                      "rgba(248,113,113,0.08)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  로그아웃
                </button>
              </nav>
            </aside>
          </>,
          document.body,
        )}
    </>
  );
}
