# 경기북과학고 공지 앱 (PWA) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 경기북과학고 학생들이 공지사항/학사일정/행사/동아리 정보를 카테고리별로 한눈에 볼 수 있는 PWA 웹앱을 만든다.

**Architecture:** Next.js 14 App Router + Supabase(DB/Auth) + next-pwa. 관리자(학생회 등)가 로그인 후 글을 올리면 전교생이 피드에서 카테고리 필터로 확인한다. Vercel로 배포한다.

**Tech Stack:** Next.js 14, TypeScript, Supabase, Tailwind CSS, next-pwa, Vercel

---

## 파일 구조

```
gbs-notice/
├── app/
│   ├── layout.tsx          # 루트 레이아웃 + PWA 메타태그
│   ├── page.tsx            # 메인 피드 (공지 목록)
│   ├── globals.css         # Tailwind 디렉티브 (create-next-app 자동 생성)
│   ├── admin/
│   │   ├── page.tsx        # 관리자 글쓰기 화면
│   │   └── login/
│   │       └── page.tsx    # 관리자 로그인
├── middleware.ts            # /admin 경로 인증 가드
├── components/
│   ├── PostCard.tsx         # 공지 카드 컴포넌트
│   └── CategoryFilter.tsx  # 카테고리 필터 버튼
├── lib/
│   └── supabase.ts         # Supabase 클라이언트 + 타입
├── public/
│   ├── manifest.json       # PWA 매니페스트
│   └── icons/              # PWA 아이콘 (192x192, 512x512)
├── .gitignore              # create-next-app 자동 생성 (.env.local 포함)
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

### Task 1: 프로젝트 초기 셋업

**Files:**

- Create: `package.json`, `next.config.js`, `tailwind.config.ts`, `tsconfig.json`

- [ ] **Step 1: Next.js 프로젝트 생성**

```bash
cd /home/tot/gbs-notice
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
```

- [ ] **Step 2: 의존성 설치**

```bash
npm install @supabase/supabase-js next-pwa
```

- [ ] **Step 3: next.config.js에 PWA 설정 추가**

`next.config.js` 전체 교체:

```js
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = withPWA(nextConfig);
```

- [ ] **Step 4: git 초기화 및 첫 커밋**

```bash
git init
git add .
git commit -m "chore: init Next.js PWA project"
```

---

### Task 2: Supabase 셋업

**Files:**

- Create: `lib/supabase.ts`

- [ ] **Step 1: Supabase 프로젝트에서 posts 테이블 생성**

Supabase 대시보드 → SQL Editor에서 실행:

```sql
create table posts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  category text not null check (category in ('공지', '일정', '행사', '동아리')),
  created_at timestamptz default now()
);

-- 최신순 정렬 쿼리를 위한 인덱스
create index posts_created_at_idx on posts(created_at desc);

-- 읽기는 누구나, 쓰기는 인증된 사용자만
alter table posts enable row level security;

create policy "public read" on posts for select using (true);
create policy "admin write" on posts for insert with check (auth.role() = 'authenticated');
create policy "admin delete" on posts for delete using (auth.role() = 'authenticated');
```

- [ ] **Step 2: .env.local 파일 생성**

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=여기에_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_anon_key
EOF
```

Supabase 대시보드 → Settings → API에서 URL과 anon key 복사

- [ ] **Step 3: Supabase 클라이언트 파일 작성**

`lib/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export type Post = {
  id: string;
  title: string;
  content: string;
  category: "공지" | "일정" | "행사" | "동아리";
  created_at: string;
};
```

- [ ] **Step 4: 커밋**

```bash
git add lib/supabase.ts .env.local
git commit -m "feat: add Supabase client and posts table schema"
```

---

### Task 3: PWA 매니페스트 및 아이콘

**Files:**

- Create: `public/manifest.json`, `public/icons/`

- [ ] **Step 1: manifest.json 작성**

`public/manifest.json`:

