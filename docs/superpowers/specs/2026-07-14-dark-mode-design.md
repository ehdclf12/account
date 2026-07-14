# 다크모드 설계

작성일: 2026-07-14

## 목표

앱 전체를 라이트/다크 두 테마로 쓸 수 있게 한다. 앱 안에서 직접 고르고, 기기별로 저장한다.
겸사겸사 화면마다 제각각이던 홈/뒤로 버튼을 눈에 띄는 알약 버튼으로 통일한다.

## 범위

포함:

- 색을 CSS 변수 기반 시맨틱 토큰으로 전환 (`tailwind.config.js` + `src/index.css`)
- 하드코딩된 색 약 110곳을 토큰으로 교체 (27개 파일)
- 라이트/다크 토글 (홈 메뉴 하단 계정 줄)
- 첫 페인트 깜빡임 방지
- PWA 상태바 색(`theme-color`) 테마 연동
- 홈/뒤로 버튼 9곳을 `NavButton` 컴포넌트로 통일

제외:

- OS(기기) 설정 연동. 사용자가 명시적으로 뺐다 — 앱 안에서만 고른다.
- 도넛 차트 팔레트(`CAT_COLORS` 7색)와 아카이브 카드 색(`ARCHIVE_COLORS` 5종) 변경.
  둘 다 데이터를 구분하는 색이고 중간 명도라 다크 배경에서도 읽힌다.
- 테마 값의 DB 저장/기기 간 동기화. 두 사람이 서로 다른 테마를 쓸 수 있어야 한다.

## 왜 이 방식인가

코드를 실측한 결과:

- 기존 토큰 사용: `text-sub` 147, `text-ink` 99, `bg-card` 82, `bg-brand` 33 … **387곳**
- 하드코딩된 색: `text-white` 31, `#F04452` 25, `bg-white` 18, `bg-black` 9 … **약 110곳**

토큰을 CSS 변수로 바꾸면 **387곳은 코드를 한 글자도 안 고치고** 다크에 대응된다.
손댈 곳은 하드코딩된 110곳뿐이다.

대안이었던 Tailwind `dark:` 접두어 방식은 497곳 전부에 변형을 달아야 하고, 새 화면을 만들 때마다
색을 두 벌씩 써야 하며, 색 조정 때마다 전수 조사를 반복해야 한다. 채택하지 않는다.

## 색 토큰

색이 아니라 **의미**에 이름을 붙인다.

| 토큰 | 쓰임 | 라이트 | 다크 |
|---|---|---|---|
| `bg` | 페이지 배경 | `#FFFFFF` | `#17171C` |
| `card` | 은은한 면 (카드·입력칸) | `#F2F4F6` | `#232429` |
| `surface` | 떠 있는 면 (모달·시트) | `#FFFFFF` | `#2B2D33` |
| `ink` | 본문 글씨 | `#191F28` | `#EAECEF` |
| `sub` | 보조 글씨 | `#8B95A1` | `#9BA3AE` |
| `brand` | 파랑 (버튼·강조) | `#3182F6` | `#4C93F8` |
| `danger` | 지출·삭제·초과·경고 | `#F04452` | `#FF6B75` |
| `positive` | 등록됨·지출 감소 | `#0CA30C` | `#35C759` |
| `line` | 구분선 | `#E5E8EB` | `#33363C` |

틴트(뱃지 배경)와 딤(모달 뒤)은 토큰 색의 투명도로 표현한다. 별도 토큰을 만들지 않는다.

- 남편 뱃지: `bg-brand/10 text-brand` (지금 `#E8F3FF` / `#3182F6`)
- 아내 뱃지: `bg-danger/10 text-danger` (지금 `#FBEEF0` / `#F04452`)
- 기한 D-n 뱃지: `bg-danger/10 text-danger` (지금 `#FDECEE` / `#F04452`)
- 모달 딤: `bg-black/30` → 라이트 `/30`, 다크 `/60`. `--dim` 변수로 뺀다.

빨강 틴트가 지금 `#FDECEE`와 `#FBEEF0`로 미묘하게 다르다. 하나로 통일된다.

### 왜 순수 검정이 아닌가

`#000`을 쓰면 그 위에 얹는 카드가 떠 보이지 않는다. `#17171C`(살짝 푸른 진회색)를 바닥으로 두고
`#232429`(card) → `#2B2D33`(surface)로 **높이 위계**를 만든다. OLED에서 눈도 덜 부시다.

