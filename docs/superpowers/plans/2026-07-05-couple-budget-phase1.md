# 부부 가계부 1단계 구현 계획 (Couple Budget — Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 부부 두 사람이 각자 폰(PWA)에서 PIN으로 진입해 지출/수입을 기록하고, 이번 달 요약과 내역을 실시간으로 함께 보는 가계부 앱 1단계를 완성한다.

**Architecture:** React PWA(프론트) + Supabase(Postgres/Auth/Realtime/RLS). 정식 회원가입 없이, 앱이 하나의 공유 Supabase 계정으로 자동 로그인한 뒤 공용 PIN 게이트와 남편/아내 정체성 선택으로 진입한다. 모든 데이터는 공유 계정 소유의 단일 데이터셋이며 RLS로 외부 접근을 차단한다. 실시간 동기화로 두 폰이 같은 내역을 본다.

**Tech Stack:** React 18 + Vite + TypeScript, Tailwind CSS, vite-plugin-pwa, @supabase/supabase-js, @tanstack/react-query, react-router-dom, Vitest + @testing-library/react (테스트), Vercel(배포).

## Global Constraints

- 통화: 원(KRW), 금액은 정수(소수점 없음). 표시는 `₩` 접두 + 천단위 콤마.
- 언어/문구: 모든 UI 텍스트는 한국어.
- 정체성 값: `who`/`role` 은 문자열 리터럴 `'husband' | 'wife'` 만 사용.
- 거래 유형: `type` 은 `'expense' | 'income'` 만 사용.
- 색상 규칙(토스풍): 배경 흰색, 포인트 파랑 `#3182F6`, 지출 텍스트 진회색 `#191F28`, 수입 텍스트 파랑 `#3182F6`, 보조 텍스트 회색 `#8B95A1`, 카드 배경 `#F2F4F6`, 라운드 `rounded-2xl`.
- 비밀값(Supabase URL/anon key, 공유계정 이메일/비번)은 `.env`(gitignore)로 관리, 코드에 하드코딩 금지.
- 날짜 저장은 `date` 컬럼에 `YYYY-MM-DD` 문자열(로컬 기준), 시각은 `created_at` timestamptz.
- 커밋 메시지 말미에 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` 포함.

---

## 파일 구조 (생성/수정 대상)

```
account/                         (repo 루트 = /Users/cosmos/Desktop/예산 프로그램)
├─ index.html
├─ package.json
├─ vite.config.ts               PWA·별칭 설정
├─ tailwind.config.js
├─ postcss.config.js
├─ tsconfig.json
├─ vitest.config.ts
├─ .env.example                 필요한 환경변수 목록 (커밋)
├─ .env                          실제 값 (gitignore)
├─ supabase/
│  └─ schema.sql                테이블·시드·RLS (Supabase SQL 에디터에 붙여넣음)
├─ src/
│  ├─ main.tsx                  진입점, QueryClient, Router
│  ├─ App.tsx                   부트 게이트(자동로그인→PIN→정체성) + 라우팅
│  ├─ index.css                 Tailwind + 토스풍 토큰
│  ├─ lib/
│  │  ├─ supabase.ts            Supabase 클라이언트 + 공유계정 자동로그인
│  │  ├─ format.ts              통화 포맷
│  │  ├─ date.ts                월 범위·표시 유틸
│  │  ├─ summary.ts             월 요약 계산
│  │  ├─ grouping.ts            날짜별 그룹핑
│  │  ├─ pin.ts                 PIN 해시(Web Crypto)
│  │  └─ identity.ts            localStorage 정체성/PIN상태
│  ├─ types.ts                  공용 타입
│  ├─ hooks/
│  │  ├─ useCategories.ts
│  │  ├─ usePaymentMethods.ts
│  │  ├─ useTransactions.ts
│  │  └─ useRealtime.ts
│  ├─ components/
│  │  ├─ BottomNav.tsx
│  │  ├─ TransactionSheet.tsx
│  │  ├─ TransactionRow.tsx
│  │  └─ AmountText.tsx
│  ├─ screens/
│  │  ├─ PinGate.tsx
│  │  ├─ IdentityPick.tsx
│  │  ├─ HomeScreen.tsx
│  │  ├─ LedgerScreen.tsx
│  │  └─ SettingsScreen.tsx
│  └─ test/
│     └─ setup.ts
```

---

## Task 1: 프로젝트 스캐폴드 (Vite + React + TS + Tailwind + PWA)

**Files:**
- Create: `package.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `.env.example`
- Create: `public/icon-192.png`, `public/icon-512.png` (PWA 아이콘 임시)

**Interfaces:**
- Produces: 실행 가능한 Vite 개발 서버, `@/` → `src/` 별칭, Tailwind 사용 가능, PWA manifest.

- [ ] **Step 1: Vite 프로젝트 생성**

Run:
```bash
cd "/Users/cosmos/Desktop/예산 프로그램"
npm create vite@latest . -- --template react-ts
```
프롬프트에서 현재 디렉터리에 생성/기존 파일 유지 선택. 그 뒤:
```bash
npm install
```

- [ ] **Step 2: 의존성 설치**

Run:
```bash
npm install @supabase/supabase-js @tanstack/react-query react-router-dom
npm install -D tailwindcss@3 postcss autoprefixer vite-plugin-pwa \
  vitest @testing-library/react @testing-library/jest-dom jsdom @types/node
npx tailwindcss init -p
```

- [ ] **Step 3: `tailwind.config.js` 작성**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#3182F6',
        ink: '#191F28',
        sub: '#8B95A1',
        card: '#F2F4F6',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 4: `src/index.css` 교체**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; }
body {
  background: #fff;
  color: #191F28;
  font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', Roboto, sans-serif;
  -webkit-tap-highlight-color: transparent;
}
```

- [ ] **Step 5: `vite.config.ts` 작성 (별칭 + PWA)**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '우리집 가계부',
        short_name: '가계부',
        theme_color: '#3182F6',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
```

- [ ] **Step 6: PWA 아이콘 임시 생성**

Run (파란 사각형 임시 아이콘):
```bash
cd "/Users/cosmos/Desktop/예산 프로그램"
printf '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" rx="96" fill="#3182F6"/><text x="256" y="330" font-size="260" text-anchor="middle" fill="#fff">₩</text></svg>' > public/icon.svg
# SVG를 PNG로 변환할 도구가 없으면, 우선 SVG를 아이콘으로도 등록 가능. macOS는 qlmanage/sips 사용:
sips -s format png public/icon.svg --out public/icon-512.png 2>/dev/null || cp public/icon.svg public/icon-512.png
sips -z 192 192 public/icon-512.png --out public/icon-192.png 2>/dev/null || cp public/icon.svg public/icon-192.png
```
(변환 실패 시 임시로 SVG를 복사해두고, Task 11에서 실제 아이콘으로 교체.)

