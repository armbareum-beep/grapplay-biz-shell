-- ───────────────────────────────────────────────────────────
-- 보안: PDF 비공개 전환 3단계 — 공개 주소 컬럼 제거
--
-- 1단계(20260926000000_private_pdfs.sql)에서 비공개 버킷 경로(pdf_path, reward_pdf_path)로
-- 옮겼고, 관리자 "기존 PDF 이전"으로 기존 파일 복사를 마쳤다. 누구나 조회 가능하던
-- 공개 URL 컬럼을 제거한다. (covers/ebook-pdfs/, covers/course-pdfs/ 파일은
-- Supabase 대시보드 Storage에서 삭제 — SQL로 storage.objects 직접 삭제 불가)
--
-- 아직 비공개로 옮기지 않은 행(운영: 확인 쿼리로 0건 확인 후 적용 / 새 DB: 시드 eb1~eb4)은
-- 주소를 잃지 않도록 legacy_pdf_urls 백업 테이블에 남긴 뒤 컬럼을 지운다.
-- 백업 테이블은 RLS 정책 없음 = 클라이언트 접근 불가(SQL Editor에서만 조회).
--
-- ⚠️ 적용 순서: 이 컬럼을 쓰지 않는 프론트가 배포된 뒤에 실행할 것. 재실행 안전.
-- ───────────────────────────────────────────────────────────
create table if not exists legacy_pdf_urls (
  item_type  text not null check (item_type in ('ebook', 'reward')),
  item_id    text not null,
  url        text not null,
  backed_up_at timestamptz not null default now(),
  primary key (item_type, item_id)
);
alter table legacy_pdf_urls enable row level security;
revoke all on table legacy_pdf_urls from anon, authenticated;

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'ebooks' and column_name = 'pdf_url') then
    execute $q$
      insert into legacy_pdf_urls (item_type, item_id, url)
      select 'ebook', id, pdf_url from ebooks where pdf_url is not null and pdf_path is null
      on conflict (item_type, item_id) do update set url = excluded.url, backed_up_at = now()
    $q$;
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'courses' and column_name = 'review_reward_pdf_url') then
    execute $q$
      insert into legacy_pdf_urls (item_type, item_id, url)
      select 'reward', id, review_reward_pdf_url from courses
       where review_reward_pdf_url is not null and reward_pdf_path is null
      on conflict (item_type, item_id) do update set url = excluded.url, backed_up_at = now()
    $q$;
  end if;
end $$;

alter table ebooks  drop column if exists pdf_url;
alter table courses drop column if exists review_reward_pdf_url;
