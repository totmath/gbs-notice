import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function getVerifiedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  return user;
}

export async function POST(req: NextRequest) {
  const user = await getVerifiedUser(req);
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { subscription } = await req.json();
  if (
    !subscription ||
    typeof subscription !== "object" ||
    typeof subscription.endpoint !== "string" ||
    !subscription.endpoint.startsWith("https://") ||
    typeof subscription.keys?.p256dh !== "string" ||
    typeof subscription.keys?.auth !== "string"
  ) {
    return NextResponse.json(
      { error: "invalid subscription" },
      { status: 400 },
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  await supabase
    .from("push_subscriptions")
    .upsert({ user_id: user.id, subscription }, { onConflict: "user_id" });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getVerifiedUser(req);
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  await supabase.from("push_subscriptions").delete().eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
