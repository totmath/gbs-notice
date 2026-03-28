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
  const [lightbox, setLightbox] = useState<string | null>(null);

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
              onClick={() => setLightbox(f.url)}
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
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-2xl font-bold"
            onClick={() => setLightbox(null)}
            aria-label="닫기"
          >
            ✕
          </button>
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-full rounded-lg"
            style={{ objectFit: "contain" }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