```json
{
  "name": "경기북과학고 공지",
  "short_name": "경북과 공지",
  "description": "경기북과학고등학교 공지사항 앱",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#6366f1",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 2: 아이콘 생성 (placeholder)**

`scripts/gen-icons.mjs` 작성:

```js
import { createCanvas } from "canvas";
import { writeFileSync, mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

for (const size of [192, 512]) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#6366f1";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${size * 0.35}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("공지", size / 2, size / 2);
  writeFileSync(`public/icons/icon-${size}.png`, canvas.toBuffer("image/png"));
  console.log(`icon-${size}.png 생성 완료`);
}
```

```bash
npm install --save-dev canvas
node --input-type=module scripts/gen-icons.mjs
# 나중에 실제 학교 로고 아이콘으로 교체 가능
# canvas 설치 실패 시: npm rebuild canvas --build-from-source
```

- [ ] **Step 3: 커밋**

```bash
git add public/
git commit -m "feat: add PWA manifest and icons"
```

---

### Task 4: 루트 레이아웃

**Files:**

- Modify: `app/layout.tsx`

- [ ] **Step 1: layout.tsx 작성**

`app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "경기북과학고 공지",
  description: "경기북과학고등학교 공지사항, 학사일정, 행사, 동아리 정보",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "경북과 공지",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <header className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-4 py-3">
          <h1 className="text-lg font-bold text-indigo-400">
            경기북과학고 공지
          </h1>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/layout.tsx
git commit -m "feat: add root layout with PWA meta tags"
```

---

### Task 5: PostCard 컴포넌트

**Files:**

- Create: `components/PostCard.tsx`

- [ ] **Step 1: PostCard 작성**

`components/PostCard.tsx`:

```tsx
import { Post } from "@/lib/supabase";

const CATEGORY_COLORS: Record<Post["category"], string> = {
  공지: "bg-red-500/20 text-red-300",
  일정: "bg-blue-500/20 text-blue-300",
  행사: "bg-green-500/20 text-green-300",
  동아리: "bg-purple-500/20 text-purple-300",
};

export default function PostCard({ post }: { post: Post }) {
  const date = new Date(post.created_at).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[post.category]}`}
        >
          {post.category}
        </span>
        <span className="text-xs text-slate-500">{date}</span>
      </div>
      <h2 className="font-semibold text-slate-100">{post.title}</h2>
      <p className="text-sm text-slate-400 whitespace-pre-wrap">
        {post.content}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add components/PostCard.tsx
git commit -m "feat: add PostCard component"
```

---

### Task 6: CategoryFilter 컴포넌트

**Files:**

- Create: `components/CategoryFilter.tsx`

- [ ] **Step 1: CategoryFilter 작성**

`components/CategoryFilter.tsx`:

```tsx
"use client";

import { Post } from "@/lib/supabase";

const CATEGORIES: Array<Post["category"] | "전체"> = [
  "전체",
  "공지",
  "일정",
  "행사",
  "동아리",
];

export default function CategoryFilter({
  selected,
  onChange,
}: {
  selected: Post["category"] | "전체";
  onChange: (cat: Post["category"] | "전체") => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap mb-4">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            selected === cat
              ? "bg-indigo-600 text-white"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add components/CategoryFilter.tsx
git commit -m "feat: add CategoryFilter component"
```

---

### Task 7: 메인 피드 페이지

**Files:**

- Modify: `app/page.tsx`

- [ ] **Step 1: 메인 피드 작성**

