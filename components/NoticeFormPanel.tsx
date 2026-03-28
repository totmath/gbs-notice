"use client";

import { useEffect, useRef } from "react";
import { Post } from "@/lib/supabase";

const CATEGORIES: Post["category"][] = ["공지", "일정", "행사", "동아리"];

interface NoticeFormPanelProps {
  open: boolean;
  onClose: () => void;

  // 폼 상태
  title: string;
  setTitle: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
  postCategory: Post["category"];
  setPostCategory: (v: Post["category"]) => void;
  files: File[];
  setFiles: (v: File[]) => void;
  author: string;
  setAuthor: (v: string) => void;
  submitting: boolean;
  status: string;
  onSubmit: (e: React.FormEvent) => void;
}

export default function NoticeFormPanel({
  open,
  onClose,
  title,
  setTitle,
  content,
  setContent,
  postCategory,
  setPostCategory,
  files,
  setFiles,
  author,
  setAuthor,
  submitting,
  status,
  onSubmit,
}: NoticeFormPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // ESC 키로 닫기
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // 패널이 열릴 때 body 스크롤 잠금
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // 패널 열릴 때 첫 번째 입력 포커스
  useEffect(() => {
    if (open) {
      const firstInput = panelRef.current?.querySelector<HTMLElement>(
        "select, input, textarea",
      );
      firstInput?.focus();
    }
  }, [open]);

  return (
    <>
      {/* ── 배경 오버레이 ── */}
      {/* z-40: 헤더(z-10)보다 위, 패널(z-50)보다 아래 */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={[
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm",
          "transition-opacity duration-300",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        ].join(" ")}
      />

      {/* ── 사이드 패널 ── */}
      {/* z-50: 오버레이(z-40) 위, 모바일 w-full / sm 이상 max-w-md */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="공지 등록"
        style={{
          background: "var(--surface-2)",
          borderLeft: "1px solid var(--border-subtle)",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.4)",
        }}
        className={[
          "fixed top-0 right-0 z-50 h-full",
          "w-full sm:max-w-md",
          "flex flex-col",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* ── 패널 헤더 ── */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-2.5">
            {/* 인디고 엑센트 바 */}
            <span
              className="block w-1 h-5 rounded-full bg-indigo-500"
              aria-hidden="true"
            />
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              글 올리기
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="패널 닫기"
            className="flex items-center justify-center w-8 h-8 rounded-md transition-colors"
            style={{ color: "var(--muted-fg)" }}
          >
            {/* X 아이콘 (SVG, 외부 의존성 없음) */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* ── 스크롤 가능한 폼 영역 ── */}
        <form
          id="notice-form-inner"
          onSubmit={onSubmit}
          className="flex-1 overflow-y-auto px-5 py-5 space-y-4"
        >
          {/* 카테고리 */}
          <div className="space-y-1.5">
            <label
              className="block text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--muted-fg)" }}
            >
              카테고리
            </label>
            <select
              value={postCategory}
              onChange={(e) =>
                setPostCategory(e.target.value as Post["category"])
              }
              className="input-base py-2.5"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 작성자 */}
          <div className="space-y-1.5">
            <label
              className="block text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--muted-fg)" }}
            >
              작성자
            </label>
            <input
              type="text"
              placeholder="이름 입력"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="input-base py-2.5"
            />
          </div>

          {/* 제목 */}
          <div className="space-y-1.5">
            <label
              className="block text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--muted-fg)" }}
            >
              제목 <span className="text-indigo-400">*</span>
            </label>
            <input
              type="text"
              placeholder="공지 제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="input-base py-2.5"
            />
          </div>

          {/* 파일 업로드 */}
          <div className="space-y-1.5">
            <label
              className="block text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--muted-fg)" }}
            >
              첨부파일
            </label>
            <label
              className="flex items-center gap-2 w-full border border-dashed rounded-lg px-3 py-2.5 cursor-pointer transition-colors group"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="text-slate-500 group-hover:text-indigo-400 transition-colors shrink-0"
              >
                <path
                  d="M8 2v8M5 5l3-3 3 3M2 11v1a2 2 0 002 2h8a2 2 0 002-2v-1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-sm text-slate-500 group-hover:text-slate-300 transition-colors">
                {files.length > 0
                  ? `${files.length}개 파일 선택됨`
                  : "파일 선택 (모든 형식)"}
              </span>
              <input
                type="file"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                className="sr-only"
              />
            </label>
            {/* 선택된 파일 목록 */}
            {files.length > 0 && (
              <ul className="space-y-1 pt-1">
                {files.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-xs rounded-md px-2.5 py-1.5"
                    style={{
                      background: "var(--surface)",
                      color: "var(--muted-fg)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden="true"
                      className="shrink-0 text-slate-500"
                    >
                      <path
                        d="M2 1h5.5L10 3.5V11H2V1z"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7 1v3h3"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="truncate">{f.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 내용 */}
          <div className="space-y-1.5">
            <label
              className="block text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--muted-fg)" }}
            >
              내용 <span className="text-indigo-400">*</span>
            </label>
            <textarea
              placeholder="공지 내용을 입력하세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={7}
              required
              className="input-base py-2.5 resize-none"
            />
          </div>

          {/* 상태 메시지 */}
          {status && (
            <p
              role="status"
              className={`text-sm rounded-lg px-3 py-2 ${
                status.startsWith("오류")
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : "bg-green-500/10 text-green-400 border border-green-500/20"
              }`}
            >
              {status}
            </p>
          )}
        </form>

        {/* ── 패널 푸터 (항상 하단 고정) ── */}
        <div
          className="px-5 py-4 shrink-0 flex gap-3"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1 py-2.5"
          >
            취소
          </button>
          <button
            type="submit"
            form="notice-form-inner"
            disabled={submitting}
            onClick={(e) => {
              // form submit 직접 트리거
              const form = document.getElementById(
                "notice-form-inner",
              ) as HTMLFormElement | null;
              if (form) {
                e.preventDefault();
                form.requestSubmit();
              }
            }}
            className="btn-primary flex-1 py-2.5"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin w-4 h-4 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 20v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                  />
                </svg>
                등록 중...
              </span>
            ) : (
              "등록"
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
