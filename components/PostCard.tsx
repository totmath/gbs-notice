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
};

const BADGE_CLASS: Record<string, string> = {
  공지: "badge badge-notice",
  일정: "badge badge-schedule",
  행사: "badge badge-event",
  동아리: "badge badge-club",
  자유게시판: "badge badge-club",
};

export default function PostCard({ post }: { post: CardPost }) {
  const date = new Date(post.created_at).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });

  const isBoard = post._source === "board";
  const href = isBoard ? `/board/${post.id}` : `/post/${post.id}`;

  return (
    <Link href={href} className="block">
      <div className="card px-4 pt-3.5 pb-4 space-y-2.5 cursor-pointer">
        <div className="flex items-center gap-2.5">
          {post.pinned && (
            <span className="text-xs font-bold" style={{ color: "#f59e0b" }}>
              📌
            </span>
          )}
          <span className={BADGE_CLASS[post.category] ?? "badge"}>
            {post.category}
          </span>
          <span className="text-xs" style={{ color: "var(--muted-fg)" }}>
            {date}
          </span>
          {post.author && (
            <span className="text-xs" style={{ color: "var(--muted-fg)" }}>
              · {post.author}
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
            <p
              className="text-sm line-clamp-2 mt-1 leading-relaxed"
              style={{ color: "var(--muted-fg)" }}
            >
              {post.content}
            </p>
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
