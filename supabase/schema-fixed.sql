-- 고정비 관리: 정기 지출 템플릿 + 이번 달 등록 추적. Phase 1·2·예산 실행 후 SQL Editor에서 실행.

create table fixed_costs (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'household' check (scope in ('household','business')),
  name text not null,
  amount bigint not null default 0 check (amount >= 0),
  category_id uuid references categories(id) on delete set null,
  day int not null default 1 check (day between 1 and 31),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 어떤 거래가 어떤 고정비로 등록됐는지 연결 (이번 달 등록 여부 판단)
alter table transactions add column fixed_cost_id uuid references fixed_costs(id) on delete set null;

alter table fixed_costs enable row level security;
create policy auth_all on fixed_costs for all to authenticated using (true) with check (true);
