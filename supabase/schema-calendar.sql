-- 캘린더 도입: 메모 종류 제거 + 기한을 체크리스트 전용 필수값으로.
-- Supabase SQL Editor에서 실행. 재실행해도 안전(idempotent).

-- 1. 메모 카드 전량 삭제
delete from archive_items where kind = 'memo';

-- 2. kind에서 'memo' 제거
alter table archive_items drop constraint if exists archive_items_kind_check;
alter table archive_items add constraint archive_items_kind_check
  check (kind in ('checklist','link','image'));

-- 3. 체크리스트가 아닌 카드의 기한 제거 (기한은 이제 체크리스트 전용)
update archive_items set due_date = null where kind <> 'checklist';

-- 4. 체크리스트는 기한 필수.
--    not valid: 기한 없는 기존 체크리스트가 있어도 마이그레이션이 실패하지 않고,
--    앞으로 들어오는 데이터만 막는다.
alter table archive_items drop constraint if exists archive_items_due_required;
alter table archive_items add constraint archive_items_due_required
  check (kind <> 'checklist' or due_date is not null) not valid;
