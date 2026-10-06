-- Preserve answers when an instructor's Auth account is deleted.
begin;
alter table public.course_answers alter column author_id drop not null;
alter table public.course_answers drop constraint if exists course_answers_author_id_fkey;
alter table public.course_answers add constraint course_answers_author_id_fkey
  foreign key (author_id) references auth.users(id) on delete set null;

create or replace function qna_private.prepare_answer()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- FK SET NULL also fires this trigger. Allow only the exact attribution cleanup
  -- after the referenced account is gone; never edit content or reattribute it.
  if tg_op = 'UPDATE' then
    if old.author_id is not null and new.author_id is null
       and (to_jsonb(new) - 'author_id') = (to_jsonb(old) - 'author_id')
       and not exists (select 1 from auth.users u where u.id = old.author_id) then
      return new;
    end if;
  end if;
  if auth.uid() is null or not qna_private.answers_question(new.question_id) then
    raise exception '답변 권한이 없습니다.';
  end if;
  perform 1 from public.course_questions where id = new.question_id for update;
  new.author_id := auth.uid();
  if tg_op = 'INSERT' then new.created_at := now(); end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function qna_private.prepare_answer() from public, anon, authenticated;
commit;
