import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);

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

  const { newUsername } = await req.json();
  if (!newUsername || !/^[a-zA-Z0-9_]{3,30}$/.test(newUsername)) {
    return NextResponse.json({ error: "invalid username" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 중복 확인 (profiles.email은 username만 저장, auth.email은 username@gbs.school)
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", newUsername)
    .neq("id", user.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "이미 사용 중인 아이디입니다." },
      { status: 409 },
    );
  }

  // auth 이메일 변경 (확인 없이 즉시 적용)
  const { error: updateAuthError } =
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email: `${newUsername}@gbs.school`,
    });
  if (updateAuthError) {
    return NextResponse.json(
      { error: updateAuthError.message },
      { status: 500 },
    );
  }

  // profiles 테이블 업데이트
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ email: newUsername })
    .eq("id", user.id);
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
