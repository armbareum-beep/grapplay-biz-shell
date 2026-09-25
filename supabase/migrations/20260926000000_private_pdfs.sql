-- ───────────────────────────────────────────────────────────
-- 보안: 전자책 PDF · 리뷰 리워드 PDF 비공개 전환 (1단계 — 새 경로 추가)
--
-- 기존: PDF가 공개 버킷 covers/(ebook-pdfs|course-pdfs)/ 에 있고, 주소(ebooks.pdf_url,
--       courses.review_reward_pdf_url)가 공개 조회라 결제·리뷰 없이 누구나 받을 수 있었다.
-- 변경: 비공개 버킷에 저장하고, 스토리지 RLS가 읽을 자격을 판단한다.
--       클라이언트는 createSignedUrl(만료 1시간)로만 연다.
--   - ebook-files  : {expert_id}/{ebook_id}/{uuid}.pdf  → 구매자·소유 전문가·관리자만 읽기
--   - reward-files : {expert_id}/{course_id}/{uuid}.pdf → 해당 강의 리뷰 작성자(숨김 제외)·소유 전문가·관리자만 읽기
--   - 쓰기(업로드/수정/삭제)는 경로 첫 폴더가 본인 expert_id인 경우 또는 관리자만.
--   - 상세 미리보기는 앞 N쪽만 잘라낸 별도 PDF(공개 covers/ebook-previews/)를 쓴다.
--
-- 기존 컬럼(pdf_url, review_reward_pdf_url)은 이전이 끝날 때까지 폴백으로 유지하고
-- 3단계에서 제거한다. 재실행 안전.
-- ───────────────────────────────────────────────────────────

alter table ebooks  add column if not exists pdf_path          text; -- ebook-files 버킷 내 경로
alter table ebooks  add column if not exists preview_pdf_url   text; -- 앞 N쪽 미리보기 PDF (공개)
alter table courses add column if not exists reward_pdf_path   text; -- reward-files 버킷 내 경로

-- ── 비공개 버킷 (PDF만, 200MB 제한) ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('ebook-files',  'ebook-files',  false, 209715200, array['application/pdf']),
  ('reward-files', 'reward-files', false, 209715200, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── 자격 판단 헬퍼 (security definer: enrollments/course_reviews/auth.users RLS 우회해 판단만) ──
create or replace function public.can_read_ebook_file(p_ebook_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.enrollments e
     where e.user_id = auth.uid() and e.item_type = 'ebook' and e.item_id = p_ebook_id
  )
$$;

create or replace function public.can_read_reward_file(p_course_id text)
returns boolean language sql stable security definer set search_path = public as $$
  -- course_reviews엔 user_id가 없고, user_email은 트리거(set_review_author)가 인증 신원으로 고정한다.
  select exists (
    select 1 from public.course_reviews r
      join auth.users u on u.email = r.user_email
     where u.id = auth.uid() and r.course_id = p_course_id and not r.hidden
  )
$$;

revoke execute on function public.can_read_ebook_file(text)  from public, anon;
revoke execute on function public.can_read_reward_file(text) from public, anon;
grant  execute on function public.can_read_ebook_file(text)  to authenticated;
grant  execute on function public.can_read_reward_file(text) to authenticated;

-- ── ebook-files 정책 ──
drop policy if exists "ebook-files read" on storage.objects;
create policy "ebook-files read" on storage.objects for select to authenticated using (
  bucket_id = 'ebook-files' and (
    is_admin()
    or (storage.foldername(name))[1] = current_expert_id()
    or can_read_ebook_file((storage.foldername(name))[2])
  )
);
drop policy if exists "ebook-files insert" on storage.objects;
create policy "ebook-files insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'ebook-files' and (is_admin() or (storage.foldername(name))[1] = current_expert_id())
);
drop policy if exists "ebook-files update" on storage.objects;
create policy "ebook-files update" on storage.objects for update to authenticated
  using      (bucket_id = 'ebook-files' and (is_admin() or (storage.foldername(name))[1] = current_expert_id()))
  with check (bucket_id = 'ebook-files' and (is_admin() or (storage.foldername(name))[1] = current_expert_id()));
drop policy if exists "ebook-files delete" on storage.objects;
create policy "ebook-files delete" on storage.objects for delete to authenticated using (
  bucket_id = 'ebook-files' and (is_admin() or (storage.foldername(name))[1] = current_expert_id())
);

-- ── reward-files 정책 ──
drop policy if exists "reward-files read" on storage.objects;
create policy "reward-files read" on storage.objects for select to authenticated using (
  bucket_id = 'reward-files' and (
    is_admin()
    or (storage.foldername(name))[1] = current_expert_id()
    or can_read_reward_file((storage.foldername(name))[2])
  )
);
drop policy if exists "reward-files insert" on storage.objects;
create policy "reward-files insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'reward-files' and (is_admin() or (storage.foldername(name))[1] = current_expert_id())
);
drop policy if exists "reward-files update" on storage.objects;
create policy "reward-files update" on storage.objects for update to authenticated
  using      (bucket_id = 'reward-files' and (is_admin() or (storage.foldername(name))[1] = current_expert_id()))
  with check (bucket_id = 'reward-files' and (is_admin() or (storage.foldername(name))[1] = current_expert_id()));
drop policy if exists "reward-files delete" on storage.objects;
create policy "reward-files delete" on storage.objects for delete to authenticated using (
  bucket_id = 'reward-files' and (is_admin() or (storage.foldername(name))[1] = current_expert_id())
);
