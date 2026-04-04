import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const ipAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const LIMIT = 10;
  const WINDOW = 60 * 60 * 1000;
  const entry = ipAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipAttempts.set(ip, { count: 1, resetAt: now + WINDOW });
    return true;
  }
  if (entry.count >= LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
    "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const { username, password, name, grade, class_num } = await req.json();

  if (!username || !/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    return NextResponse.json(
      {
        error:
          "아이디는 영문, 숫자, 밑줄(_)만 사용 가능하며 3~30자여야 합니다.",
      },
      { status: 400 },
    );
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json(
      { error: "비밀번호는 6자 이상이어야 합니다." },
      { status: 400 },
    );
  }

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "이름을 입력해주세요." },
      { status: 400 },
    );
  }
  if (name.trim().length > 16) {
    return NextResponse.json(
      { error: "이름은 16자 이하여야 합니다." },
      { status: 400 },
    );
  }

  if (
    grade !== null &&
    grade !== undefined &&
    ![1, 2, 3].includes(Number(grade))
  ) {
    return NextResponse.json(
      { error: "올바른 학년을 선택해주세요." },
      { status: 400 },
    );
  }
  if (
    class_num !== null &&
    class_num !== undefined &&
    ![1, 2, 3, 4, 5].includes(Number(class_num))
  ) {
    return NextResponse.json(
      { error: "올바른 반을 선택해주세요." },
      { status: 400 },
    );
  }

  const email = `${username}@gbs.school`;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: created, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError || !created.user) {
    const msg = createError?.message ?? "";
    if (msg.toLowerCase().includes("already")) {
      return NextResponse.json(
        { error: "이미 사용 중인 아이디입니다." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: msg || "회원가입 실패" },
      { status: 500 },
    );
  }

  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: created.user.id,
    name: name.trim(),
    student_id: null,
    grade: grade ?? null,
    class_num: class_num ?? null,
    email: username,
    approved: await (async () => {
      const { data } = await supabaseAdmin
        .from("settings")
        .select("value")
        .eq("key", "auto_approve")
        .single();
      return data?.value === "true";
    })(),
    can_post: true,
    can_view: true,
  });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    if (profileError.code === "23505") {
      return NextResponse.json(
        { error: "이미 사용 중인 아이디입니다." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