- [ ] **Step 7: `src/App.tsx` 최소 버전으로 교체**

```tsx
export default function App() {
  return <div className="p-6 text-xl font-bold">우리집 가계부</div>
}
```

- [ ] **Step 8: `.env.example` 작성**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SHARED_EMAIL=
VITE_SHARED_PASSWORD=
```

- [ ] **Step 9: 개발 서버 실행 확인**

Run:
```bash
npm run dev
```
Expected: 로컬 주소에서 "우리집 가계부"가 흰 배경에 표시됨. 폰에서 같은 와이파이로 접속(`--host`) 시 "홈 화면에 추가" 가능.

- [ ] **Step 10: 커밋**

```bash
git add -A
git commit -m "chore: Vite+React+TS+Tailwind+PWA 스캐폴드

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Supabase 스키마 · 시드 · RLS

**Files:**
- Create: `supabase/schema.sql`

**Interfaces:**
- Produces: 테이블 `app_settings`, `profiles`, `categories`, `payment_methods`, `transactions`. RLS: 인증된(공유계정) 사용자만 전체 CRUD 가능, 익명 접근 차단.

- [ ] **Step 1: `supabase/schema.sql` 작성**

```sql
-- ===== 테이블 =====
create table app_settings (
  id int primary key default 1,
  pin_hash text,
  constraint one_row check (id = 1)
);

create table profiles (
  role text primary key check (role in ('husband','wife')),
  display_name text not null
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default '💸',
  type text not null check (type in ('expense','income')),
  is_fixed boolean not null default false,
  sort_order int not null default 0
);

create table payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default '💳',
  sort_order int not null default 0
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  who text not null check (who in ('husband','wife')),
  type text not null check (type in ('expense','income')),
  amount bigint not null check (amount >= 0),
  category_id uuid references categories(id) on delete set null,
  payment_method_id uuid references payment_methods(id) on delete set null,
  date date not null,
  memo text not null default '',
  created_at timestamptz not null default now()
);
create index transactions_date_idx on transactions(date);

-- ===== 시드 =====
insert into app_settings (id, pin_hash) values (1, null);

insert into profiles (role, display_name) values
  ('husband','남편'), ('wife','아내');

insert into categories (name, icon, type, is_fixed, sort_order) values
  ('식비','🍚','expense',false,1),
  ('교통','🚕','expense',false,2),
  ('생활','🛒','expense',false,3),
  ('주거','🏠','expense',true,4),
  ('여가','🎬','expense',false,5),
  ('의료','💊','expense',false,6),
  ('고정비','💳','expense',true,7),
  ('월급','💰','income',false,1),
  ('기타수입','💵','income',false,2);

insert into payment_methods (name, icon, sort_order) values
  ('신용카드','💳',1), ('체크카드','🏧',2), ('현금','💵',3), ('계좌이체','🏦',4);

-- ===== RLS: 인증 사용자만 전체 접근 =====
alter table app_settings enable row level security;
alter table profiles enable row level security;
alter table categories enable row level security;
alter table payment_methods enable row level security;
alter table transactions enable row level security;

create policy auth_all on app_settings for all to authenticated using (true) with check (true);
create policy auth_all on profiles for all to authenticated using (true) with check (true);
create policy auth_all on categories for all to authenticated using (true) with check (true);
create policy auth_all on payment_methods for all to authenticated using (true) with check (true);
create policy auth_all on transactions for all to authenticated using (true) with check (true);
```

- [ ] **Step 2: Supabase에 적용**

Supabase 대시보드 → SQL Editor → 위 `schema.sql` 전체 붙여넣기 → Run.
Expected: 5개 테이블 생성, 에러 없음. Table Editor에서 시드 데이터 확인.

- [ ] **Step 3: 공유 인증 계정 생성**

Supabase 대시보드 → Authentication → Users → Add user →
이메일(예: `couple@ourhome.app`), 비밀번호 지정, "Auto Confirm User" 체크.
이 값을 `.env`의 `VITE_SHARED_EMAIL`, `VITE_SHARED_PASSWORD`에 기입.
프로젝트 Settings → API 에서 URL·anon key를 `.env`에 기입.

- [ ] **Step 4: 커밋**

```bash
git add supabase/schema.sql
git commit -m "feat: Supabase 스키마·시드·RLS 정의

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 공용 타입 · Supabase 클라이언트 · 자동 로그인

**Files:**
- Create: `src/types.ts`, `src/lib/supabase.ts`
- Create: `vitest.config.ts`, `src/test/setup.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `Role = 'husband'|'wife'`, `TxType = 'expense'|'income'`, `Category`, `PaymentMethod`, `Transaction` 인터페이스.
  - `supabase.ts`: `supabase`(SupabaseClient), `ensureSignedIn(): Promise<void>` — 세션 없으면 공유계정으로 로그인.

- [ ] **Step 1: `vitest.config.ts` 작성**

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], globals: true },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
```

- [ ] **Step 2: `src/test/setup.ts` 작성**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 3: `package.json`에 test 스크립트 추가**

`scripts`에 추가:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: `src/types.ts` 작성**

```ts
export type Role = 'husband' | 'wife'
export type TxType = 'expense' | 'income'

export interface Category {
  id: string
  name: string
  icon: string
  type: TxType
  is_fixed: boolean
  sort_order: number
}

export interface PaymentMethod {
  id: string
  name: string
  icon: string
  sort_order: number
}

export interface Transaction {
  id: string
  who: Role
  type: TxType
  amount: number
  category_id: string | null
  payment_method_id: string | null
  date: string // YYYY-MM-DD
  memo: string
  created_at: string
}
```

- [ ] **Step 5: `src/lib/supabase.ts` 작성**

```ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
})

