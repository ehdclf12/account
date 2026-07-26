-- 시간관리 3차: 목표(체크 가능한 대목표 + 서브목표 체크리스트) + 고정 명언.
-- schema-time-groups.sql 실행 후 SQL Editor에서 실행. 재실행해도 안전(idempotent).

create table if not exists time_goals (
  id uuid primary key default gen_random_uuid(),
  who text not null check (who in ('husband','wife')),
  title text not null check (char_length(title) between 1 and 40),
  checklist jsonb not null default '[]'::jsonb,   -- ChecklistEntry[] { text, done }
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists time_goals_who on time_goals (who, sort_order);

alter table time_goals enable row level security;
drop policy if exists household_only on time_goals;
create policy household_only on time_goals for all to authenticated
  using (public.is_household_member()) with check (public.is_household_member());

-- 명언: 사람당 한 행(who PK). 없으면 행이 없고, 앱은 빈 문자열로 취급한다.
create table if not exists time_quotes (
  who text primary key check (who in ('husband','wife')),
  text text not null default '',
  updated_at timestamptz not null default now()
);

alter table time_quotes enable row level security;
drop policy if exists household_only on time_quotes;
create policy household_only on time_quotes for all to authenticated
  using (public.is_household_member()) with check (public.is_household_member());

do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'time_goals') then
    alter publication supabase_realtime add table public.time_goals;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'time_quotes') then
    alter publication supabase_realtime add table public.time_quotes;
  end if;
end $$;
