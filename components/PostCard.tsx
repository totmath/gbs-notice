import { Post } from "@/lib/supabase";

const CATEGORY_COLORS: Record<Post["category"], string> = {
  공지: "bg-red-500/20 text-red-300",
  일정: "bg-blue-500/20 text-blue-300",
  행사: "bg-green-500/20 text-green-300",
  동아리: "bg-purple-500/20 text-purple-300",
};

export default function PostCard({ post }: { post: Post }) {
  const date = new Date(post.created_at).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[post.category]}`}
        >
          {post.category}
        </span>
        <span className="text-xs text-slate-500">{date}</span>
      </div>
      <h2 className="font-semibold text-slate-100">{post.title}</h2>
      <p className="text-sm text-slate-400 whitespace-pre-wrap">
        {post.content}
      </p>
      {post.image_url && (
        <img
          src={post.image_url}
          alt=""
          className="w-full rounded-lg mt-2 max-h-80 object-cover"
        />
      )}
    </div>
  );
}
