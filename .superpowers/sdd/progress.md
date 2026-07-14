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
   + 고정비 위치 이동 DONE (병합 f4a896f): 홈 메뉴에서 제거, 예산관리→집/코스모스 화면 안 "고정비 관리"(/household/fixed, /business/fixed) 스코프별. 토글 제거.
   + budgets RLS 정책 사용자 실행 완료 → 예산 저장 정상. fixed_costs.who 실행 완료.
④ 캘린더 뷰  ← 진행 안 함(사용자 확정)
⑤ 저축 목표  ← DONE (병합 feat/savings). schema-savings.sql(savings_goals + transactions.savings_goal_id + categories.is_savings + '저축' 카테고리 시드, 사용자 실행 필요). 카테고리→목표 연동, 진행률·월 적립(연도/분기 기한), /household/savings 관리 화면(집 화면 진입버튼). 목표별 합계만(인원별 없음). ⑥ 연결용 useSavingsProgress 총합 준비.
⑥ 자산 현황  ← 1단계 DONE (병합 feat/assets). schema-assets.sql(assets 테이블, symbol/quantity는 6-2 예약, 사용자 실행 필요). 순자산 = 자산 − 부채 + 저축(⑤). 예산관리 자산현황 카드(맨 위, 자산현황/집/코스모스) + /assets 관리 화면(수동 평가액). 타입: 미국주식/한국주식/코인/부동산/현금/기타/부채. 인원 구분 없음. lib/networth(TDD).
   + 6-2단계 DONE (병합 feat/assets-live). api/quotes.js(Yahoo v8 chart 프록시, 키 불필요) + vercel.json /api 제외. useQuotes 훅(정렬키·staleTime 60s·자동+새로고침). AssetSheet 주식·코인 타입에 심볼(Yahoo 티커 직접입력)·수량. lib/quote effectiveAmount(USD는 USDKRW=X 환율 환산, 실패/부분실패/환율없음 시 수동 amount 폴백). AssetsScreen/HubScreen 시세 반영 + "시세" 배지. DB 변경 없음(6-1 컬럼 재사용). 로컬 dev는 /api 없어 수동값 폴백, 실검증은 Vercel 배포본.

=== ⑤ 저축 목표 태스크 진행 (branch feat/savings, plan 2026-07-06-savings-goals.md) ===
Task 1: complete (commit 84e9fdd, savings 계산 로직 TDD 9tests, 리뷰 clean; Minor: monthsUntil quarter 0 truthy — 도메인상 무해)
Task 2: complete (commit 0ba1afe, schema-savings.sql + types SavingsGoal/is_savings/savings_goal_id, settings 화면 is_savings:false 컴파일 보정, tsc clean, 리뷰 clean)
Task 3: complete (commit 7f6055b, useSavingsGoals 5훅 + useTransactions/useRealtime savings_progress 무효화·구독, build+30tests clean, 리뷰 clean)
Task 4: complete (commit d57f51b, SavingsGoalSheet + SavingsManageScreen + /household/savings 라우트 + 집 화면 진입버튼, build+30tests clean, 리뷰 clean)
Task 5: complete (commit 658897b, TransactionSheet 저축 카테고리→목표 연동, build+30tests clean, 리뷰 clean; Minor: 저축 카테고리 전환 시 목표 id 미리셋 — 무해)
최종 whole-branch 리뷰(opus): READY TO MERGE, 치명/중요 0. Minor 2(quarter 0 truthy, 카테고리 전환시 목표 미리셋) 무해. delete 무효화 개선 적용(commit 849dee2).

=== ⑥ 자산 현황 1단계 태스크 진행 (branch feat/assets, plan 2026-07-06-assets-networth-phase1.md) ===
Task 1: complete (commit e99148e, networth 계산 로직 TDD 6tests, 리뷰 clean)
Task 2: complete (commit 34e172b, schema-assets.sql + types AssetType/Asset(symbol·quantity 예약), tsc clean, 리뷰 clean)
Task 3: complete (commit 0c879e6, useAssets 4훅 + useRealtime assets 구독, build+36tests clean, 리뷰 clean)
Task 4: complete (commit 27d86f0, AssetSheet + AssetsScreen + /assets 라우트, build+36tests clean, 리뷰 clean; Minor: 음수 순자산 formatKRW ₩- 표기(미관), name trim 없음, edit시 symbol/quantity null(6-2 대비 주의))
Task 5: complete (commit 6d241a3, 예산관리 자산현황 카드 맨위, build+36tests clean, 리뷰 clean)
최종 whole-branch 리뷰(opus): READY TO MERGE, 치명/중요 0. Minor 3(음수 formatKRW 표기·name trim·edit시 symbol/quantity null) 무해/의도. 두 화면 순자산 계산 동일, 저축 연동·실시간 무효화 정상 확인.

