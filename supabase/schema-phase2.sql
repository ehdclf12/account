-- Phase 2: 사업 장부. Phase 1 schema.sql 실행 후, SQL Editor에서 실행.

alter table categories add column scope text not null default 'household'
  check (scope in ('household','business'));
alter table categories add column is_fund_transfer boolean not null default false;
alter table transactions add column scope text not null default 'household'
  check (scope in ('household','business'));

-- 가계 "사업자금 이체" 카테고리 (양방향 이체 공용: type expense=보내기 / income=받기)
insert into categories (name, icon, type, is_fixed, sort_order, scope, is_fund_transfer)
values ('사업자금 이체','', 'expense', false, 90, 'household', true);

-- 사업 카테고리 (예시 시드 — 이후 자유롭게 추가/삭제)
insert into categories (name, icon, type, is_fixed, sort_order, scope, is_fund_transfer) values
  ('재료비','', 'expense', false, 1, 'business', false),
  ('인건비','', 'expense', false, 2, 'business', false),
  ('임대료','', 'expense', false, 3, 'business', false),
  ('매출','',   'income',  false, 1, 'business', false),
  ('기타수입','','income',  false, 2, 'business', false);