export async function ensureSignedIn(): Promise<void> {
  const { data } = await supabase.auth.getSession()
  if (data.session) return
  const { error } = await supabase.auth.signInWithPassword({
    email: import.meta.env.VITE_SHARED_EMAIL as string,
    password: import.meta.env.VITE_SHARED_PASSWORD as string,
  })
  if (error) throw error
}
```

- [ ] **Step 6: 타입 컴파일 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat: 공용 타입 + Supabase 클라이언트 + 자동 로그인

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 순수 유틸 (통화·날짜·요약·그룹핑) — TDD

**Files:**
- Create: `src/lib/format.ts`, `src/lib/date.ts`, `src/lib/summary.ts`, `src/lib/grouping.ts`
- Test: `src/lib/format.test.ts`, `src/lib/date.test.ts`, `src/lib/summary.test.ts`, `src/lib/grouping.test.ts`

**Interfaces:**
- Produces:
  - `formatKRW(n: number): string` — 예: `formatKRW(5600)` → `"₩5,600"`.
  - `monthKey(year:number, month:number): string` → `"2026-07"`; `inMonth(date:string, year, month): boolean`; `formatDayHeader(date:string): string` → `"7월 5일 (토)"`.
  - `computeSummary(txs: Transaction[]): { income:number; expense:number; remaining:number }`.
  - `groupByDate(txs: Transaction[]): { date:string; items: Transaction[] }[]` — 날짜 내림차순.

- [ ] **Step 1: `src/lib/format.test.ts` 작성 (실패 테스트)**

```ts
import { describe, it, expect } from 'vitest'
import { formatKRW } from './format'

describe('formatKRW', () => {
  it('천단위 콤마와 ₩', () => {
    expect(formatKRW(5600)).toBe('₩5,600')
    expect(formatKRW(3000000)).toBe('₩3,000,000')
    expect(formatKRW(0)).toBe('₩0')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/format.test.ts`
Expected: FAIL (formatKRW 미정의)

- [ ] **Step 3: `src/lib/format.ts` 구현**

```ts
export function formatKRW(n: number): string {
  return '₩' + Math.round(n).toLocaleString('ko-KR')
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/format.test.ts`
Expected: PASS

- [ ] **Step 5: `src/lib/date.test.ts` 작성**

```ts
import { describe, it, expect } from 'vitest'
import { monthKey, inMonth, formatDayHeader } from './date'

describe('date utils', () => {
  it('monthKey는 2자리 월', () => {
    expect(monthKey(2026, 7)).toBe('2026-07')
    expect(monthKey(2026, 12)).toBe('2026-12')
  })
  it('inMonth', () => {
    expect(inMonth('2026-07-05', 2026, 7)).toBe(true)
    expect(inMonth('2026-08-01', 2026, 7)).toBe(false)
  })
  it('formatDayHeader', () => {
    expect(formatDayHeader('2026-07-05')).toBe('7월 5일 (토)')
  })
})
```

- [ ] **Step 6: 실패 확인 → `src/lib/date.ts` 구현**

Run: `npx vitest run src/lib/date.test.ts` (FAIL 확인 후 구현)
```ts
export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function inMonth(date: string, year: number, month: number): boolean {
  return date.startsWith(monthKey(year, month))
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토']
export function formatDayHeader(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const w = WEEK[new Date(y, m - 1, d).getDay()]
  return `${m}월 ${d}일 (${w})`
}
```
Run 재실행: PASS

- [ ] **Step 7: `src/lib/summary.test.ts` 작성 → 구현**

Test:
```ts
import { describe, it, expect } from 'vitest'
import { computeSummary } from './summary'
import type { Transaction } from '@/types'

const tx = (p: Partial<Transaction>): Transaction => ({
  id: '1', who: 'husband', type: 'expense', amount: 0,
  category_id: null, payment_method_id: null, date: '2026-07-01',
  memo: '', created_at: '', ...p,
})

describe('computeSummary', () => {
  it('수입-지출=남은돈', () => {
    const r = computeSummary([
      tx({ type: 'income', amount: 3000000 }),
      tx({ type: 'expense', amount: 5600 }),
      tx({ type: 'expense', amount: 12000 }),
    ])
    expect(r.income).toBe(3000000)
    expect(r.expense).toBe(17600)
    expect(r.remaining).toBe(2982400)
  })
  it('빈 배열은 0', () => {
    expect(computeSummary([])).toEqual({ income: 0, expense: 0, remaining: 0 })
  })
})
```
구현 `src/lib/summary.ts`:
```ts
import type { Transaction } from '@/types'

export function computeSummary(txs: Transaction[]) {
  let income = 0, expense = 0
  for (const t of txs) {
    if (t.type === 'income') income += t.amount
    else expense += t.amount
  }
  return { income, expense, remaining: income - expense }
}
```
Run: `npx vitest run src/lib/summary.test.ts` → PASS

- [ ] **Step 8: `src/lib/grouping.test.ts` 작성 → 구현**

Test:
```ts
import { describe, it, expect } from 'vitest'
import { groupByDate } from './grouping'
import type { Transaction } from '@/types'

const tx = (id: string, date: string): Transaction => ({
  id, who: 'husband', type: 'expense', amount: 100,
  category_id: null, payment_method_id: null, date, memo: '', created_at: '',
})

describe('groupByDate', () => {
  it('날짜별 묶고 내림차순', () => {
    const g = groupByDate([tx('a','2026-07-01'), tx('b','2026-07-05'), tx('c','2026-07-01')])
    expect(g.map(x => x.date)).toEqual(['2026-07-05', '2026-07-01'])
    expect(g[1].items.map(i => i.id)).toEqual(['a', 'c'])
  })
})
```
구현 `src/lib/grouping.ts`:
```ts
import type { Transaction } from '@/types'

export function groupByDate(txs: Transaction[]) {
  const map = new Map<string, Transaction[]>()
  for (const t of txs) {
    if (!map.has(t.date)) map.set(t.date, [])
    map.get(t.date)!.push(t)
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, items]) => ({ date, items }))
}
```
Run: `npx vitest run src/lib/grouping.test.ts` → PASS

- [ ] **Step 9: 전체 테스트 + 커밋**

Run: `npx vitest run`
Expected: 모든 테스트 PASS
```bash
git add -A
git commit -m "feat: 통화·날짜·요약·그룹핑 유틸 (TDD)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: PIN 해시 · 정체성 저장 — TDD

**Files:**
- Create: `src/lib/pin.ts`, `src/lib/identity.ts`
- Test: `src/lib/pin.test.ts`, `src/lib/identity.test.ts`

**Interfaces:**
- Produces:
  - `hashPin(pin: string): Promise<string>` — SHA-256 hex.
  - `getIdentity(): Role | null`, `setIdentity(r: Role): void`, `isPinOk(): boolean`, `setPinOk(v: boolean): void` (localStorage 기반).

- [ ] **Step 1: `src/lib/pin.test.ts` 작성**

```ts
import { describe, it, expect } from 'vitest'
import { hashPin } from './pin'

describe('hashPin', () => {
  it('동일 입력 동일 해시, 64자 hex', async () => {
    const a = await hashPin('1234')
    const b = await hashPin('1234')
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(await hashPin('0000')).not.toBe(a)
  })
})
```

- [ ] **Step 2: 실패 확인 → `src/lib/pin.ts` 구현**

Run: `npx vitest run src/lib/pin.test.ts` (FAIL)
```ts
export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}
```
Run: PASS

- [ ] **Step 3: `src/lib/identity.test.ts` 작성**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { getIdentity, setIdentity, isPinOk, setPinOk } from './identity'

beforeEach(() => localStorage.clear())

describe('identity storage', () => {
  it('정체성 저장/조회', () => {
    expect(getIdentity()).toBeNull()
    setIdentity('wife')
    expect(getIdentity()).toBe('wife')
  })
  it('PIN 상태', () => {
    expect(isPinOk()).toBe(false)
    setPinOk(true)
    expect(isPinOk()).toBe(true)
  })
})
```

- [ ] **Step 4: 실패 확인 → `src/lib/identity.ts` 구현**

```ts
import type { Role } from '@/types'

const K_ID = 'who', K_PIN = 'pin_ok'

export function getIdentity(): Role | null {
  const v = localStorage.getItem(K_ID)
  return v === 'husband' || v === 'wife' ? v : null
}
export function setIdentity(r: Role): void { localStorage.setItem(K_ID, r) }
export function isPinOk(): boolean { return localStorage.getItem(K_PIN) === '1' }
export function setPinOk(v: boolean): void {
  if (v) localStorage.setItem(K_PIN, '1'); else localStorage.removeItem(K_PIN)
}
```
Run: `npx vitest run src/lib/identity.test.ts` → PASS

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: PIN 해시 + 정체성 저장 유틸 (TDD)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: 데이터 훅 (categories / payment_methods / transactions)

**Files:**
- Create: `src/hooks/useCategories.ts`, `src/hooks/usePaymentMethods.ts`, `src/hooks/useTransactions.ts`

**Interfaces:**
- Consumes: `supabase` (Task 3), 타입 (Task 3).
- Produces:
  - `useCategories()` → `{ data: Category[] }`; `useAddCategory()`, `useUpdateCategory()`, `useDeleteCategory()` (mutation).
  - `usePaymentMethods()` → `{ data: PaymentMethod[] }`; add/delete mutation.
  - `useTransactions(year, month)` → `{ data: Transaction[] }`; `useAddTransaction()`, `useUpdateTransaction()`, `useDeleteTransaction()`.
  - mutation은 성공 시 관련 쿼리 무효화.

- [ ] **Step 1: `src/hooks/useCategories.ts` 작성**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/types'

const KEY = ['categories']

export function useCategories() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase.from('categories')
        .select('*').order('type').order('sort_order')
      if (error) throw error
      return data as Category[]
    },
  })
}

export function useAddCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (c: Omit<Category, 'id'>) => {
      const { error } = await supabase.from('categories').insert(c)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (c: Partial<Category> & { id: string }) => {
      const { id, ...rest } = c
      const { error } = await supabase.from('categories').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
```

- [ ] **Step 2: `src/hooks/usePaymentMethods.ts` 작성**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PaymentMethod } from '@/types'

const KEY = ['payment_methods']

export function usePaymentMethods() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<PaymentMethod[]> => {
      const { data, error } = await supabase.from('payment_methods')
        .select('*').order('sort_order')
      if (error) throw error
      return data as PaymentMethod[]
    },
  })
}

