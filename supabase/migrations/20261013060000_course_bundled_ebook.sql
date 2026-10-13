-- 강의 구매 시 함께 지급할 전자책 (선택). 결제 승인(confirm-payment)에서 강의 수강 등록과 함께 전자책도 등록한다.
alter table public.courses
  add column if not exists bundled_ebook_id text references public.ebooks(id) on delete set null;

comment on column public.courses.bundled_ebook_id is '강의 구매 시 함께 지급하는 전자책 id (없으면 null)';