`app/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { supabase, Post } from "@/lib/supabase";
import PostCard from "@/components/PostCard";
import CategoryFilter from "@/components/CategoryFilter";

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [category, setCategory] = useState<Post["category"] | "전체">("전체");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setFetchError(false);
      let query = supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (category !== "전체") {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) {
        console.error(error);
        setFetchError(true);
        setLoading(false);
        return;
      }
      setPosts(data ?? []);
      setLoading(false);
    }
    load();
  }, [category]);

  return (
    <>
      <CategoryFilter selected={category} onChange={setCategory} />
      {loading ? (
        <p className="text-center text-slate-500 py-10">불러오는 중...</p>
      ) : fetchError ? (
        <p className="text-center text-red-400 py-10">
          데이터를 불러오지 못했습니다. 새로고침해주세요.
        </p>
      ) : posts.length === 0 ? (
        <p className="text-center text-slate-500 py-10">공지가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: dev 서버 실행해서 피드 동작 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 → 카테고리 필터, 빈 목록 표시 확인

- [ ] **Step 3: 커밋**

```bash
git add app/page.tsx
git commit -m "feat: add main feed page with category filter"
```

---

### Task 8: 관리자 인증 미들웨어 (middleware.ts)

**Files:**

- Create: `middleware.ts`

- [ ] **Step 1: middleware.ts 작성**

`middleware.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // /admin/login은 통과
  if (request.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

- [ ] **Step 2: 커밋**

```bash
git add middleware.ts
git commit -m "feat: add admin auth middleware"
```

---

### Task 9: 관리자 로그인 페이지 (app/admin/login/page.tsx)

**Files:**

- Create: `app/admin/login/page.tsx`

- [ ] **Step 1: 로그인 페이지 작성**

`app/admin/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError("이메일 또는 비밀번호가 틀렸습니다.");
    } else {
      router.push("/admin");
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-20">
      <h2 className="text-xl font-bold mb-6 text-center">관리자 로그인</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm"
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm"
          required
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-lg py-2 font-medium"
        >
          로그인
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Supabase에서 관리자 계정 생성**

Supabase 대시보드 → Authentication → Users → Add User
이메일/비밀번호 설정

- [ ] **Step 3: 커밋**

```bash
git add app/admin/login/page.tsx
git commit -m "feat: add admin login page"
```

---

### Task 10: 관리자 글쓰기 페이지 (app/admin/page.tsx)

**Files:**

- Create: `app/admin/page.tsx`

- [ ] **Step 1: 관리자 페이지 작성**

`app/admin/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, Post } from "@/lib/supabase";

const CATEGORIES: Post["category"][] = ["공지", "일정", "행사", "동아리"];

export default function AdminPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Post["category"]>("공지");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push("/admin/login");
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus("");
    const { error } = await supabase
      .from("posts")
      .insert({ title, content, category });
    setSubmitting(false);
    if (error) {
      setStatus("오류: " + error.message);
    } else {
      setTitle("");
      setContent("");
      setStatus("공지가 등록되었습니다!");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">공지 등록</h2>
        <button
          onClick={handleLogout}
          className="text-sm text-slate-400 hover:text-white"
        >
          로그아웃
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Post["category"])}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm"
          required
        />
        <textarea
          placeholder="내용"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm resize-none"
          required
        />
        {status && <p className="text-sm text-indigo-300">{status}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg py-2 font-medium"
        >
          {submitting ? "등록 중..." : "등록"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: 동작 확인**

```bash
npm run dev
```

`http://localhost:3000/admin/login` → 로그인 → 글 등록 → 메인 피드에서 확인

- [ ] **Step 3: 커밋**

```bash
git add app/admin/page.tsx
git commit -m "feat: add admin post creation page"
```

---

### Task 11: Vercel 배포

**Files:**

- `.env.local` → Vercel 환경변수로 등록

- [ ] **Step 1: GitHub 저장소 생성 및 push**

```bash
gh repo create gbs-notice --public --source=. --push
```

- [ ] **Step 2: Vercel 배포**

```bash
npx vercel --yes
```

환경변수 설정:

```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
npx vercel --prod
```

- [ ] **Step 3: 배포 URL 확인 및 홈화면 추가 테스트**

배포된 URL을 핸드폰에서 열고 "홈 화면에 추가" 동작 확인

- [ ] **Step 4: 최종 커밋**

```bash
git add .
git commit -m "chore: production deployment config"
```
