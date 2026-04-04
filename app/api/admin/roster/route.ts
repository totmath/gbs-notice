import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

async function getAdminClient(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const {
    data: { user },
    error,
  } = await supabaseAnon.auth.getUser(token);
  if (error || !user) return null;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) return null;

  return supabaseAdmin;
}

// GET: 명부 조회 (grade, classNum 필터)
export async function GET(req: NextRequest) {
  const admin = await getAdminClient(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const grade = searchParams.get("grade");
  const classNum = searchParams.get("classNum");

  let query = admin
    .from("student_roster")
    .select("id, student_id, name, claimed")
    .order("student_id");

  if (grade && classNum) {
    if (!/^\d+$/.test(grade) || !/^\d+$/.test(classNum)) {
      return NextResponse.json({ error: "invalid params" }, { status: 400 });
    }
    query = query.like("student_id", `${grade}-${classNum}-%`);
  }

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: 명부 일괄 등록
// body: { entries: [{ student_id, name }] }
export async function POST(req: NextRequest) {
  const admin = await getAdminClient(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { entries } = await req.json();
  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: "entries required" }, { status: 400 });
  }
  if (entries.length > 500) {
    return NextResponse.json({ error: "too many entries" }, { status: 400 });
  }

  const valid = entries.every(
    (e) =>
      typeof e.student_id === "string" &&
      /^\d-\d-\d{1,2}$/.test(e.student_id) &&
      typeof e.name === "string" &&
      e.name.trim().length > 0 &&
      e.name.trim().length <= 16,
  );
  if (!valid) {
    return NextResponse.json({ error: "invalid entries" }, { status: 400 });
  }

  const { error } = await admin.from("student_roster").upsert(
    entries.map((e) => ({
      student_id: e.student_id,
      name: e.name.trim().replace(/\s+/g, ""),
    })),
    { onConflict: "student_id" },
  );

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: entries.length });
}

// PATCH: student_id로 claimed 초기화 (거절 시 자동 호출)
export async function PATCH(req: NextRequest) {
  const admin = await getAdminClient(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { student_id } = await req.json();
  if (!student_id || typeof student_id !== "string") {
    return NextResponse.json({ error: "student_id required" }, { status: 400 });
  }

  await admin
    .from("student_roster")
    .update({ claimed: false })
    .eq("student_id", student_id);

  return NextResponse.json({ ok: true });
}

// DELETE: 항목 삭제 또는 claimed 초기화
// body: { id, action: "delete" | "reset" }
export async function DELETE(req: NextRequest) {
  const admin = await getAdminClient(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id, action } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (action === "reset") {
    const { error } = await admin
      .from("student_roster")
      .update({ claimed: false })
      .eq("id", id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await admin.from("student_roster").delete().eq("id", id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