export function useAddPaymentMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: Omit<PaymentMethod, 'id'>) => {
      const { error } = await supabase.from('payment_methods').insert(p)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payment_methods').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
```

- [ ] **Step 3: `src/hooks/useTransactions.ts` 작성**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { monthKey } from '@/lib/date'
import type { Transaction } from '@/types'

export type NewTx = Omit<Transaction, 'id' | 'created_at'>

const monthQueryKey = (y: number, m: number) => ['transactions', monthKey(y, m)]

export function useTransactions(year: number, month: number) {
  return useQuery({
    queryKey: monthQueryKey(year, month),
    queryFn: async (): Promise<Transaction[]> => {
      const prefix = monthKey(year, month)
      const { data, error } = await supabase.from('transactions')
        .select('*')
        .gte('date', `${prefix}-01`)
        .lte('date', `${prefix}-31`)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Transaction[]
    },
  })
}

export function useAddTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (t: NewTx) => {
      const { error } = await supabase.from('transactions').insert(t)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (t: Partial<Transaction> & { id: string }) => {
      const { id, ...rest } = t
      const { error } = await supabase.from('transactions').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}
```

- [ ] **Step 4: 컴파일 확인 + 커밋**

Run: `npx tsc --noEmit` → 에러 없음
```bash
git add -A
git commit -m "feat: categories/payment_methods/transactions 데이터 훅

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: 앱 부트 게이트 (자동로그인 → PIN → 정체성) + 라우팅

**Files:**
- Create: `src/screens/PinGate.tsx`, `src/screens/IdentityPick.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`

**Interfaces:**
- Consumes: `ensureSignedIn` (Task 3), `hashPin` (Task 5), identity 유틸 (Task 5), `supabase`.
- Produces: `App`이 부트 단계를 순서대로 통과시킨 뒤 라우팅된 화면을 렌더. `IdentityContext`로 현재 `who` 제공: `useIdentity(): Role`.

- [ ] **Step 1: `src/main.tsx` 교체 (QueryClient + Router)**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 10_000 } } })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
```

- [ ] **Step 2: `src/screens/PinGate.tsx` 작성**

PIN이 아직 없으면(app_settings.pin_hash null) "새 PIN 설정", 있으면 "PIN 입력".
```tsx
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { hashPin } from '@/lib/pin'
import { setPinOk } from '@/lib/identity'

export default function PinGate({ onOk }: { onOk: () => void }) {
  const [hasPin, setHasPin] = useState<boolean | null>(null)
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.from('app_settings').select('pin_hash').eq('id', 1).single()
      .then(({ data }) => setHasPin(!!data?.pin_hash))
  }, [])

  async function submit() {
    if (pin.length !== 4) { setErr('4자리를 입력하세요'); return }
    const h = await hashPin(pin)
    if (hasPin) {
      const { data } = await supabase.from('app_settings').select('pin_hash').eq('id', 1).single()
      if (data?.pin_hash === h) { setPinOk(true); onOk() }
      else { setErr('PIN이 맞지 않아요'); setPin('') }
    } else {
      const { error } = await supabase.from('app_settings').update({ pin_hash: h }).eq('id', 1)
      if (error) { setErr('저장 실패'); return }
      setPinOk(true); onOk()
    }
  }

  if (hasPin === null) return <div className="p-6 text-sub">불러오는 중…</div>

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
      <h1 className="text-2xl font-bold">{hasPin ? 'PIN 입력' : '새 PIN 설정 (4자리)'}</h1>
      <input
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
        inputMode="numeric" type="password"
        className="text-center text-3xl tracking-[1rem] w-48 border-b-2 border-brand py-2 outline-none"
        placeholder="••••" autoFocus
      />
      {err && <p className="text-red-500 text-sm">{err}</p>}
      <button onClick={submit} className="bg-brand text-white rounded-2xl px-8 py-3 font-bold w-full max-w-xs">
        확인
      </button>
    </div>
  )
}
```

- [ ] **Step 3: `src/screens/IdentityPick.tsx` 작성**

```tsx
import { setIdentity } from '@/lib/identity'
import type { Role } from '@/types'

export default function IdentityPick({ onPick }: { onPick: (r: Role) => void }) {
  function pick(r: Role) { setIdentity(r); onPick(r) }
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
      <h1 className="text-2xl font-bold">나는 누구인가요?</h1>
      <div className="flex gap-4 w-full max-w-xs">
        <button onClick={() => pick('husband')} className="flex-1 bg-card rounded-2xl py-8 text-lg font-bold">
          🧔 남편
        </button>
        <button onClick={() => pick('wife')} className="flex-1 bg-card rounded-2xl py-8 text-lg font-bold">
          👩 아내
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: `src/App.tsx` 교체 (부트 게이트 + IdentityContext + 라우팅)**

```tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ensureSignedIn } from '@/lib/supabase'
import { getIdentity, isPinOk } from '@/lib/identity'
import type { Role } from '@/types'
import PinGate from '@/screens/PinGate'
import IdentityPick from '@/screens/IdentityPick'
import HomeScreen from '@/screens/HomeScreen'
import LedgerScreen from '@/screens/LedgerScreen'
import SettingsScreen from '@/screens/SettingsScreen'
import BottomNav from '@/components/BottomNav'

