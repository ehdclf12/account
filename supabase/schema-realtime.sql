-- 실시간 동기화 게시(publication) 보정.
-- SQL Editor에서 실행. 재실행해도 안전(idempotent).
--
-- 배경: useRealtime.ts는 9개 테이블을 구독하는데, 레포에 있던
-- `alter publication` 문은 archive_folders / archive_items 둘뿐이었다.
-- 게시되지 않은 테이블을 구독해도 Supabase 클라이언트는 오류를 내지 않고
-- 조용히 아무 이벤트도 받지 않는다. 그래서 한 사람이 거래를 입력해도
-- 상대방 폰에는 앱을 껐다 켜기 전까지 반영되지 않았다.

do $$
declare
  t text;
begin
  foreach t in array array[
    'transactions',
    'categories',
    'payment_methods',
    'budgets',
    'fixed_costs',
    'savings_goals',
    'assets',
    'archive_folders',
    'archive_items'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
      raise notice '게시 추가: %', t;
    else
      raise notice '이미 게시됨: %', t;
    end if;
  end loop;
end $$;

-- 확인용: 실행 후 아래 쿼리로 9개가 모두 나오는지 보면 된다.
--   select tablename from pg_publication_tables
--   where pubname = 'supabase_realtime' and schemaname = 'public'
--   order by tablename;