=== ⑥ 자산 현황 2단계(실시간 시세) 태스크 진행 (branch feat/assets-live, plan 2026-07-06-assets-networth-phase2.md) ===
Task 1: complete (commit 82ebee7, quote 환산 로직 TDD 10tests, 리뷰 clean)
Task 2: complete (commit 1eb2728, api/quotes.js Yahoo 프록시 + vercel.json /api 제외, node --check+build+46tests clean, 리뷰 clean; Minor: proto-key/dup심볼/fetch timeout 없음 — 2인 비공개라 저위험)
Task 3: complete (commit 7142db1, useQuotes 훅(정렬키·staleTime 60s·enabled), build+46tests clean, 리뷰 clean)
Task 4: complete (commit 0ceb3e6, AssetSheet 심볼·수량 입력(주식·코인, isMarket 게이트), build+46tests clean, 리뷰 clean)
Task 5: complete (commit 63e6a86, AssetsScreen+HubScreen 시세 반영·새로고침·시세 배지, build+46tests clean, 리뷰 clean)
최종 whole-branch 리뷰(opus): READY TO MERGE, 치명/중요 0. 통화 환산·두 화면 순자산 일치·폴백·vercel /api 라우팅 정상. Minor: quantity 마스크 다중 점 허용(→수동 다운그레이드, 무해) + 기존 로그 Minor.


