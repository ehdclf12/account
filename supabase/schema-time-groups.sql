-- 시간관리 2차: 블럭 그룹 + 아이콘 컬럼.
-- schema-time.sql 실행 후 SQL Editor에서 실행. 재실행해도 안전(idempotent).

create table if not exists time_block_groups (
  id uuid primary key default gen_random_uuid(),
  who text not null check (who in ('husband','wife')),
  name text not null check (char_length(name) between 1 and 20),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- group_id가 null인 블럭은 '일반 블럭'으로 묶어 보여준다(레퍼런스와 동일).
-- 그룹을 지워도 블럭은 남기고 일반으로 내린다.
alter table time_blocks
  add column if not exists group_id uuid references time_block_groups(id) on delete set null;

-- 아이콘: 이모지 대신 아이콘 키('book','dumbbell' …)를 저장한다.
-- 기존 emoji 값은 그대로 옮겨두고, 앱은 키를 못 찾으면 문자열을 그대로 그린다.
alter table time_blocks add column if not exists icon text;
update time_blocks set icon = emoji where icon is null;
alter table time_blocks alter column emoji drop not null;

create index if not exists time_blocks_group on time_blocks (group_id);

alter table time_block_groups enable row level security;
drop policy if exists household_only on time_block_groups;
create policy household_only on time_block_groups for all to authenticated
  using (public.is_household_member()) with check (public.is_household_member());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'time_block_groups'
  ) then
    alter publication supabase_realtime add table public.time_block_groups;
  end if;
end $$;
