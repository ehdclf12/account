-- 자산 현황(⑥ 1단계): 순자산 집계용 assets 테이블. symbol/quantity는 6-2(실시간 시세) 대비 예약.
-- Phase 1·2·예산·고정비·저축 실행 후 SQL Editor에서 실행. 재실행해도 안전(idempotent).

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'etc'
    check (type in ('stock_us','stock_kr','crypto','real_estate','cash','etc','liability')),
  amount bigint not null default 0 check (amount >= 0),
  symbol text,
  quantity numeric,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table assets enable row level security;
drop policy if exists auth_all on assets;
create policy auth_all on assets for all to authenticated using (true) with check (true);