=== 아카이빙(독립 서비스) 태스크 진행 (branch feat/archive, plan 2026-07-12-archive.md) ===
Task 1: complete (commit eed55c8, 타입+lib/archive TDD 6tests, 리뷰 clean; Minor: normalizeUrl "도트 포함" 검증 느슨 — 스펙대로, 무해)
Task 2: complete (commit a7e5c9f, schema-archive.sql — 컨트롤러 직접 검증, 스펙 일치)
Task 3: complete (commit b151b15, api/preview.js OG 프록시, node --check clean, 리뷰 clean; Minor: r.ok 미검사(404 페이지 title 반환 가능) + SSRF 미제한 — 2인 비공개 저위험, 최종검토 트리아지)
Task 4: complete (commit a1c7a13, useArchive 훅 CRUD·토글·미리보기 fetch + 실시간 2구독, build clean, 리뷰 clean)
Task 5: complete (commit 0f3abf2, ArchiveItemSheet+FolderSheet, build clean, 리뷰 clean; Minor: editing-파생 useState는 mount 시만 초기화 — Task6가 close→open으로 항상 리마운트하므로 무해, AssetSheet와 동일)
Task 6: complete (commit faaf78e, ArchiveScreen+/archive 라우트+홈 아카이빙 카드, build+52tests clean, 리뷰 clean)
최종 whole-branch 리뷰(opus): READY TO MERGE, 치명/중요 0. Minor 3: (1)체크 토글 시 updated_at bump→목록 최상단 점프 UX(수정예정) (2)빠른 연속 탭 stale-closure 경합(2인 저위험) (3)링크 URL 편집시 옛 preview 유지. 사전 로그 Minor 3(r.ok/SSRF/normalizeUrl) 모두 병합 무해 판정.
리뷰수정: complete — useToggleCheck updated_at 제거(Minor#1), build+52tests clean.
main 병합(456e5e6)+푸시 완료 → Vercel 자동배포. 사용자 schema-archive.sql 실행 완료. 두 계정 런타임 검증(카드3종·미리보기·실시간·폴더) 모두 확인 완료. *** 아카이빙 기능 전부 완성·배포·검증 완료. ***


=== 아카이빙 고도화(2단계) 태스크 진행 (branch feat/archive-v2, plan 2026-07-12-archive-phase2.md) ===
Task 1: complete (commit 808e9f5, schema-archive-2.sql — 컨트롤러 직접 검증, 스펙 일치)
Task 2: complete (commit 5ddecfb, 타입+lib 확장 TDD 16tests, 리뷰 clean)
Task 3: complete (commit d049487, useArchive parent_id·업로드·이미지삭제 + 옛시트 임시패치, build clean, 리뷰 clean)
Task 4: complete (commit f19371a, FolderSheet 서브폴더+비었을때만삭제, build clean, 리뷰 clean)
Task 5: complete (commit 124f9a8, FolderDrawer 좌측 드로어 — 컨트롤러 직접 검증 스펙 일치, build clean)
Task 6: complete (commit 9f617a2, ArchiveItemSheet 사진·필수폴더·핀·기한·색상·보관, build clean, 리뷰 clean)
Task 7: complete (commit bd1c464, ArchiveScreen 재구성+countByFolder 제거, build+61tests clean, 리뷰 clean)
최종 whole-branch 리뷰(opus): READY TO MERGE, 치명/중요 0. Minor 5. #4(삭제된 폴더 선택 stale→추가시 FK에러) 수정(commit: effSel 폴백, build+61tests clean). 남은 Minor(이미지 교체/취소시 스토리지 고아파일·folder_id FK still set null·legacy null카드·이름순 무제목) 스펙 범위내 무해로 이월.
main 병합(64dcc22 push) → Vercel 배포 완료. 사용자 schema-archive-2.sql 실행 + Storage archive 버킷 확인 완료. 배포본 사진 업로드 정상 동작 확인. *** 아카이빙 고도화(2단계) 전부 완성·배포·검증 완료. ***


=== 폴더 드래그 순서변경 태스크 진행 (branch feat/folder-reorder, plan 2026-07-12-archive-folder-reorder.md) ===
Task 1: complete (commit ff7c70e, moveItem TDD 20tests, 컨트롤러 직접 검증 스펙 일치)
Task 2: complete (commit ce90290, useReorderFolders 훅, build clean, 컨트롤러 직접 검증)
Task 3: complete (commit 3530977, FolderDrawer 롱프레스 드래그, build+66tests clean; 리뷰 Important 1(FolderButton 리마운트→포인터캡처 유실)+Minor 2 발견)
리뷰수정: complete (commit 9006334, folderButton 인라인화(리마운트 해결)+캐럿 확대(사용자요청)+무변경 저장 스킵, build+66tests clean, 재리뷰 clean)
최종 whole-branch 리뷰(opus): READY TO MERGE, 치명/중요 0. 정렬순서 지속·그룹 스코핑·실시간·탭vs드래그 모두 정상. Minor: touch-action pan-y가 폰에서 세로 드래그를 스크롤로 가로챌 가능성(실기기 확인 필요, 문제 시 드래그중 touch-action none으로 전환) + 탭 6px지터시 미선택 + 드롭시 순간 스냅백 플리커 + partial mutation 롤백없음. 모두 무해/후속.

=== 캘린더 뷰 태스크 진행 (branch feat/calendar, plan 2026-07-14-calendar.md, base 0a96db5) ===
Task 1: complete (commit 5836267, calendar.ts 순수함수 TDD 14tests + date.todayISO, build+81tests clean, 리뷰 clean; Minor: 사설헬퍼명 iso가 DayCell.iso와 동명(무해))
Task 2: complete (commits 22a1769 + 5a6000a, schema-calendar.sql·types memo제거·시트 기한 체크리스트전용필수·ArchiveScreen memo분기제거, build+81tests clean)
  리뷰 Important 1: 종류전환 시 stale dueDate가 링크·사진 payload에 실려감 → 수정(meta.due_date를 kind==='checklist'로 스코프), 재리뷰 clean.
  Minor(plan-mandated): SQL에 비체크리스트 due_date 금지 대칭 제약 없음(앱단 방어만). 최종리뷰 트리아지 대상.
  ※ 사용자 supabase/schema-calendar.sql 미실행 — 병합 전 실행 필요(메모 카드 영구삭제 포함).
Task 3: complete (commit 8db9cc4, ChecklistCard 추출 + ArchiveScreen 교체, build+81tests clean, 리뷰 clean)
  Important(plan-mandated): COLOR_HEX 맵이 ChecklistCard와 ArchiveScreen에 중복(자기완결성 위해 계획이 명시 요구). → 최종 트리아지에서 사용자 판단(lib/archive.ts로 공유 export 승격 가능).
Task 4: complete (commit fe75a0a, CalendarScreen + /calendar 라우트 + 홈 Calendar 진입점 + max-w-2xl, build+81tests clean, 리뷰 clean)
  Minor: 하단 목록 제목엔 지난기한 빨강 미적용(그리드엔 적용) / groupByDue·monthGrid 매 렌더 재계산(무해) / 스와이프 pointerId 미추적(멀티터치 엣지).
최종 whole-branch 리뷰(opus): 치명 1 + 중요 1 발견.
  치명: schema-calendar.sql의 `not valid` 제약이 잘못됨 — NOT VALID는 초기 스캔만 건너뛸 뿐 이후 UPDATE에는 적용됨.
        기한 없는 기존 체크리스트의 체크 토글(update)이 23514로 조용히 실패했을 것. → 백필 추가 + 일반 제약으로 교체.
  중요: 스와이프가 월 이동과 날짜 선택을 동시에 발동(셀 버튼 위 click). → swiped 플래그 가드.
리뷰수정: complete (commit 4d959e5 백필·스와이프가드·todayISO중복제거 / 4614d56 플래그를 onDown에서 초기화 + 백필 KST 기준).
  ※ 4d959e5의 스와이프 가드는 불완전했음(셀 경계 넘는 스와이프는 click이 그리드에 떨어져 플래그가 안 지워짐 → 다음 탭 삼킴). 4614d56에서 onDown 초기화로 해결.
재검증(opus): VERIFIED — READY TO MERGE. 7가지 제스처 시퀀스 전부 정상. 마이그레이션 순서·멱등성 정상.
남은 Minor(이월): COLOR_HEX 중복(plan-mandated) / 비체크리스트 due_date 대칭제약 없음 / 하단목록 제목 지난기한 빨강 미적용 / useMemo 없음 / 멀티터치 pointerId / ChecklistCard·시트의 bg-white(다크모드 스펙에서 처리).
사용자 schema-calendar.sql 실행 완료. main 병합(cf7beb6) + 푸시 완료 → Vercel 자동배포.
*** 캘린더 뷰 전부 완성·병합·배포. 남은 것: 배포본 런타임 검증(두 계정), 그리고 다음 스펙 = 앱 전체 다크모드. ***

=== 다크모드 태스크 진행 (branch feat/dark-mode, plan 2026-07-14-dark-mode.md, base 53bb265) ===
DM Task 1: complete (commit ff23ee8, CSS변수 RGB채널 토큰 9종 + tailwind 매핑 + theme.ts TDD 5tests + 깜빡임방지 + main 부팅적용, build+86tests clean, 리뷰 clean)
  리뷰 Important(plan-mandated): theme-color 메타가 브랜드파랑 → 라이트 흰색/다크 진회색으로 바뀜(라이트도 기존과 달라짐). → 사용자 판단: "테마 따라 바꾸기(계획대로)" 확정.
DM Task 2: complete (commit c839910, ThemeToggle + 홈메뉴 하단 배치, build+86tests clean, 리뷰 clean)
DM Task 3: complete (commit e00d863, #F04452 25곳→danger / #0ca30c 2곳→positive / 뱃지틴트 통일(bg-brand10, bg-danger10) / StatsScreen 인라인style→className, build+86tests clean, 리뷰 clean)
DM Task 4: complete (commit 52f0bfd, bg-white 18→surface / bg-black9→dim / border-card 6→line / NO_COLOR→rgb(var(--sub)), build+86tests clean, 리뷰 clean) *** 다크모드 색 교체 완료 ***
DM Task 5: complete (commit 7a0e346, NavButton 알약 + 9개 화면 교체 + 죽은 nav/useNavigate 6곳 정리, build+86tests clean, 리뷰 clean; 9개 목적지 전부 동일 확인, FixedManage 조건부 라벨 유지)
최종 whole-branch 리뷰(opus): 치명 1 + 중요 4 + 사소 발견.
  치명: bg-ink text-white 2곳(보관함/보관 토글) — 다크에서 ink가 near-white라 흰글씨 안보임 → text-bg로.
  중요: border-white 구분선 2곳(계산기) / theme-color 정적meta+manifest가 브랜드파랑이라 콜드로드시 파랑→테마색 점프 / color-scheme 미선언(다크에서 date·select·스크롤바가 라이트로) / NavButton 5곳 누락(계획이 9곳으로 오산, 실제 14곳 — 9알약+5회색링크로 더 비일관)
  사소: Donut 트랙 stroke #F2F4F6(다크에서 흰 반점) / centerLabel fill / ring-offset 흰 후광.
리뷰수정: complete (commit 69ebae9, 7건 전부). 재검증(opus): VERIFIED — READY TO MERGE. 하드코딩 색 잔여 = CAT_COLORS·ARCHIVE_COLORS(의도적 제외) + theme.ts 상태바 상수뿐.
