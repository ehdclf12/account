-- RLS를 "로그인한 아무나"에서 "우리 부부 두 계정"으로 좁힌다.
--
-- ⚠️ 접근 권한을 바꾸는 마이그레이션입니다. 아래 이메일이 실제 로그인
--    계정과 정확히 일치하는지 먼저 확인하고 실행하세요.
--    (틀리면 두 사람 모두 데이터에 접근하지 못하게 됩니다)
--
-- 배경: 기존 정책은 전부 `for all to authenticated using (true)` 였다.
-- 즉 DB가 보장하는 건 "유효한 JWT가 있다"뿐이고, 부부 두 계정으로
-- 제한하는 유일한 장치는 브라우저에서만 실행되는 src/lib/users.ts 였다.
-- Supabase 대시보드에서 이메일 가입이 열려 있으면 누구나 가입 후
-- 번들에 공개된 anon key로 전체 장부를 읽고 쓸 수 있다.
--
-- 이 파일은 src/lib/users.ts 의 BY_EMAIL 과 짝을 이룬다. 한쪽을 바꾸면
-- 다른 쪽도 함께 바꿔야 한다.

create or replace function public.is_household_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'ehdclf12@naver.com',
    'tmxlclt@naver.com'
  )
$$;

revoke all on function public.is_household_member() from public;
grant execute on function public.is_household_member() to authenticated;

-- 11개 테이블의 auth_all 정책을 이메일 스코프로 교체
do $$
declare
  t text;
begin
  foreach t in array array[
    'app_settings', 'profiles', 'categories', 'payment_methods', 'transactions',
    'budgets', 'fixed_costs', 'savings_goals', 'assets',
    'archive_folders', 'archive_items'
  ]
  loop
    -- 재실행 안전: 이전 이름과 새 이름을 모두 지우고 다시 만든다
    execute format('drop policy if exists auth_all on public.%I', t);
    execute format('drop policy if exists household_only on public.%I', t);
    execute format(
      'create policy household_only on public.%I for all to authenticated '
      || 'using (public.is_household_member()) with check (public.is_household_member())', t);
    raise notice '정책 교체: %', t;
  end loop;
end $$;

-- 스토리지: archive 버킷을 익명 읽기에서 차단한다.
-- (기존 archive_read 는 `to` 절이 없어 anon 도 읽을 수 있었다 = 업로드한
--  영수증·사진이 URL만 알면 전부 공개)
--
-- ⚠️ 버킷이 public 이면 정책과 무관하게 공개 URL로 접근됩니다.
--    아래 한 줄로 비공개 전환하면 앱의 getPublicUrl 방식은 더 이상
--    동작하지 않으므로, 서명 URL(createSignedUrl)로 코드도 함께 바꿔야
--    합니다. 지금은 주석 처리해 두었습니다 — 코드 변경과 함께 진행하세요.
-- update storage.buckets set public = false where id = 'archive';

drop policy if exists archive_read on storage.objects;
create policy archive_read on storage.objects
  for select to authenticated
  using (bucket_id = 'archive' and public.is_household_member());

drop policy if exists archive_write on storage.objects;
create policy archive_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'archive' and public.is_household_member());

drop policy if exists archive_delete on storage.objects;
create policy archive_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'archive' and public.is_household_member());

-- 확인용: 실행 후 아래로 정책이 의도대로 바뀌었는지 확인
--   select tablename, policyname, qual from pg_policies
--   where schemaname = 'public' order by tablename;
