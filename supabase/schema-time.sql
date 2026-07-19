-- 시간관리(블럭 타이머) 1단계.
-- SQL Editor에서 실행. 재실행해도 안전(idempotent).

create table if not exists time_blocks (
  id uuid primary key default gen_random_uuid(),
  who text not null check (who in ('husband','wife')),
  name text not null check (char_length(name) between 1 and 16),
  emoji text not null default '⏱️',
  color text,
  sort_order int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists time_sessions (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references time_blocks(id) on delete cascade,
  who text not null check (who in ('husband','wife')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  -- 종료가 시작보다 빠른 행을 막는다
  constraint time_sessions_range check (ended_at is null or ended_at >= started_at)
);

create index if not exists time_sessions_who_started
  on time_sessions (who, started_at desc);
create index if not exists time_sessions_block
  on time_sessions (block_id);

-- 진행 중(ended_at is null) 세션은 사람당 하나만.
-- 앱에서도 막지만, 두 기기에서 동시에 시작하는 경합은 앱 로직으로 못 막는다.
create unique index if not exists time_sessions_one_running
  on time_sessions (who) where ended_at is null;

alter table time_blocks   enable row level security;
alter table time_sessions enable row level security;

-- 접근은 기존과 같은 부부 스코프. 개인 분리는 앱에서 who로 조회한다.
-- (상대 기록을 기술적으로도 막으려면 이메일↔who 매핑 정책이 필요 — 현재는 앱이 안 보여줄 뿐)
drop policy if exists household_only on time_blocks;
create policy household_only on time_blocks for all to authenticated
  using (public.is_household_member()) with check (public.is_household_member());

drop policy if exists household_only on time_sessions;
create policy household_only on time_sessions for all to authenticated
  using (public.is_household_member()) with check (public.is_household_member());

-- 실시간: 다른 기기에서 시작/정지한 것이 바로 반영되도록
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'time_blocks'
  ) then
    alter publication supabase_realtime add table public.time_blocks;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'time_sessions'
  ) then
    alter publication supabase_realtime add table public.time_sessions;
  end if;
end $$;
