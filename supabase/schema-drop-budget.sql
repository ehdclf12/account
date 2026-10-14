-- 예산(Budget) 기능 제거: 가계부·예산·고정비·저축·자산 테이블을 삭제한다.
--
-- ⚠️ 되돌릴 수 없습니다. 데이터가 영구 삭제됩니다.
-- ⚠️ 반드시 Budget 화면을 지운 코드가 Vercel에 배포된 "뒤에" 실행하세요.
--    (먼저 실행하면 배포 전 앱이 없는 테이블을 조회하다 에러가 납니다)
-- Supabase 대시보드 → 프로젝트 gkblndlotwdyoaxfyevs → SQL Editor 에서 실행.
-- 테이블을 지우면 realtime publication 과 RLS 정책도 함께 사라진다.

drop table if exists
  public.transactions,
  public.budgets,
  public.fixed_costs,
  public.savings_goals,
  public.assets,
  public.categories,
  public.payment_methods
cascade;
