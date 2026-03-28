"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PendingPage() {
  const router = useRouter();

  useEffect(() => {
    // 이미 승인된 경우 메인으로
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("approved")
        .eq("id", user.id)
        .single();
      if (profile?.approved) {
        router.push("/");
      }
    }
    check();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="max-w-sm mx-auto text-center space-y-6 py-20">
      <div className="text-4xl">⏳</div>
      <h1 className="text-xl font-bold">승인 대기 중</h1>
      <p className="text-slate-400 text-sm">
        관리자가 계정을 승인하면 공지를 볼 수 있어요.
        <br />
        잠시 기다려주세요.
      </p>
      <button
        onClick={handleLogout}
        className="text-sm text-slate-500 hover:text-slate-300 underline"
      >
        로그아웃
      </button>
    </div>
  );
}
