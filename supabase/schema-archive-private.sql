-- archive 버킷을 비공개로 전환한다.
--
-- 배경: schema-rls-scope.sql 에서 storage.objects 정책은 부부 두 계정으로
-- 좁혔지만, 버킷 자체가 public 이면 정책과 무관하게 공개 URL로 파일이
-- 열린다(= 업로드한 영수증·사진이 URL만 알면 전부 노출). 그 한 줄은
-- 앱이 아직 getPublicUrl 을 쓰고 있어서 주석 처리해 두었던 것이다.
--
-- ⚠️ 실행 순서: 서명 URL을 쓰는 앱 코드를 먼저 배포한 뒤 실행할 것.
--    (서명 URL은 public 버킷에서도 동작하므로 코드 선배포는 안전하다.
--     반대로 이 SQL을 먼저 돌리면 배포 전까지 사진이 깨져 보인다)
--
-- 짝이 되는 코드: src/hooks/useArchive.ts 의 useSignedArchiveUrls /
-- uploadArchiveImage, src/lib/archive.ts 의 archiveStoragePath.

update storage.buckets set public = false where id = 'archive';

-- 확인용: false 로 바뀌었는지
--   select id, public from storage.buckets where id = 'archive';
--
-- 확인용: 정책이 부부 계정으로 좁혀져 있는지(schema-rls-scope.sql 선행 필요)
--   select policyname, cmd, roles from pg_policies
--   where schemaname = 'storage' and tablename = 'objects';
