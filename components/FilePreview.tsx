"use client";

import { useState } from "react";
import { PostFile } from "@/lib/supabase";

function fileIcon(type: string) {
  if (type.startsWith("video/")) return "🎬";
  if (type.startsWith("audio/")) return "🎵";
  if (type === "application/pdf") return "📄";
  return "📎";
}

export default function FilePreview({ files }: { files: PostFile[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const images = files.filter((f) => f.type.startsWith("image/"));
  const videos = files.filter((f) => f.type.startsWith("video/"));
  const audios = files.filter((f) => f.type.startsWith("audio/"));
  const others = files.filter(
    (f) =>
      !f.type.startsWith("image/") &&
      !f.type.startsWith("video/") &&
      !f.type.startsWith("audio/"),
  );

  return (
    <div className="space-y-4">
      {/* 이미지 그리드 */}
      {images.length > 0 && (
        <div
          className={`grid gap-2 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
        >
          {images.map((f, i) => (
            <button
              key={i}
              onClick={() => setLightboxIdx(i)}
              className="overflow-hidden rounded-xl w-full"
              style={{ border: "1px solid var(--border-subtle)" }}
            >
              <img
                src={f.url}
                alt={f.name}
                className="w-full object-cover"
                style={{
                  maxHeight: images.length === 1 ? "400px" : "180px",
                  background: "var(--surface)",
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* 동영상 */}
      {videos.map((f, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl"
          style={{ border: "1px solid var(--border-subtle)" }}
        >
          <video
            src={f.url}
            controls
            className="w-full max-h-80"
            style={{ background: "#000" }}
          />
          <p
            className="text-xs px-3 py-2"
            style={{
              color: "var(--muted-fg)",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            🎬 {f.name}
          </p>
        </div>
      ))}

      {/* 오디오 */}
      {audios.map((f, i) => (
        <div
          key={i}
          className="rounded-xl px-4 py-3 space-y-1.5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <p className="text-xs" style={{ color: "var(--muted-fg)" }}>
            🎵 {f.name}
          </p>
          <audio src={f.url} controls className="w-full" />
        </div>
      ))}

      {/* 기타 파일 */}
      {others.length > 0 && (
        <div
          className="rounded-xl p-4 space-y-2.5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--muted-fg)" }}
          >
            첨부파일
          </p>
          <div className="space-y-1.5">
            {others.map((f, i) => (
              <a
                key={i}
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                download={f.name}
                className="flex items-center gap-2 text-sm transition-colors"
                style={{ color: "#818cf8" }}
              >
                <span>{fileIcon(f.type)}</span>
                {f.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 라이트박스 */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => setLightboxIdx(null)}
        >
          {/* 닫기 */}
          <button
            className="absolute top-4 right-4 flex items-center justify-center rounded-full"
            style={{
              width: 36,
              height: 36,
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
            }}
            onClick={() => setLightboxIdx(null)}
            aria-label="닫기"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* 이전 */}
          {images.length > 1 && (
            <button
              className="absolute left-3 flex items-center justify-center rounded-full"
              style={{
                width: 36,
                height: 36,
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx(
                  (lightboxIdx - 1 + images.length) % images.length,
                );
              }}
              aria-label="이전"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M10 3L5 8l5 5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}

          {/* 이미지 */}
          <img
            src={images[lightboxIdx].url}
            alt={images[lightboxIdx].name}
            className="max-w-full max-h-full rounded-lg"
            style={{
              maxWidth: "calc(100vw - 96px)",
              maxHeight: "calc(100vh - 80px)",
              objectFit: "contain",
            }}
            onClick={(e) => e.stopPropagation()}
          />

          {/* 다음 */}
          {images.length > 1 && (
            <button
              className="absolute right-3 flex items-center justify-center rounded-full"
              style={{
                width: 36,
                height: 36,
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx((lightboxIdx + 1) % images.length);
              }}
              aria-label="다음"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 3l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}

          {/* 카운터 */}
          {images.length > 1 && (
            <div
              className="absolute bottom-4 text-sm font-medium"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              {lightboxIdx + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
