-- 저축 목표: 목표 테이블 + transactions.savings_goal_id 연결 + categories.is_savings.
-- Phase 1·2·예산·고정비 실행 후 SQL Editor에서 실행. 재실행해도 안전(idempotent).

create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_amount bigint not null default 0 check (target_amount >= 0),
  target_year int check (target_year between 2020 and 2100),
  target_quarter int check (target_quarter between 1 and 4),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table transactions add column if not exists savings_goal_id
  uuid references savings_goals(id) on delete set null;

alter table categories add column if not exists is_savings boolean not null default false;

-- '저축' 가계 지출 카테고리 시드 (없을 때만)
insert into categories (name, icon, type, is_fixed, sort_order, scope, is_fund_transfer, is_savings)
select '저축', '', 'expense', false, 99, 'household', false, true
where not exists (select 1 from categories where scope = 'household' and is_savings = true);

alter table savings_goals enable row level security;
drop policy if exists auth_all on savings_goals;
create policy auth_all on savings_goals for all to authenticated using (true) with check (true);
