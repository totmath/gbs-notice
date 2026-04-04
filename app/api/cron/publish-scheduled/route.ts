import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "server misconfigured" },
      { status: 500 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const now = new Date().toISOString();

  // 예약 시간이 지났고 아직 알림 미발송된 공지 조회
  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, author, category")
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", now)
    .eq("push_sent", false)
    .is("deleted_at", null);

  if (!posts || posts.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  let totalSent = 0;
  for (const post of posts) {
    // 알림 히스토리 저장
    const { data: approvedUsers } = await supabase
      .from("profiles")
      .select("id")
      .eq("approved", true);

    if (approvedUsers && approvedUsers.length > 0) {
      await supabase.from("notifications").insert(
        approvedUsers.map((u) => ({
          user_id: u.id,
          title: post.title,
          body: `${post.category} · ${post.author ?? ""}`,
          post_id: post.id,
        })),
      );
    }

    // 푸시 전송
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("subscription");

    if (subs && subs.length > 0) {
      const payload = JSON.stringify({
        title: post.title,
        body: `${post.category} · ${post.author ?? ""}`,
      });
      await Promise.allSettled(
        subs.map(({ subscription }) =>
          webpush.sendNotification(subscription, payload).catch(() => {}),
        ),
      );
      totalSent += subs.length;
    }

    // push_sent 플래그 업데이트
    await supabase.from("posts").update({ push_sent: true }).eq("id", post.id);
  }

  return NextResponse.json({ sent: totalSent, posts: posts.length });
}
