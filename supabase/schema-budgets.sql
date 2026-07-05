-- 예산 기능: 카테고리 × 월별 예산. Phase 1·2 스키마 실행 후 SQL Editor에서 실행.

create table budgets (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  month text not null,              -- 'YYYY-MM'
  amount bigint not null default 0 check (amount >= 0),
  unique (category_id, month)
);

alter table budgets enable row level security;
create policy auth_all on budgets for all to authenticated using (true) with check (true);
