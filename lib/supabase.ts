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

export type PostFile = {
  name: string;
  url: string;
  type: string;
};

export type Post = {
  id: string;
  title: string;
  content: string;
  category: "공지" | "일정" | "행사" | "동아리";
  created_at: string;
  image_url: string | null;
  author: string | null;
  files: PostFile[];
  pinned: boolean;
  view_count: number;
  scheduled_at: string | null;
};

export type BoardPost = {
  id: string;
  user_id: string;
  author: string;
  title: string;
  content: string;
  created_at: string;
  view_count: number;
  files: PostFile[];
};

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  author: string;
  content: string;
  created_at: string;
};

export type Bookmark = {
  id: string;
  user_id: string;
  post_id: string | null;
  board_post_id: string | null;
  created_at: string;
};

export type Reaction = {
  id: string;
  user_id: string;
  post_id: string | null;
  board_post_id: string | null;
  emoji: string;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  post_id: string | null;
  created_at: string;
  is_read: boolean;
};

export type Feedback = {
  id: string;
  user_id: string;
  author: string;
  content: string;
  created_at: string;
  is_read: boolean;
};

export type Profile = {
  id: string;
  name: string;
  email: string;
  student_id: string | null;
  approved: boolean;
  is_admin: boolean;
  created_at: string;
};
