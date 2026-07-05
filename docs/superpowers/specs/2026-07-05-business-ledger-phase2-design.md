# 사업 장부 — Phase 2 설계서

작성일: 2026-07-05
전제: Phase 1(부부 가계부)이 구현된 상태 위에 얹는다. Supabase(Postgres/Auth/RLS) + React PWA, 토스 TDS 스타일(이모지 없음, 텍스트·저채도 뱃지 위주) 유지.

## 0. 목적

부부 중 한 명이 운영하는 사업의 **수입/지출을 별도 장부로 관리**하고, **사업자금은 가계(월급)에서 이체**해 채운다. 가계 장부와 사업 장부는 **이체로 유기적으로 연동**되되, 서로의 통계에 섞이지 않는다.

## 1. 핵심 규칙

- **이체 = 가계 지출/수입** (사용자 선택: 옵션 1)
  - 가계→사업 이체(보내기): **가계 지출** 1건으로 기록 → 이번 달 지출·남은 돈에 자동 반영.
  - 사업→가계 이체(역이체, 받기): **가계 수입** 1건으로 기록.
- **사업자금 잔액** = (가계→사업 이체 합) − (사업→가계 역이체 합) + (사업 수입 합) − (사업 지출 합).
- **한 번의 이체 기록이 양쪽에 연동** — 이중 입력 없음. 가계 쪽 이체 거래를 사업자금이 유입/유출원으로 읽는다.
- 사업 데이터(`scope='business'`)는 **가계 화면·통계에 절대 섞이지 않는다**(가계 조회는 `scope='household'`만).

## 2. 데이터 모델 변경 (마이그레이션)

Phase 1 스키마에 최소 변경. 사용자가 이미 `schema.sql`을 실행했으므로 **`supabase/schema-phase2.sql`(ALTER + 시드)** 을 새로 만들어 SQL Editor에서 실행한다.

```sql
-- categories: 범위 + 이체 플래그
alter table categories add column scope text not null default 'household'
  check (scope in ('household','business'));
alter table categories add column is_fund_transfer boolean not null default false;

-- transactions: 범위
alter table transactions add column scope text not null default 'household'
  check (scope in ('household','business'));

-- 시드: 가계 "사업자금 이체" 카테고리 (양방향 이체 공용)
insert into categories (name, icon, type, is_fixed, sort_order, scope, is_fund_transfer)
values ('사업자금 이체','', 'expense', false, 90, 'household', true);
-- 참고: 이체는 type(expense=보내기 / income=받기)으로 방향 구분. 위 시드는 표시용 1개.

-- 시드: 사업 카테고리 (사용자가 이후 자유롭게 추가/삭제)
insert into categories (name, icon, type, is_fixed, sort_order, scope, is_fund_transfer) values
  ('재료비','', 'expense', false, 1, 'business', false),
  ('인건비','', 'expense', false, 2, 'business', false),
  ('임대료','', 'expense', false, 3, 'business', false),
  ('매출','',   'income',  false, 1, 'business', false),
  ('기타수입','','income',  false, 2, 'business', false);
```

- 기존 데이터는 `scope` 기본값 `household`로 자동 소급 → Phase 1 동작 불변.

## 3. 데이터 접근 변경

- **가계 조회 필터 추가**: `useCategories`, `useTransactions`는 `scope='household'` 로 필터 (사업 데이터 유입 차단). "사업자금 이체" 카테고리는 household라 가계 입력 카테고리 목록엔 뜨되, 일반 지출과 구분되도록 이체 전용 흐름에서만 사용(아래 참고).
- **사업 훅 신설**: `useBusinessCategories`(scope=business), `useBusinessTransactions(year,month)`(scope=business), 사업 수입/지출 add·update·delete.
- **사업자금 잔액 훅**: `useBusinessFund()` — 전체 기간 기준 잔액(위 공식). 이체(가계 is_fund_transfer 거래) + 사업 거래를 합산.
- **이체 액션**: `useFundTransfer()` — 방향(보내기/받기)과 금액을 받아 **가계 is_fund_transfer 거래 1건**을 생성(보내기=expense, 받기=income, scope=household, category=사업자금이체).

## 4. 화면

하단탭: **홈 · 내역 · 사업 · 설정** (4개, 텍스트 전용).

### 사업 탭 (신규 BusinessScreen)
```
사업자금 잔액
₩1,100,000                      ← 큰 숫자 (마이너스면 빨강 경고)

[ 사업자금 보내기 ]  [ 받기 ]    ← 이체 버튼(양방향)

이번 달   수입 800,000 · 지출 200,000

이번 달 사업 내역 (날짜별)
매출        납품대금   +800,000
재료비      부자재     -200,000
...
                          + (사업 입력)
```
- `+` → 사업 입력 시트: 지출/수입 토글 + **사업 카테고리**(사용자 정의) 선택 + 금액/날짜/메모. `scope='business'`로 저장.
- "사업자금 보내기/받기" → 이체 시트(금액 입력) → 가계 is_fund_transfer 거래 생성. 잔액·가계 남은돈 동시 갱신.

### 설정
- **사업 카테고리 관리** 섹션 추가: 사업 수입/지출 카테고리 추가·삭제(scope=business). 가계 카테고리 관리와 분리 표기.

### 스타일
- Phase 1과 동일한 TDS: 이모지 없음, semibold 텍스트, 파랑 포인트, 저채도 뱃지(WhoBadge 재사용 가능).

## 5. 엣지/안전장치

- 사업자금 잔액 음수 → 빨강 + "사업자금이 부족해요" 안내(입력은 막지 않음).
- 가계 요약/내역/그래프는 `scope='household'`만 집계 → 사업 섞임 방지(회귀 테스트로 확인).
- 이체는 항상 가계 장부에 흔적을 남김(옵션1) → 가계 내역에서 "사업자금 이체(보내기/받기)"로 보임.

## 6. 성공 기준

- [ ] 사업 탭에서 사업 수입/지출을 사용자 정의 카테고리로 입력·수정·삭제할 수 있다
- [ ] "사업자금 보내기"가 가계 지출로 잡히고 사업자금 잔액이 그만큼 증가한다
- [ ] "받기(역이체)"가 가계 수입으로 잡히고 사업자금 잔액이 그만큼 감소한다
- [ ] 사업자금 잔액 = 이체합 − 역이체합 + 사업수입 − 사업지출, 정확히 계산된다
- [ ] 가계 홈/내역 통계에 사업 데이터가 섞이지 않는다
- [ ] 두 폰에서 실시간 동기화된다(Phase 1 실시간에 사업 테이블/스코프 포함)

## 7. 테스트

- 순수 계산(사업자금 잔액, 스코프 분리 요약)은 Vitest 단위 테스트.
- 이체 왕복·스코프 격리는 실제 계정으로 시나리오 검증(자격증명 확보 후).
