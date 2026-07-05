# 진행 기록 — 부부 가계부 1단계

브랜치: feat/phase1
계획: docs/superpowers/plans/2026-07-05-couple-budget-phase1.md

(태스크 완료 시 여기에 한 줄씩 기록)

Task 1: complete (commit e6f9144, 스캐폴드, 검토 clean)
Task 2: complete (commit 9c18b6a, Supabase 스키마·시드·RLS, 검토 clean)
Task 3: complete (commit 7a6878b, 타입·클라이언트·자동로그인·테스트, 검토 clean)
Task 4: complete (commit 5f10ea9, 통화·날짜·요약·그룹핑 유틸 TDD, 검토 clean)
Task 5: complete (commit 64b1528, PIN·정체성 유틸 TDD, 검토 clean; 계획서 날짜오타 토→일 정정됨)
Task 6: complete (commit 8f901f9, 데이터 훅, tsc/build/test 통과, 검토 clean)
Task 7: complete (commit 9a53f52, 부트게이트+라우팅, tsc/build/test 통과, 검토 clean)
Task 8: complete (commit 8fe05b9, BottomNav/AmountText/TransactionRow, 검토 clean)
Task 9: complete (commit f1ef18d, 입력·수정 시트, 검토 clean)
Task 10: complete (commit 6e9e08c, 홈 화면, 검토 clean)
Task 11: complete (commit e184940, 내역 화면, 검토 clean)

Task 12+재스타일: complete (commit b65d04c TDS 재스타일·이모지 제거, f3b905a 설정 화면; 검토 clean)

Phase 1 남은 것: Task 13 실시간 동기화(자격증명 불필요, 진행가능), Task 14 배포(자격증명·schema 실행 후).
Task 13: complete (commit 473dda3, 실시간 동기화, 검토 clean)

*** Phase 1 코드 전부 완성(Task 1-13). 남은 것: Task 14 배포 + 실제 계정 런타임 검증 → 자격증명(공유 이메일/비번) + schema.sql 실행 필요(블록됨). ***

--- Phase 2(사업 장부): 설계서(49b59e4) + 계획서·마이그레이션SQL(912d555). ---
접속검증: 공유계정 로그인 OK, Phase1 스키마 반영 확인(app_settings/profiles/payment_methods). Phase2 마이그레이션(schema-phase2.sql)은 사용자가 아직 미실행.
P2-1: complete (schema-phase2.sql, commit 912d555)
P2-2: complete (commit 2fc5098, scope 타입+사업자금 계산 TDD; Phase1 리터럴 컴파일 보정 포함)
P2-3: complete (commit 3edf413, 가계 scope 격리+사업 훅+이체)
P2-4: complete (commit 8850556, 사업 화면+양방향 이체+사업 입력+사업 탭)
P2-5: complete (commit d4eea61, 설정 사업 카테고리 관리)

*** Phase 1 + Phase 2 코드 전부 완성. ***
로고: a4edcbe ('우리집' 워드마크). vercel.json: ddf028b.
DB 검증: Phase1+Phase2 스키마 모두 반영 확인(사용자 schema-phase2 실행 완료), 공유계정 로그인 OK.
최종 whole-branch 리뷰(opus): 치명 1(월조회 짧은달 버그)+중요 1(실시간 fund-data)+사소 2 발견.
리뷰 수정: complete (commit cd8ae48, 13개 테스트 통과). 사소#4(auth실패 UX)는 미조치(부부 전용 모델상 낮은 우선순위).
리뷰 수정 후 main 병합 완료(0bb09dd).

--- Phase 3(각자 로그인 전환): 사용자 요청으로 공유계정+PIN → 각자 이메일/비번 로그인으로 변경.
매핑: ehdclf12@naver.com=동욱(husband), tmxlclt@naver.com=도영(wife). 라벨 남편/아내 → 이름 동욱/도영.
두 계정 로그인·데이터접근 검증 OK. PinGate/IdentityPick/pin/identity 제거, Login 화면 추가, supabase.ts ensureSignedIn 제거, Settings PIN→로그아웃, WhoBadge 이름표시. VITE_SHARED_* 불필요해짐. ---
Phase 3: complete (commit cbf87f1, main 병합 8c8b7f7). 각자 로그인 전환, 10개 테스트 통과.
Vercel 필요 env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 만. (SHARED 2개는 미사용)
남은 것: 사용자 Vercel 재배포 → 두 폰 로그인 테스트.

--- 홈 허브 개편: complete (2a5531b, 병합 40638c3). ---
--- 홈 상위 메뉴 개편: complete (commit 0ae80e4, 병합 07b0cd9).
IA: "/"=HomeMenu(예산관리 항목 + 하단 계정/로그아웃, 추후 스케줄링 등 추가) / "/budget"=집·코스모스 카드 / "/household"=집(상단 관리) / "/household/manage"=집설정(가계 카테고리·결제수단) / "/ledger"=집 내역 / "/business"=코스모스(상단 관리) / "/business/manage"=코스모스설정(사업 카테고리).
전역 SettingsScreen·BottomNav 제거. 로그아웃=홈 메뉴 하단. 설정=영역별 노출. ---

=== 가계부 고도화 로드맵(사용자 선택, 순서대로 구현) ===
① 예산 설정 + 예산 대비 지출  ← DONE (병합 592a7b6). 월별 budgets 테이블(schema-budgets.sql, 사용자 실행 필요). 집·코스모스 화면 BudgetProgress + /household/budget /business/budget 편집화면.
   + 코스모스 원가·마진 계산기 DONE (병합 cc0220d). /business/calculator, 부대비용·수량·총이익·판매가역산.
② 통계·그래프  ← DONE (병합 0c3fad5). /household/stats /business/stats. 카테고리 도넛(검증 팔레트)+월별 추이 막대+지난달 대비. 순수 SVG, DB 불필요.
③ 고정비 관리  ← DONE (병합 0d10ea6). schema-fixed.sql(fixed_costs + transactions.fixed_cost_id, 사용자 실행 필요). FixedCostsSection(집·코스모스 화면, 이번달 등록/등록됨) + /household/fixed /business/fixed 편집.
   + UI 수정(fix/input-center, ebe3835): 입력창 중앙 모달, FAB 열 정렬, 이체 명칭(사업자금 받기/생활비로 사용).
   + 고정비 고도화 DONE (병합 157c70f): 홈에 별도 "고정비 관리" 메뉴(/fixed), 집/코스모스 토글, 월이동, 인원별(동욱/도영/공동) 합계, 항목 탭→편집(FixedCostSheet), 담당자 who 컬럼(schema-fixed-who.sql 실행 필요). 메인화면 FixedCostsSection 제거. 삭제버튼 시트 안으로 이동.
④ 캘린더 뷰  ← 다음
⑤ 저축 목표
⑥ 자산 현황(주식·코인·부동산 순자산 — 최초 원비전, 규모 큼, 마지막)
