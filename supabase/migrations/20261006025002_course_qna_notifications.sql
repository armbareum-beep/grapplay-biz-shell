-- Additive migration. Existing courses remain OFF until their owner enables Q&A.
begin;
alter table public.courses add column if not exists qna_enabled boolean not null default false;
create schema if not exists qna_private;
revoke all on schema qna_private from public;
grant usage on schema qna_private to authenticated;

create table if not exists public.course_questions (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name text not null default '수강생',
  content text not null check (char_length(btrim(content)) between 1 and 5000),
  is_public boolean not null default false,
  lesson_index integer check (lesson_index >= 0),
  lesson_title text,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.course_answers (
  question_id uuid primary key references public.course_questions(id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users(id),
  content text not null check (char_length(btrim(content)) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists course_questions_course_created_idx on public.course_questions(course_id, created_at desc, id);
create index if not exists course_questions_pending_idx on public.course_questions(course_id, created_at) where answered_at is null;
create index if not exists course_questions_user_idx on public.course_questions(user_id);

-- These helpers inspect authoritative profiles/enrollments, never JWT user_metadata.
create or replace function qna_private.manages_course(p_course text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles p join public.courses c on c.id = p_course
    where p.id = auth.uid() and (p.role = 'admin' or (p.role = 'expert' and p.expert_id = c.expert_id))
  )
$$;
create or replace function qna_private.enrolled(p_course text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.enrollments e where e.user_id = auth.uid() and e.item_type = 'course' and e.item_id = p_course
  )
$$;
create or replace function qna_private.reads_question(p_question uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.course_questions q where q.id = p_question and
      (q.user_id = auth.uid() or qna_private.manages_course(q.course_id) or (q.is_public and qna_private.enrolled(q.course_id)))
  )
$$;
create or replace function qna_private.answers_question(p_question uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.course_questions q where q.id = p_question and qna_private.manages_course(q.course_id)
  )
$$;
revoke all on all functions in schema qna_private from public;
grant execute on function qna_private.manages_course(text), qna_private.enrolled(text), qna_private.reads_question(uuid), qna_private.answers_question(uuid) to authenticated;

alter table public.course_questions enable row level security;
alter table public.course_answers enable row level security;
revoke all on public.course_questions, public.course_answers from anon, authenticated;
grant select on public.course_questions, public.course_answers to authenticated;
grant insert (course_id, content, is_public, lesson_index) on public.course_questions to authenticated;
grant update (content, is_public) on public.course_questions to authenticated;
grant insert (question_id, content) on public.course_answers to authenticated;
grant update (content) on public.course_answers to authenticated;
grant all on public.course_questions, public.course_answers to service_role;

drop policy if exists qna_question_read on public.course_questions;
create policy qna_question_read on public.course_questions for select to authenticated using (
  user_id = (select auth.uid()) or qna_private.manages_course(course_id) or (is_public and qna_private.enrolled(course_id))
);
drop policy if exists qna_question_insert on public.course_questions;
create policy qna_question_insert on public.course_questions for insert to authenticated with check (
  user_id = (select auth.uid()) and qna_private.enrolled(course_id)
  and exists (select 1 from public.courses c where c.id = course_id and c.qna_enabled)
);
drop policy if exists qna_question_update on public.course_questions;
create policy qna_question_update on public.course_questions for update to authenticated
  using (user_id = (select auth.uid()) and answered_at is null)
  with check (user_id = (select auth.uid()) and answered_at is null);
drop policy if exists qna_answer_read on public.course_answers;
create policy qna_answer_read on public.course_answers for select to authenticated using (qna_private.reads_question(question_id));
drop policy if exists qna_answer_insert on public.course_answers;
create policy qna_answer_insert on public.course_answers for insert to authenticated with check (
  author_id = (select auth.uid()) and qna_private.answers_question(question_id)
);
drop policy if exists qna_answer_update on public.course_answers;
create policy qna_answer_update on public.course_answers for update to authenticated
  using (qna_private.answers_question(question_id)) with check (qna_private.answers_question(question_id));

create or replace function qna_private.prepare_question()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_curriculum jsonb; v_enabled boolean;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if tg_op = 'INSERT' then
    select c.curriculum, c.qna_enabled into v_curriculum, v_enabled from public.courses c where c.id = new.course_id for share;
    if not coalesce(v_enabled, false) then raise exception '새 질문 접수가 중단된 강의입니다.'; end if;
    new.user_id := auth.uid();
    select coalesce(nullif(p.display_name, ''), '수강생') into new.author_name from public.profiles p where p.id = auth.uid();
    -- Never fall back to the account email on a shared question.
    if position('@' in coalesce(new.author_name, '')) > 0 then new.author_name := '수강생'; end if;
    new.author_name := coalesce(new.author_name, '수강생');
    if new.lesson_index is not null then
      if new.lesson_index < 0 or new.lesson_index >= jsonb_array_length(v_curriculum) then raise exception '회차를 다시 선택해 주세요.'; end if;
      new.lesson_title := v_curriculum -> new.lesson_index ->> 'title';
    end if;
    new.answered_at := null;
    new.created_at := now();
  elsif (new.content, new.is_public) is distinct from (old.content, old.is_public) then
    if old.answered_at is not null or exists (select 1 from public.course_answers a where a.question_id = old.id) then
      raise exception '답변이 등록된 질문은 수정할 수 없습니다.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists prepare_course_question on public.course_questions;
create trigger prepare_course_question before insert or update on public.course_questions for each row execute function qna_private.prepare_question();

create or replace function qna_private.prepare_answer()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not qna_private.answers_question(new.question_id) then raise exception '답변 권한이 없습니다.'; end if;
  -- Serialize answer creation against edits of the same question.
  perform 1 from public.course_questions where id = new.question_id for update;
  new.author_id := auth.uid();
  if tg_op = 'INSERT' then new.created_at := now(); end if;
  new.updated_at := now();
  return new;
end $$;
create or replace function qna_private.mark_answered()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.course_questions set answered_at = coalesce(answered_at, now()) where id = new.question_id;
  return new;
end $$;
drop trigger if exists prepare_course_answer on public.course_answers;
create trigger prepare_course_answer before insert or update on public.course_answers for each row execute function qna_private.prepare_answer();
drop trigger if exists mark_course_question_answered on public.course_answers;
create trigger mark_course_question_answered after insert on public.course_answers for each row execute function qna_private.mark_answered();

-- Notifications deliberately contain no question/review body or student contact details.
create table if not exists public.instructor_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  expert_id text not null references public.experts(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  question_id uuid references public.course_questions(id) on delete cascade,
  review_id text references public.course_reviews(id) on delete cascade,
  kind text not null check (kind in ('question', 'review')),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check ((kind = 'question' and question_id is not null and review_id is null) or (kind = 'review' and review_id is not null and question_id is null)),
  unique (recipient_id, question_id), unique (recipient_id, review_id)
);
create index if not exists instructor_notifications_recipient_idx on public.instructor_notifications(recipient_id, created_at desc);
create index if not exists instructor_notifications_unread_idx on public.instructor_notifications(recipient_id) where read_at is null;
alter table public.instructor_notifications enable row level security;
revoke all on public.instructor_notifications from anon, authenticated;
grant select on public.instructor_notifications to authenticated;
grant update (read_at) on public.instructor_notifications to authenticated;
grant all on public.instructor_notifications to service_role;
drop policy if exists instructor_notification_read on public.instructor_notifications;
create policy instructor_notification_read on public.instructor_notifications for select to authenticated
  using (recipient_id = (select auth.uid()) and qna_private.manages_course(course_id));
drop policy if exists instructor_notification_update on public.instructor_notifications;
create policy instructor_notification_update on public.instructor_notifications for update to authenticated
  using (recipient_id = (select auth.uid()) and qna_private.manages_course(course_id))
  with check (recipient_id = (select auth.uid()) and qna_private.manages_course(course_id));

create or replace function qna_private.notify_instructor()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_expert text; v_kind text; v_recipient record;
begin
  -- Only authenticated new submissions create alerts; historical rows are not backfilled.
  if auth.uid() is null then return new; end if;
  select expert_id into v_expert from public.courses where id = new.course_id;
  v_kind := case when tg_table_name = 'course_questions' then 'question' else 'review' end;
  for v_recipient in select p.id from public.profiles p
    where p.expert_id = v_expert and p.role in ('expert','admin') and p.id <> auth.uid()
  loop
    insert into public.instructor_notifications(recipient_id, expert_id, course_id, kind, question_id, review_id)
    values (v_recipient.id, v_expert, new.course_id, v_kind,
      case when v_kind = 'question' then new.id::text::uuid else null end,
      case when v_kind = 'review' then new.id::text else null end)
    on conflict do nothing;
  end loop;
  return new;
end $$;
drop trigger if exists notify_course_question on public.course_questions;
create trigger notify_course_question after insert on public.course_questions for each row execute function qna_private.notify_instructor();
drop trigger if exists notify_course_review on public.course_reviews;
create trigger notify_course_review after insert on public.course_reviews for each row execute function qna_private.notify_instructor();
-- Trigger functions cannot be invoked as public RPCs.
revoke all on function qna_private.prepare_question(), qna_private.prepare_answer(), qna_private.mark_answered(), qna_private.notify_instructor() from public, anon, authenticated;

commit;