### 왜 다크에서 파랑·빨강을 바꾸는가

`#3182F6`은 어두운 배경에서 탁하게 가라앉고, `#F04452`는 반대로 눈을 찌른다. 다크에선
파랑을 밝게(`#4C93F8`), 빨강을 부드럽게(`#FF6B75`) 조정한다.

## 구현 구조

### CSS 변수는 RGB 채널로 정의한다 (중요)

코드에 이미 `bg-brand/10`, `border-sub/30`, `text-sub/50` 처럼 투명도를 섞어 쓴 곳이 있다.
변수에 `#17171C` 같은 hex를 넣으면 Tailwind가 투명도를 붙이지 못한다. 채널 값으로 정의해야 한다.

`src/index.css`:

```css
:root {
  --bg: 255 255 255;
  --card: 242 244 246;
  --surface: 255 255 255;
  --ink: 25 31 40;
  --sub: 139 149 161;
  --brand: 49 130 246;
  --danger: 240 68 82;
  --positive: 12 163 12;
  --line: 229 232 235;
  --dim: 0 0 0 / 0.30;
}
[data-theme='dark'] {
  --bg: 23 23 28;
  --card: 35 36 41;
  --surface: 43 45 51;
  --ink: 234 236 239;
  --sub: 155 163 174;
  --brand: 76 147 248;
  --danger: 255 107 117;
  --positive: 53 199 89;
  --line: 51 54 60;
  --dim: 0 0 0 / 0.60;
}
body { background: rgb(var(--bg)); color: rgb(var(--ink)); }
```

`tailwind.config.js`:

```js
colors: {
  bg:       'rgb(var(--bg) / <alpha-value>)',
  card:     'rgb(var(--card) / <alpha-value>)',
  surface:  'rgb(var(--surface) / <alpha-value>)',
  ink:      'rgb(var(--ink) / <alpha-value>)',
  sub:      'rgb(var(--sub) / <alpha-value>)',
  brand:    'rgb(var(--brand) / <alpha-value>)',
  danger:   'rgb(var(--danger) / <alpha-value>)',
  positive: 'rgb(var(--positive) / <alpha-value>)',
  line:     'rgb(var(--line) / <alpha-value>)',
}
```

### `src/lib/theme.ts` (신규)

```ts
export type Theme = 'light' | 'dark'
export function loadTheme(): Theme         // localStorage 'theme'; 없거나 이상하면 'light'
export function saveTheme(t: Theme): void  // localStorage 실패해도 던지지 않는다
export function applyTheme(t: Theme): void // <html data-theme> + <meta theme-color> 갱신
```

`applyTheme`이 `<html>`에 `data-theme`를 꽂으면 CSS 변수가 통째로 갈아끼워지고 앱 전체가 한 번에
바뀐다. React 리렌더가 필요 없다.

### 깜빡임 방지

React가 뜨기 전에 흰 화면이 한 번 번쩍인다. `index.html`의 `<head>`에서 **첫 페인트 전에** 적용한다:

```html
<script>
  try { document.documentElement.dataset.theme = localStorage.getItem('theme') || 'light' } catch {}
</script>
```

### 토글

`src/components/ThemeToggle.tsx` — 홈 메뉴 하단 계정 줄에 붙인다:

```
동욱님 · 로그아웃                    [ ☀︎ 라이트 | ☾ 다크 ]
```

누르면 `saveTheme` + `applyTheme`. 기본값은 라이트(지금 모습 그대로).

### PWA 상태바

`index.html`의 `<meta name="theme-color">`가 파랑(`#3182F6`)으로 고정돼 있다. 아이패드에서 PWA로
띄우면 상단 바 색이다. `applyTheme`이 테마에 맞춰 `#FFFFFF` / `#17171C`로 바꾼다.

## 코드 교체 (약 110곳, 27개 파일)

대부분 기계적이다:

