-- 아카이빙 고도화(2단계): 폴더 계층 + 카드 확장 + 사진 스토리지.
-- 1단계(schema-archive.sql) 실행 후 SQL Editor에서 실행. 재실행해도 안전(idempotent).

-- 폴더 계층: 서브폴더용 parent_id (null=최상위). 삭제는 앱에서 '비었을 때만' 강제.
alter table archive_folders add column if not exists parent_id uuid references archive_folders(id) on delete restrict;

-- 카드 확장: 핀 / 기한 / 색상 / 보관
alter table archive_items add column if not exists pinned   boolean not null default false;
alter table archive_items add column if not exists due_date date;
alter table archive_items add column if not exists color    text;
alter table archive_items add column if not exists archived boolean not null default false;

-- kind에 'image' 추가: 기존 check 제약 교체
alter table archive_items drop constraint if exists archive_items_kind_check;
alter table archive_items add constraint archive_items_kind_check
  check (kind in ('memo','checklist','link','image'));

-- 사진 저장 공개 버킷
insert into storage.buckets (id, name, public)
  values ('archive','archive', true)
  on conflict (id) do nothing;

-- 버킷 정책: 공개 읽기 + 인증 사용자 쓰기/삭제
drop policy if exists archive_read   on storage.objects;
drop policy if exists archive_write  on storage.objects;
drop policy if exists archive_delete on storage.objects;
create policy archive_read   on storage.objects for select using (bucket_id = 'archive');
create policy archive_write  on storage.objects for insert to authenticated with check (bucket_id = 'archive');
create policy archive_delete on storage.objects for delete to authenticated using (bucket_id = 'archive');
