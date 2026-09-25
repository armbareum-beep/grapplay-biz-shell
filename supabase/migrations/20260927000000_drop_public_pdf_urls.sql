-- ───────────────────────────────────────────────────────────
-- 보안: PDF 비공개 전환 3단계 — 공개 주소 컬럼 제거
--
-- 1단계(20260926000000_private_pdfs.sql)에서 비공개 버킷 경로(pdf_path, reward_pdf_path)로
-- 옮겼고, 관리자 "기존 PDF 이전"으로 기존 파일 복사를 마쳤다. 누구나 조회 가능하던
-- 공개 URL 컬럼을 제거한다. (covers/ebook-pdfs/, covers/course-pdfs/ 파일은
-- Supabase 대시보드 Storage에서 삭제 — SQL로 storage.objects 직접 삭제 불가)
--
-- ⚠️ 적용 순서: 이 컬럼을 쓰지 않는 프론트가 배포된 뒤에 실행할 것.
--    아직 옮기지 않은 행이 있으면 중단한다(데이터 유실 방지). 재실행 안전.
-- ───────────────────────────────────────────────────────────
do $$
declare
  v_left integer := 0;
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'ebooks' and column_name = 'pdf_url') then
    execute 'select count(*) from ebooks where pdf_url is not null and pdf_path is null' into v_left;
  end if;
  if v_left > 0 then
    raise exception '비공개로 옮기지 않은 전자책 PDF가 %건 있습니다. 먼저 이전하세요.', v_left;
  end if;

  v_left := 0;
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'courses' and column_name = 'review_reward_pdf_url') then
    execute 'select count(*) from courses where review_reward_pdf_url is not null and reward_pdf_path is null' into v_left;
  end if;
  if v_left > 0 then
    raise exception '비공개로 옮기지 않은 리워드 PDF가 %건 있습니다. 먼저 이전하세요.', v_left;
  end if;
end $$;

alter table ebooks  drop column if exists pdf_url;
alter table courses drop column if exists review_reward_pdf_url;