| 지금 | 바꿀 것 |
|---|---|
| `bg-white` (모달·시트 배경) | `bg-surface` |
| `text-[#F04452]` | `text-danger` |
| `bg-[#F04452]` | `bg-danger` |
| `text-[#0ca30c]` | `text-positive` |
| `bg-black/30` (모달 딤) | `bg-dim` |
| `border-card` (구분선) | `border-line` |
| `bg-[#E8F3FF] text-[#3182F6]` (남편 뱃지) | `bg-brand/10 text-brand` |
| `bg-[#FBEEF0] text-[#F04452]` (아내 뱃지) | `bg-danger/10 text-danger` |
| `bg-[#FDECEE] text-[#F04452]` (D-n 뱃지) | `bg-danger/10 text-danger` |
| `#C4CBD3` (색 없는 카드 막대) | `rgb(var(--sub))` |

**`text-white`(31곳)는 대부분 그대로 둔다.** 파란 버튼 위 흰 글씨는 다크에서도 흰 글씨다.

**주의 — 기계적으로 바꾸면 안 되는 것.** `bg-white` 18곳 중에는 "면"이 아니라 "요소"인 것이 섞여
있다. 대표적으로 `ChecklistCard`의 **체크박스 안쪽 흰색**. 이걸 `bg-surface`로 바꾸면 다크에서
체크박스가 카드와 같은 색이 되어 사라진다. 이런 곳은 개별 판단이 필요하고, 눈으로 확인하는
단계에서 잡는다.

## 홈/뒤로 버튼 통일

지금 9곳이 전부 `text-sub text-sm` — 회색 작은 글씨라 배경에 묻힌다. 형태도 제각각이다
(`홈` / `‹ 뒤로` / `‹ 예산관리`).

`src/components/NavButton.tsx` (신규)를 9곳이 함께 쓴다:

```tsx
<NavButton to="/" label="홈" />              // ArchiveScreen, CalendarScreen
<NavButton to="/budget" label="예산관리" />   // HomeScreen, BusinessScreen, AssetsScreen
<NavButton to={backTo} label="뒤로" />        // StatsScreen, FixedManageScreen, BudgetEditScreen
<NavButton to="/" label="홈" />              // HubScreen
```

렌더: `‹ 홈` 알약 — `bg-card text-ink rounded-full px-3 py-1.5 text-sm font-medium active:opacity-70`.
면이 생겨 눌리는 것처럼 보이고, `text-sub` → `text-ink`로 대비가 올라간다. 화살표 `‹`를 전부에
붙여 형태를 통일한다. 다크에서는 `card`/`ink` 토큰이라 저절로 따라온다.

## 테스트 — `src/lib/theme.test.ts`

기존 관례대로 `src/lib/**` 순수 함수에만 붙인다. 화면·컴포넌트는 테스트하지 않는다.
테스트 환경이 jsdom이라 `localStorage`를 그대로 쓸 수 있다.

- `loadTheme()` — 비어 있으면 `'light'`; `'dark'`면 `'dark'`; **쓰레기 값(`'blue'`)이면 `'light'`**.
  정규화하지 않으면 이상한 값이 `data-theme`에 꽂혀 CSS 변수가 하나도 안 잡히고 앱이 무색으로 뜬다.
- `saveTheme()` → `loadTheme()` 라운드트립.

`applyTheme`은 DOM을 만지므로 테스트하지 않는다.

## 예외 처리

| 상황 | 처리 |
|---|---|
| 사파리 프라이빗 모드 등에서 `localStorage` 접근 실패 | `try/catch`로 감싸고 `'light'` 폴백. 앱이 죽지 않는다. |
| `index.html` 인라인 스크립트도 동일 | 이미 `try {} catch {}` |
| 저장값이 `'light'`/`'dark'`가 아님 | `loadTheme()`이 `'light'`로 정규화 |
| 다크에서 도넛 차트 | 7색 팔레트 그대로. 라벨은 토큰이라 자동 대응 |

## 검증

색이 110곳 바뀌므로 빌드·테스트만으로는 부족하다. 구현 후 **모든 화면을 라이트/다크로 한 번씩
눈으로 확인**한다:

홈 · 예산관리(허브) · 집 · 코스모스 · 내역 · 통계 · 고정비 · 저축 · 자산 · 원가계산기 ·
아카이브 · 캘린더 · 로그인, 그리고 모달 시트(입력·이체·고정비·저축·자산·아카이브·폴더).

특히 볼 것: 카드가 배경에서 떠 보이는지, 체크박스·입력칸 테두리가 보이는지, 도넛 차트 라벨이
읽히는지, 모달 딤이 충분히 어두운지.