const IdentityCtx = createContext<Role>('husband')
export const useIdentity = () => useContext(IdentityCtx)

export default function App() {
  const [ready, setReady] = useState(false)
  const [pinOk, setPinOk] = useState(isPinOk())
  const [who, setWho] = useState<Role | null>(getIdentity())

  useEffect(() => { ensureSignedIn().then(() => setReady(true)).catch(() => setReady(true)) }, [])

  if (!ready) return <div className="p-6 text-sub">시작하는 중…</div>
  if (!pinOk) return <PinGate onOk={() => setPinOk(true)} />
  if (!who) return <IdentityPick onPick={setWho} />

  return (
    <IdentityCtx.Provider value={who}>
      <div className="max-w-md mx-auto min-h-full pb-20">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/ledger" element={<LedgerScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <BottomNav />
      </div>
    </IdentityCtx.Provider>
  )
}
```

- [ ] **Step 5: 임시 화면 스텁 생성 (컴파일용)**

`src/screens/HomeScreen.tsx`, `LedgerScreen.tsx`, `SettingsScreen.tsx`, `src/components/BottomNav.tsx`를 임시로:
```tsx
export default function HomeScreen() { return <div className="p-6">홈</div> }
```
(BottomNav도 `<nav/>` 반환 스텁. Task 8~11에서 실제 구현으로 교체.)

- [ ] **Step 6: 실행 확인**

Run: `npm run dev`
Expected: 첫 실행 시 "새 PIN 설정" → 입력 후 "나는 누구?" → 선택 후 "홈". 새로고침해도 바로 홈(기억됨).

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat: 부트 게이트(자동로그인→PIN→정체성) + 라우팅

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: 공용 UI 컴포넌트 (BottomNav / AmountText / TransactionRow)

**Files:**
- Modify: `src/components/BottomNav.tsx`
- Create: `src/components/AmountText.tsx`, `src/components/TransactionRow.tsx`

**Interfaces:**
- Consumes: `formatKRW`, 타입, `useCategories` (아이콘·이름 매핑).
- Produces:
  - `<BottomNav/>` — 홈/내역/설정 탭, 현재 경로 강조.
  - `<AmountText amount type />` — 지출 검정, 수입 파랑 `+`.
  - `<TransactionRow tx onClick />` — 아이콘·카테고리명·누가·금액 한 줄.

- [ ] **Step 1: `src/components/BottomNav.tsx` 구현**

```tsx
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: '홈', icon: '🏠' },
  { to: '/ledger', label: '내역', icon: '📋' },
  { to: '/settings', label: '설정', icon: '⚙️' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 max-w-md mx-auto bg-white border-t flex">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end
          className={({ isActive }) =>
            `flex-1 py-3 text-center text-xs ${isActive ? 'text-brand font-bold' : 'text-sub'}`
          }>
          <div className="text-xl">{t.icon}</div>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: `src/components/AmountText.tsx` 구현**

```tsx
import { formatKRW } from '@/lib/format'
import type { TxType } from '@/types'

export default function AmountText({ amount, type }: { amount: number; type: TxType }) {
  const income = type === 'income'
  return (
    <span className={income ? 'text-brand font-bold' : 'text-ink font-bold'}>
      {income ? '+' : '-'}{formatKRW(amount)}
    </span>
  )
}
```

- [ ] **Step 3: `src/components/TransactionRow.tsx` 구현**

```tsx
import type { Transaction, Category } from '@/types'
import AmountText from './AmountText'

const WHO_LABEL = { husband: '남편', wife: '아내' } as const

export default function TransactionRow(
  { tx, category, onClick }: { tx: Transaction; category?: Category; onClick?: () => void },
) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-3 text-left">
      <span className="text-2xl">{category?.icon ?? '💸'}</span>
      <div className="flex-1">
        <div className="font-medium">{category?.name ?? '기타'}{tx.memo && <span className="text-sub font-normal"> · {tx.memo}</span>}</div>
        <div className="text-xs text-sub">{WHO_LABEL[tx.who]}</div>
      </div>
      <AmountText amount={tx.amount} type={tx.type} />
    </button>
  )
}
```

- [ ] **Step 4: 실행 확인 + 커밋**

Run: `npm run dev` (하단 탭 3개 표시·이동 확인)
```bash
git add -A
git commit -m "feat: BottomNav/AmountText/TransactionRow 컴포넌트

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: 입력 시트 (TransactionSheet)

**Files:**
- Create: `src/components/TransactionSheet.tsx`

**Interfaces:**
- Consumes: `useCategories`, `usePaymentMethods`, `useAddTransaction`/`useUpdateTransaction` (Task 6), `useIdentity` (Task 7), `NewTx`.
- Produces: `<TransactionSheet open onClose editing? />` — 하단에서 올라오는 시트. 신규/수정 겸용. 저장 시 mutation 호출 후 닫힘.

- [ ] **Step 1: `src/components/TransactionSheet.tsx` 구현**

```tsx
import { useState } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { usePaymentMethods } from '@/hooks/usePaymentMethods'
import { useAddTransaction, useUpdateTransaction } from '@/hooks/useTransactions'
import { useIdentity } from '@/App'
import { formatKRW } from '@/lib/format'
import type { Transaction, TxType } from '@/types'

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function TransactionSheet(
  { open, onClose, editing }: { open: boolean; onClose: () => void; editing?: Transaction },
) {
  const who = useIdentity()
  const { data: cats = [] } = useCategories()
  const { data: pms = [] } = usePaymentMethods()
  const add = useAddTransaction()
  const update = useUpdateTransaction()

  const [type, setType] = useState<TxType>(editing?.type ?? 'expense')
  const [amount, setAmount] = useState<string>(editing ? String(editing.amount) : '')
  const [categoryId, setCategoryId] = useState<string | null>(editing?.category_id ?? null)
  const [pmId, setPmId] = useState<string | null>(editing?.payment_method_id ?? null)
  const [date, setDate] = useState(editing?.date ?? today())
  const [memo, setMemo] = useState(editing?.memo ?? '')

  if (!open) return null
  const amt = Number(amount) || 0
  const visibleCats = cats.filter((c) => c.type === type)

  async function save() {
    if (amt <= 0 || !categoryId) return
    const payload = { who, type, amount: amt, category_id: categoryId, payment_method_id: pmId, date, memo }
    if (editing) await update.mutateAsync({ id: editing.id, ...payload })
    else await add.mutateAsync(payload)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md mx-auto bg-white rounded-t-3xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <span className="font-bold">{editing ? '내역 수정' : '입력'}</span>
          <button onClick={onClose} className="text-sub text-xl">✕</button>
        </div>

        <div className="text-center text-3xl font-bold py-2">{formatKRW(amt)}</div>
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric" placeholder="금액 입력"
          className="w-full text-center border-b py-2 outline-none" autoFocus />

        <div className="flex bg-card rounded-2xl p-1">
          {(['expense', 'income'] as TxType[]).map((t) => (
            <button key={t} onClick={() => { setType(t); setCategoryId(null) }}
              className={`flex-1 py-2 rounded-xl text-sm font-bold ${type === t ? 'bg-white shadow text-ink' : 'text-sub'}`}>
              {t === 'expense' ? '지출' : '수입'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {visibleCats.map((c) => (
            <button key={c.id} onClick={() => setCategoryId(c.id)}
              className={`px-3 py-2 rounded-full text-sm ${categoryId === c.id ? 'bg-brand text-white' : 'bg-card'}`}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>

        <div className="space-y-2 text-sm">
          <label className="flex justify-between items-center">
            <span className="text-sub">날짜</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-right outline-none" />
          </label>
          <label className="flex justify-between items-center">
            <span className="text-sub">결제수단</span>
            <select value={pmId ?? ''} onChange={(e) => setPmId(e.target.value || null)} className="text-right outline-none">
              <option value="">선택 안함</option>
              {pms.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
            </select>
          </label>
          <label className="flex justify-between items-center">
            <span className="text-sub">메모</span>
            <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모"
              className="text-right outline-none" />
          </label>
        </div>

        <button onClick={save} disabled={amt <= 0 || !categoryId}
          className="w-full bg-brand disabled:bg-sub text-white rounded-2xl py-3 font-bold">
          저장하기
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 컴파일 확인 + 커밋**

Run: `npx tsc --noEmit`
```bash
git add -A
git commit -m "feat: 지출/수입 입력·수정 시트

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: 홈 화면 (이번 달 요약 + 최근 내역 + 입력 버튼)

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

**Interfaces:**
- Consumes: `useTransactions`, `useCategories`, `computeSummary`, `formatKRW`, `TransactionSheet`, `TransactionRow`.
- Produces: 현재 연·월 기준 요약 카드 + 최근 5건 + `+` 플로팅 버튼(시트 오픈).

- [ ] **Step 1: `src/screens/HomeScreen.tsx` 구현**

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { computeSummary } from '@/lib/summary'
import { formatKRW } from '@/lib/format'
import TransactionSheet from '@/components/TransactionSheet'
import TransactionRow from '@/components/TransactionRow'

export default function HomeScreen() {
  const now = new Date()
  const year = now.getFullYear(), month = now.getMonth() + 1
  const { data: txs = [] } = useTransactions(year, month)
  const { data: cats = [] } = useCategories()
  const catMap = new Map(cats.map((c) => [c.id, c]))
  const s = computeSummary(txs)
  const [open, setOpen] = useState(false)

  return (
    <div className="p-5 space-y-6">
      <div className="flex justify-between items-center">
        <span className="text-lg font-bold">{year}년 {month}월</span>
        <span className="text-sub text-sm">우리집 👫</span>
      </div>

      <div>
        <p className="text-sub text-sm">이번 달 남은 돈</p>
        <p className="text-4xl font-bold mt-1">{formatKRW(s.remaining)}</p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 bg-card rounded-2xl p-4">
          <p className="text-sub text-xs">수입</p>
          <p className="font-bold text-brand mt-1">{formatKRW(s.income)}</p>
        </div>
        <div className="flex-1 bg-card rounded-2xl p-4">
          <p className="text-sub text-xs">지출</p>
          <p className="font-bold text-ink mt-1">{formatKRW(s.expense)}</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="font-bold">최근 내역</span>
          <Link to="/ledger" className="text-sub text-sm">전체보기 ›</Link>
        </div>
        {txs.length === 0
          ? <p className="text-sub text-sm py-6 text-center">아직 내역이 없어요</p>
          : <div className="divide-y">
              {txs.slice(0, 5).map((t) => (
                <TransactionRow key={t.id} tx={t} category={catMap.get(t.category_id ?? '')} />
              ))}
            </div>}
      </div>

      <button onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 max-w-md w-14 h-14 rounded-full bg-brand text-white text-3xl shadow-lg flex items-center justify-center">
        +
      </button>
      <TransactionSheet open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
```

- [ ] **Step 2: 실행 확인**

Run: `npm run dev`
Expected: `+`로 지출 입력 → 저장 → 홈 요약·최근 내역 즉시 반영.

- [ ] **Step 3: 커밋**

```bash
git add -A
git commit -m "feat: 홈 화면(요약+최근내역+입력)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: 내역 화면 (월 이동 + 날짜별 그룹 + 수정/삭제)

**Files:**
- Modify: `src/screens/LedgerScreen.tsx`

**Interfaces:**
- Consumes: `useTransactions`, `useCategories`, `useDeleteTransaction`, `groupByDate`, `formatDayHeader`, `computeSummary`, `TransactionRow`, `TransactionSheet`.
- Produces: 월 이동(‹ ›), 월 합계, 날짜별 그룹 목록, 행 탭 → 수정 시트, 시트 내 삭제.

- [ ] **Step 1: `src/screens/LedgerScreen.tsx` 구현**

```tsx
import { useState } from 'react'
import { useTransactions, useDeleteTransaction } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { groupByDate } from '@/lib/grouping'
import { formatDayHeader } from '@/lib/date'
import { computeSummary } from '@/lib/summary'
import { formatKRW } from '@/lib/format'
import TransactionRow from '@/components/TransactionRow'
import TransactionSheet from '@/components/TransactionSheet'
import type { Transaction } from '@/types'

export default function LedgerScreen() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const { data: txs = [] } = useTransactions(year, month)
  const { data: cats = [] } = useCategories()
  const del = useDeleteTransaction()
  const catMap = new Map(cats.map((c) => [c.id, c]))
  const [editing, setEditing] = useState<Transaction | null>(null)

  const s = computeSummary(txs)
  const groups = groupByDate(txs)

  function move(delta: number) {
    let m = month + delta, y = year
    if (m < 1) { m = 12; y-- } else if (m > 12) { m = 1; y++ }
    setYear(y); setMonth(m)
  }

  async function remove(id: string) {
    if (confirm('이 내역을 삭제할까요?')) { await del.mutateAsync(id); setEditing(null) }
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-center gap-6 mb-2">
        <button onClick={() => move(-1)} className="text-2xl text-sub">‹</button>
        <span className="font-bold">{year}년 {month}월</span>
        <button onClick={() => move(1)} className="text-2xl text-sub">›</button>
      </div>
      <p className="text-center text-sm text-sub mb-4">
        지출 {formatKRW(s.expense)} · 수입 {formatKRW(s.income)}
      </p>

      {groups.length === 0 && <p className="text-sub text-sm text-center py-10">내역이 없어요</p>}

      {groups.map((g) => (
        <div key={g.date} className="mb-4">
          <p className="text-xs text-sub mb-1">{formatDayHeader(g.date)}</p>
          <div className="divide-y">
            {g.items.map((t) => (
              <TransactionRow key={t.id} tx={t} category={catMap.get(t.category_id ?? '')}
                onClick={() => setEditing(t)} />
            ))}
          </div>
        </div>
      ))}

      {editing && (
        <>
          <TransactionSheet open onClose={() => setEditing(null)} editing={editing} />
          <button onClick={() => remove(editing.id)}
            className="fixed bottom-4 inset-x-5 max-w-md mx-auto z-[60] text-red-500 text-sm">
            이 내역 삭제
          </button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 실행 확인**

Run: `npm run dev`
Expected: 월 이동 동작, 내역 탭 → 수정 시트, 삭제 반영.

- [ ] **Step 3: 커밋**

```bash
git add -A
git commit -m "feat: 내역 화면(월이동+그룹+수정/삭제)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: 설정 화면 (프로필·카테고리·결제수단·PIN 변경)

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`

**Interfaces:**
- Consumes: `useCategories`+add/update/delete, `usePaymentMethods`+add/delete, `useIdentity`, `hashPin`, `supabase`, `setPinOk`, `setIdentity`.
- Produces: 카테고리 추가/삭제, 결제수단 추가/삭제, PIN 변경, 정체성 재선택(로그인 정보 초기화 성격).

- [ ] **Step 1: `src/screens/SettingsScreen.tsx` 구현**

```tsx
import { useState } from 'react'
import { useCategories, useAddCategory, useDeleteCategory } from '@/hooks/useCategories'
import { usePaymentMethods, useAddPaymentMethod, useDeletePaymentMethod } from '@/hooks/usePaymentMethods'
import { useIdentity } from '@/App'
import { supabase } from '@/lib/supabase'
import { hashPin } from '@/lib/pin'
import { setIdentity } from '@/lib/identity'
import type { TxType } from '@/types'

export default function SettingsScreen() {
  const who = useIdentity()
  const { data: cats = [] } = useCategories()
  const { data: pms = [] } = usePaymentMethods()
  const addCat = useAddCategory(); const delCat = useDeleteCategory()
  const addPm = useAddPaymentMethod(); const delPm = useDeletePaymentMethod()

  const [catName, setCatName] = useState(''); const [catIcon, setCatIcon] = useState('💸')
  const [catType, setCatType] = useState<TxType>('expense')
  const [pmName, setPmName] = useState('')
  const [pin1, setPin1] = useState('')

  async function changePin() {
    if (pin1.length !== 4) { alert('4자리를 입력하세요'); return }
    const h = await hashPin(pin1)
    const { error } = await supabase.from('app_settings').update({ pin_hash: h }).eq('id', 1)
    alert(error ? '변경 실패' : 'PIN을 변경했어요'); setPin1('')
  }

  return (
    <div className="p-5 space-y-8">
      <h1 className="text-xl font-bold">설정</h1>

      <section>
        <p className="text-sub text-sm">현재 사용자</p>
        <p className="font-bold">{who === 'husband' ? '🧔 남편' : '👩 아내'}</p>
        <button className="text-brand text-sm mt-1"
          onClick={() => { setIdentity(who === 'husband' ? 'wife' : 'husband'); location.reload() }}>
          다른 사람으로 전환
        </button>
      </section>

      <section>
        <p className="font-bold mb-2">🏷️ 카테고리</p>
        <div className="space-y-1 mb-3">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-sm">
              <span>{c.icon} {c.name}</span>
              <span className="text-sub text-xs">{c.type === 'income' ? '수입' : '지출'}</span>
              <button onClick={() => delCat.mutate(c.id)} className="ml-auto text-red-400 text-xs">삭제</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={catIcon} onChange={(e) => setCatIcon(e.target.value)} className="w-12 bg-card rounded-xl text-center py-2" />
          <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="이름" className="flex-1 bg-card rounded-xl px-3 py-2" />
          <select value={catType} onChange={(e) => setCatType(e.target.value as TxType)} className="bg-card rounded-xl px-2">
            <option value="expense">지출</option><option value="income">수입</option>
          </select>
          <button className="bg-brand text-white rounded-xl px-3"
            onClick={() => { if (catName) { addCat.mutate({ name: catName, icon: catIcon, type: catType, is_fixed: false, sort_order: 99 }); setCatName('') } }}>
            추가
          </button>
        </div>
      </section>

      <section>
        <p className="font-bold mb-2">💳 결제수단</p>
        <div className="space-y-1 mb-3">
          {pms.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <span>{p.icon} {p.name}</span>
              <button onClick={() => delPm.mutate(p.id)} className="ml-auto text-red-400 text-xs">삭제</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={pmName} onChange={(e) => setPmName(e.target.value)} placeholder="이름" className="flex-1 bg-card rounded-xl px-3 py-2" />
          <button className="bg-brand text-white rounded-xl px-3"
            onClick={() => { if (pmName) { addPm.mutate({ name: pmName, icon: '💳', sort_order: 99 }); setPmName('') } }}>
            추가
          </button>
        </div>
      </section>

      <section>
        <p className="font-bold mb-2">🔒 PIN 변경</p>
        <div className="flex gap-2">
          <input value={pin1} onChange={(e) => setPin1(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric" type="password" placeholder="새 PIN 4자리" className="flex-1 bg-card rounded-xl px-3 py-2" />
          <button onClick={changePin} className="bg-brand text-white rounded-xl px-3">변경</button>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: 실행 확인 + 커밋**

Run: `npm run dev` (카테고리·결제수단 추가/삭제, PIN 변경 동작 확인)
```bash
git add -A
git commit -m "feat: 설정 화면(프로필/카테고리/결제수단/PIN)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: 실시간 동기화

**Files:**
- Create: `src/hooks/useRealtime.ts`
- Modify: `src/App.tsx` (마운트 시 구독)

**Interfaces:**
- Consumes: `supabase`, `useQueryClient`.
- Produces: `useRealtime()` — transactions/categories/payment_methods 변경 시 관련 쿼리 무효화하여 두 폰 자동 갱신.

- [ ] **Step 1: `src/hooks/useRealtime.ts` 작성**

```ts
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useRealtime() {
  const qc = useQueryClient()
  useEffect(() => {
    const ch = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' },
        () => qc.invalidateQueries({ queryKey: ['transactions'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' },
        () => qc.invalidateQueries({ queryKey: ['categories'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_methods' },
        () => qc.invalidateQueries({ queryKey: ['payment_methods'] }))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [qc])
}
```

- [ ] **Step 2: Supabase에서 Realtime 활성화**

대시보드 → Database → Replication → `transactions`, `categories`, `payment_methods` 테이블 Realtime 켜기.

- [ ] **Step 3: `App.tsx`에서 구독 호출**

`App` 컴포넌트 본문 상단(정체성 통과 후 렌더되는 영역)에 추가. IdentityCtx.Provider 내부에서 동작하도록, Provider 바로 아래 래퍼 컴포넌트로 호출:
```tsx
// App.tsx 안, IdentityCtx.Provider의 children을 감싸는 컴포넌트 추가
function Shell({ children }: { children: React.ReactNode }) {
  useRealtime()
  return <>{children}</>
}
```
그리고 Provider 내부를 `<Shell>…</Shell>`로 감싼다. 상단에 `import { useRealtime } from '@/hooks/useRealtime'` 추가.

- [ ] **Step 4: 두 브라우저로 검증**

Run: `npm run dev` → 두 개의 브라우저(또는 시크릿 창)에서 접속. 한 쪽에서 입력하면 다른 쪽이 자동 갱신되는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: 실시간 동기화(두 폰 자동 갱신)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: 배포 (Vercel) + PWA 최종 점검

**Files:**
- Create: `vercel.json` (SPA 리라이트)

**Interfaces:**
- Produces: 공개 주소에서 접속 가능한 PWA. 폰에서 "홈 화면에 추가".

- [ ] **Step 1: `vercel.json` 작성 (SPA 라우팅)**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

- [ ] **Step 2: 프로덕션 빌드 확인**

Run:
```bash
npm run build && npm run preview
```
Expected: 빌드 성공, preview 주소에서 정상 동작.

- [ ] **Step 3: GitHub에 푸시**

```bash
git add -A
git commit -m "chore: Vercel SPA 리라이트 설정

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
git push
```

- [ ] **Step 4: Vercel 프로젝트 연결**

Vercel 대시보드 → New Project → `ehdclf12/account` 임포트 →
Environment Variables에 `.env`의 4개 값(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SHARED_EMAIL`, `VITE_SHARED_PASSWORD`) 입력 → Deploy.

- [ ] **Step 5: 실제 폰 검증 (성공 기준)**

두 폰에서 배포 주소 접속 → "홈 화면에 추가" → 앱 실행:
- [ ] PIN → 남편/아내 선택으로 진입
- [ ] 한 폰 입력이 다른 폰에 나타남(누가 포함)
- [ ] 이번 달 수입·지출·남은 돈 정확
- [ ] 카테고리·결제수단 추가/수정/삭제
- [ ] 내역 수정/삭제

- [ ] **Step 6: 최종 커밋(필요 시 아이콘·문구 다듬기)**

```bash
git add -A
git commit -m "chore: 1단계 배포 및 마무리

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
git push
```

---

## Self-Review (계획 대 스펙 점검)

- **스펙 커버리지:** PIN/정체성(Task 5,7) · 데이터모델·RLS(Task 2) · 입력(Task 9) · 카테고리/결제수단 관리(Task 12) · 누가 표시(Task 8 Row) · 이번 달 요약(Task 4,10) · 내역 목록/수정/삭제(Task 11) · 실시간 공유(Task 13) · PWA/배포(Task 1,14) — 스펙 성공 기준 전 항목 매핑됨.
- **미포함 확인:** 예산·정산·투자·부동산·그래프는 의도적으로 2~5단계로 제외(스펙과 일치).
- **타입 일관성:** `Role`/`TxType`/`who`/`type` 리터럴, `NewTx`, 훅 시그니처 전 태스크 일치.
- **플레이스홀더:** 없음(모든 코드 실체 포함). 임시 스텁(Task 7 Step5)은 Task 8~12에서 실제 구현으로 교체됨을 명시.
