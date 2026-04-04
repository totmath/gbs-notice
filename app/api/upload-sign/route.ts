import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const uploadAttempts = new Map<string, { count: number; resetAt: number }>();

function checkUploadRateLimit(userId: string): boolean {
  const now = Date.now();
  const LIMIT = 20;
  const WINDOW = 60 * 60 * 1000; // 1시간 20회
  const entry = uploadAttempts.get(userId);
  if (!entry || now > entry.resetAt) {
    uploadAttempts.set(userId, { count: 1, resetAt: now + WINDOW });
    return true;
  }
  if (entry.count >= LIMIT) return false;
  entry.count++;
  return true;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "video/mp4",
];

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!checkUploadRateLimit(user.id)) {
    return NextResponse.json(
      { error: "업로드 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const { size, type } = await req.json();

  if (typeof size !== "number" || size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "파일 크기는 20MB 이하여야 합니다." },
      { status: 400 },
    );
  }
  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json(
      { error: "허용되지 않는 파일 형식입니다." },
      { status: 400 },
    );
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = "gbs";
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha256")
    .update(paramsToSign + process.env.CLOUDINARY_API_SECRET!)
    .digest("hex");

  return NextResponse.json({
    signature,
    timestamp,
    folder,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  });
}
