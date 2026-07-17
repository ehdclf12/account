-- 체크리스트 카드 전체의 완료 여부(하위 항목이 없어도 완료 처리 가능)
alter table archive_items add column if not exists done boolean not null default false;
