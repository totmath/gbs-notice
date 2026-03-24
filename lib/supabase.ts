import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export type Post = {
  id: string;
  title: string;
  content: string;
  category: "공지" | "일정" | "행사" | "동아리";
  created_at: string;
};
