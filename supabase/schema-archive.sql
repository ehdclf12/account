-- 아카이빙(독립 서비스): 메모·체크리스트·링크 카드 + 폴더.
-- Supabase SQL Editor에서 실행. 재실행해도 안전(idempotent).

create table if not exists archive_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists archive_items (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references archive_folders(id) on delete set null,
  kind text not null check (kind in ('memo','checklist','link')),
  title text not null default '',
  body text,             -- memo 본문
  url text,              -- link URL
  preview jsonb,         -- link OG {title,description,image,site}
  checklist jsonb,       -- checklist [{text,done}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table archive_folders enable row level security;
alter table archive_items   enable row level security;
drop policy if exists auth_all on archive_folders;
drop policy if exists auth_all on archive_items;
create policy auth_all on archive_folders for all to authenticated using (true) with check (true);
create policy auth_all on archive_items   for all to authenticated using (true) with check (true);

-- 실시간 구독 대상에 포함(이미 있으면 무시)
alter publication supabase_realtime add table archive_folders;
alter publication supabase_realtime add table archive_items;
