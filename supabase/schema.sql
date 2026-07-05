-- 부부 가계부 1단계 스키마 · 시드 · RLS
-- Supabase 대시보드 → SQL Editor 에 전체 붙여넣고 Run.

-- ===== 테이블 =====
create table app_settings (
  id int primary key default 1,
  pin_hash text,
  constraint one_row check (id = 1)
);

create table profiles (
  role text primary key check (role in ('husband','wife')),
  display_name text not null
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default '💸',
  type text not null check (type in ('expense','income')),
  is_fixed boolean not null default false,
  sort_order int not null default 0
);

create table payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default '💳',
  sort_order int not null default 0
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  who text not null check (who in ('husband','wife')),
  type text not null check (type in ('expense','income')),
  amount bigint not null check (amount >= 0),
  category_id uuid references categories(id) on delete set null,
  payment_method_id uuid references payment_methods(id) on delete set null,
  date date not null,
  memo text not null default '',
  created_at timestamptz not null default now()
);
create index transactions_date_idx on transactions(date);

-- ===== 시드 =====
insert into app_settings (id, pin_hash) values (1, null);

insert into profiles (role, display_name) values
  ('husband','남편'), ('wife','아내');

insert into categories (name, icon, type, is_fixed, sort_order) values
  ('식비','🍚','expense',false,1),
  ('교통','🚕','expense',false,2),
  ('생활','🛒','expense',false,3),
  ('주거','🏠','expense',true,4),
  ('여가','🎬','expense',false,5),
  ('의료','💊','expense',false,6),
  ('고정비','💳','expense',true,7),
  ('월급','💰','income',false,1),
  ('기타수입','💵','income',false,2);

insert into payment_methods (name, icon, sort_order) values
  ('신용카드','💳',1), ('체크카드','🏧',2), ('현금','💵',3), ('계좌이체','🏦',4);

-- ===== RLS: 인증(공유계정) 사용자만 전체 접근, 익명 차단 =====
alter table app_settings enable row level security;
alter table profiles enable row level security;
alter table categories enable row level security;
alter table payment_methods enable row level security;
alter table transactions enable row level security;

create policy auth_all on app_settings for all to authenticated using (true) with check (true);
create policy auth_all on profiles for all to authenticated using (true) with check (true);
create policy auth_all on categories for all to authenticated using (true) with check (true);
create policy auth_all on payment_methods for all to authenticated using (true) with check (true);
create policy auth_all on transactions for all to authenticated using (true) with check (true);
