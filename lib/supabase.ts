import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    if (!_client) {
      _client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
    }
    const val = (_client as unknown as Record<string, unknown>)[prop as string];
    return typeof val === "function" ? val.bind(_client) : val;
  },
});

export type Post = {
  id: string;
  title: string;
  content: string;
  category: "공지" | "일정" | "행사" | "동아리";
  created_at: string;
  image_url: string | null;
  author: string | null;
};
