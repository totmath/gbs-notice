"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "dim" | "light";
const ORDER: Theme[] = ["dark", "dim", "light"];
const ICONS: Record<Theme, string> = { dark: "🌙", dim: "🌆", light: "☀️" };
const LABELS: Record<Theme, string> = {
  dark: "다크",
  dim: "딤",
  light: "라이트",
};

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("gbs-theme") || "dark") as Theme;
    setTheme(saved);
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
    localStorage.setItem("gbs-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <button
      onClick={cycle}
      title={`테마: ${LABELS[theme]}`}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "0.25rem 0.375rem",
        fontSize: "1rem",
        lineHeight: 1,
        borderRadius: "6px",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background =
          "var(--surface-2)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background = "none")
      }
    >
      {ICONS[theme]}
    </button>
  );
}
