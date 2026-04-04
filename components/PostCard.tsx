import Link from "next/link";
import { Post } from "@/lib/supabase";

type CardPost = {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  author: string | null;
  pinned: boolean;
  image_url?: string | null;
  _source?: "notice" | "board";
  scheduled_at?: string | null;
};

const BADGE_CLASS: Record<string, string> = {
  공지: "badge badge-notice",
  일정: "badge badge-schedule",
  행사: "badge badge-event",
  동아리: "badge badge-club",
  자유게시판: "badge badge-club",
};

export default function PostCard({
  post,
  isRead = true,
  isAdmin = false,
  commentCount = 0,
}: {
  post: CardPost;
  isRead?: boolean;
  isAdmin?: boolean;
  commentCount?: number;
}) {
  const date = new Date(post.created_at).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });

  const isBoard = post._source === "board";
  const href = isBoard ? `/board/${post.id}` : `/post/${post.id}`;

  return (
    <Link href={href} className="block">
      <div className="card px-4 py-2 space-y-1 cursor-pointer">
        <div className="flex items-center gap-2.5">
          {!isRead && (
            <span
              style={{
                display: "inline-block",
                width: "7px",
                height: "7px",
                borderRadius: "9999px",
                background: "#6366f1",
                flexShrink: 0,
              }}
            />
          )}
          {post.pinned && (
            <span className="text-xs font-bold" style={{ color: "#f59e0b" }}>
              📌
            </span>
          )}
          {post.scheduled_at && new Date(post.scheduled_at) > new Date() && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded"
              style={{
                background: "rgba(245,158,11,0.12)",
                color: "#f59e0b",
              }}
            >
              예약됨
            </span>
          )}
          <span className={BADGE_CLASS[post.category] ?? "badge"}>
            {post.category}
          </span>
          <span className="text-xs" style={{ color: "var(--muted-fg)" }}>
            {date}
          </span>
          {(post.author ||
            (post as { is_anonymous?: boolean }).is_anonymous) && (
            <span className="text-xs" style={{ color: "var(--muted-fg)" }}>
              ·{" "}
              {(post as { is_anonymous?: boolean }).is_anonymous && !isAdmin
                ? "익명"
                : post.author}
              {(post as { is_anonymous?: boolean }).is_anonymous && isAdmin && (
                <span style={{ color: "#f59e0b", marginLeft: "2px" }}>
                  (익명)
                </span>
              )}
            </span>
          )}
        </div>
        <div className="flex gap-3 items-start">
          <div className="flex-1 min-w-0">
            <h2
              className="font-semibold text-sm leading-snug"
              style={{ color: "var(--foreground)" }}
            >
              {post.title}
            </h2>
            {commentCount > 0 && (
              <span
                className="text-xs mt-1 inline-flex items-center gap-0.5"
                style={{ color: "var(--primary)" }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 11 11"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M1 1h9v7H6.5L5 9.5 3.5 8H1V1z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                </svg>
                {commentCount}
              </span>
            )}
          </div>
          {"image_url" in post && post.image_url && (
            <img
              src={post.image_url}
              alt=""
              className="w-14 h-14 rounded-md object-cover shrink-0"
              style={{ border: "1px solid var(--border-subtle)" }}
            />
          )}
        </div>
      </div>
    </Link>
  );
}
