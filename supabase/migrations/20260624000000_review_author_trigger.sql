-- ───────────────────────────────────────────────────────────
-- 리뷰 작성자 위조 방지 — insert 시 user_name/user_email을 클라이언트 값이 아니라
-- 로그인한 본인(auth.uid())의 실제 정보로 덮어쓴다. (RLS는 "구매자만 작성"을 강제하고,
-- 이 트리거는 "누가 썼는지"를 인증 신원으로 고정한다.) 강의/전자책 리뷰 공통. 재실행 안전.
-- ───────────────────────────────────────────────────────────
create or replace function set_review_author()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_name  text;
begin
  select u.email, coalesce(p.display_name, u.email)
    into v_email, v_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = auth.uid();

  -- 클라이언트가 보낸 값은 신뢰하지 않고 인증 신원으로 강제
  new.user_email := v_email;
  new.user_name  := coalesce(v_name, '회원');
  return new;
end $$;

drop trigger if exists trg_course_review_author on course_reviews;
create trigger trg_course_review_author
  before insert on course_reviews
  for each row execute function set_review_author();

drop trigger if exists trg_ebook_review_author on ebook_reviews;
create trigger trg_ebook_review_author
  before insert on ebook_reviews
  for each row execute function set_review_author();
