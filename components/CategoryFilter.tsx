"use client";

import { Post } from "@/lib/supabase";

const CATEGORIES: Array<Post["category"] | "전체"> = [
  "전체",
  "공지",
  "일정",
  "행사",
  "동아리",
];

export default function CategoryFilter({
  selected,
  onChange,
}: {
  selected: Post["category"] | "전체";
  onChange: (cat: Post["category"] | "전체") => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap mb-4">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            selected === cat
              ? "bg-indigo-600 text-white"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
