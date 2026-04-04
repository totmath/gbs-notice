import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);

  // 요청자 신원 확인
  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 관리자만 푸시 전송 가능
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  const { title, body, postId } = await req.json();
  if (!title || typeof title !== "string" || title.length > 200) {
    return NextResponse.json({ error: "invalid title" }, { status: 400 });
  }
  if (body && (typeof body !== "string" || body.length > 500)) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // postId 유효성 검증
  let validPostId: string | null = null;
  if (postId != null) {
    const { data: postRow } = await supabaseAdmin
      .from("posts")
      .select("id")
      .eq("id", postId)
      .is("deleted_at", null)
      .single();
    if (!postRow) {
      return NextResponse.json({ error: "invalid postId" }, { status: 400 });
    }
    validPostId = postRow.id;
  }

  // 알림 히스토리 저장 (승인된 모든 유저)
  const { data: approvedUsers } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("approved", true);

  if (approvedUsers && approvedUsers.length > 0) {
    await supabaseAdmin.from("notifications").insert(
      approvedUsers.map((u) => ({
        user_id: u.id,
        title,
        body,
        post_id: validPostId,
      })),
    );
  }

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("subscription");

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const payload = JSON.stringify({ title, body });
  let sent = 0;
  await Promise.allSettled(
    subs.map(async ({ subscription }) => {
      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch {
        // 만료된 구독 무시
      }
    }),
  );

  return NextResponse.json({ sent });
}
