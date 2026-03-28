"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "dim" | "light";
const ORDER: Theme[] = ["dark", "dim", "light"];
const LABELS: Record<Theme, string> = {
  dark: "다크",
  dim: "딤",
  light: "라이트",
};

// SVG 아이콘 — 각 테마를 상징하는 미니멀 아이콘
function MoonIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M7.5 1.5a6 6 0 1 0 6 6 4.5 4.5 0 0 1-6-6Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunsetIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 반원 태양 */}
      <path
        d="M2.5 9a5 5 0 0 1 10 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* 수평선 */}
      <line
        x1="1"
        y1="10.5"
        x2="14"
        y2="10.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* 아랫줄 */}
      <line
        x1="3.5"
        y1="12.5"
        x2="11.5"
        y2="12.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* 광선 위 */}
      <line
        x1="7.5"
        y1="1"
        x2="7.5"
        y2="2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* 광선 좌상 */}
      <line
        x1="3.2"
        y1="3.2"
        x2="4.2"
        y2="4.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* 광선 우상 */}
      <line
        x1="11.8"
        y1="3.2"
        x2="10.8"
        y2="4.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="7.5" cy="7.5" r="2.8" fill="currentColor" />
      {/* 8방향 광선 */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 7.5 + Math.cos(rad) * 4;
        const y1 = 7.5 + Math.sin(rad) * 4;
        const x2 = 7.5 + Math.cos(rad) * 5.5;
        const y2 = 7.5 + Math.sin(rad) * 5.5;
        return (
          <line
            key={deg}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

const ICONS: Record<Theme, React.ReactNode> = {
  dark: <MoonIcon />,
  dim: <SunsetIcon />,
  light: <SunIcon />,
};

// indicator의 translateX 값 (세그먼트 너비 = 30px, 간격 = 2px)
const SEGMENT_WIDTH = 30;
const INDICATOR_OFFSET: Record<Theme, number> = {
  dark: 2,
  dim: 2 + SEGMENT_WIDTH,
  light: 2 + SEGMENT_WIDTH * 2,
};

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem("gbs-theme") || "dark") as Theme;
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
    setMounted(true);
  }, []);

  function handleSelect(next: Theme) {
    if (next === theme) return;
    setTheme(next);
    localStorage.setItem("gbs-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  // SSR hydration mismatch 방지 — 마운트 전에는 skeleton 렌더
  if (!mounted) {
    return (
      <div
        style={{
          width: 94,
          height: 34,
          borderRadius: 10,
          background: "var(--surface-2)",
          border: "1px solid var(--border-subtle)",
        }}
      />
    );
  }

  return (
    <div
      role="group"
      aria-label="테마 선택"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        height: 34,
        padding: "2px",
        borderRadius: 10,
        background: "var(--surface-2)",
        border: "1px solid var(--border-subtle)",
        gap: 0,
      }}
    >
      {/* 슬라이딩 indicator */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 2,
          left: 0,
          width: SEGMENT_WIDTH,
          height: "calc(100% - 4px)",
          borderRadius: 7,
          background: "var(--primary)",
          boxShadow: "0 0 10px rgba(99,102,241,0.45)",
          transform: `translateX(${INDICATOR_OFFSET[theme]}px)`,
          transition:
            "transform 0.22s cubic-bezier(0.4,0,0.2,1), box-shadow 0.22s",
          pointerEvents: "none",
        }}
      />

      {/* 세그먼트 버튼 3개 */}
      {ORDER.map((t) => {
        const isActive = theme === t;
        return (
          <button
            key={t}
            onClick={() => handleSelect(t)}
            title={LABELS[t]}
            aria-pressed={isActive}
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: SEGMENT_WIDTH,
              height: "100%",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              borderRadius: 7,
              color: isActive ? "#ffffff" : "var(--muted-fg)",
              transition: "color 0.18s",
              outline: "none",
              // focus-visible ring
              WebkitTapHighlightColor: "transparent",
            }}
            onFocus={(e) => {
              if (e.target.matches(":focus-visible")) {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 0 0 2px var(--primary)";
              }
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
            }}
          >
            <span
              style={{
                display: "flex",
                transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
                transform: isActive ? "scale(1.15)" : "scale(1)",
              }}
            >
              {ICONS[t]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
