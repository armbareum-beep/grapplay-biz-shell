-- ───────────────────────────────────────────────────────────
-- 운영자 텔레그램 알림 — 정산 신청, 새 강의 질문, 새 강의 리뷰
--
-- 동작: 행 insert 트리거 → pg_net으로 텔레그램 Bot API sendMessage 호출.
--  - pg_net 요청은 트랜잭션에 묶여, 커밋된 이벤트만 발송된다(롤백 시 미발송).
--  - 봇 토큰·채팅 ID는 Supabase Vault에만 저장한다. 미설정이면 조용히 건너뛴다.
--  - 발송 실패는 경고만 남기고 원래 작업(정산 신청 등)은 절대 실패시키지 않는다.
--  - 질문·리뷰 본문과 수강생 개인정보는 외부(텔레그램)로 보내지 않는다.
--
-- 적용 후 SQL Editor에서 1회 설정 (값은 저장소에 커밋하지 말 것):
--   select vault.create_secret('<봇 토큰>', 'telegram_bot_token');
--   select vault.create_secret('<채팅 ID>', 'telegram_chat_id');
--   select vault.create_secret('https://<사이트 도메인>', 'site_url');  -- 선택: 바로가기 링크
-- 재실행 안전.
-- ───────────────────────────────────────────────────────────
begin;
create extension if not exists pg_net;
create schema if not exists ops_private;
revoke all on schema ops_private from public;

create or replace function ops_private.secret(p_name text)
returns text language sql stable security definer set search_path = '' as $$
  select nullif(btrim(s.decrypted_secret), '') from vault.decrypted_secrets s where s.name = p_name limit 1
$$;

create or replace function ops_private.telegram_send(p_text text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_token text; v_chat text;
begin
  v_token := ops_private.secret('telegram_bot_token');
  v_chat := ops_private.secret('telegram_chat_id');
  if v_token is null or v_chat is null then return; end if;
  perform net.http_post(
    url := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
    body := jsonb_build_object('chat_id', v_chat, 'text', left(p_text, 4000), 'disable_web_page_preview', true),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
exception when others then
  -- 알림은 부가 기능 — 실패해도 원래 insert는 진행한다.
  raise warning 'telegram alert skipped: %', sqlerrm;
end $$;

create or replace function ops_private.won(p_amount numeric)
returns text language sql immutable set search_path = '' as $$
  select to_char(coalesce(p_amount, 0), 'FM999,999,999,990') || '원'
$$;

create or replace function ops_private.link(p_path text)
returns text language sql stable security definer set search_path = '' as $$
  select case when ops_private.secret('site_url') is null then ''
    else E'\n' || rtrim(ops_private.secret('site_url'), '/') || p_path end
$$;

create or replace function ops_private.alert_settlement()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  select e.name into v_name from public.experts e where e.id = new.expert_id;
  perform ops_private.telegram_send(
    '💰 정산 신청' ||
    E'\n지도자: ' || coalesce(v_name, new.expert_id) ||
    E'\n신청액: ' || ops_private.won(new.amount) ||
    E'\n실지급액: ' || ops_private.won(new.net_amount) || ' (원천징수 ' || ops_private.won(new.withholding_amount) || ')' ||
    E'\n신청 시각: ' || to_char(coalesce(new.requested_at, now()) at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') ||
    ops_private.link('/admin')
  );
  return new;
end $$;

create or replace function ops_private.alert_course_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_course text; v_expert_id text; v_expert text; v_head text; v_path text;
begin
  select c.title, c.expert_id, e.name into v_course, v_expert_id, v_expert
    from public.courses c left join public.experts e on e.id = c.expert_id
   where c.id = new.course_id;
  if tg_table_name = 'course_questions' then
    v_head := '❓ 새 강의 질문 (' || case when (to_jsonb(new)->>'is_public')::boolean then '수강생 공개' else '비공개' end || ')';
    v_path := '/expert/dashboard?expert=' || coalesce(v_expert_id, '') || '&tab=qna&question=' || new.id::text;
  else
    v_head := '⭐ 새 강의 리뷰' || coalesce(' (별점 ' || (to_jsonb(new)->>'rating') || ')', '');
    v_path := '/expert/dashboard?expert=' || coalesce(v_expert_id, '') || '&tab=reviews&review=' || new.id::text;
  end if;
  perform ops_private.telegram_send(
    v_head ||
    E'\n강의: ' || coalesce(v_course, new.course_id::text, '-') ||
    E'\n지도자: ' || coalesce(v_expert, v_expert_id, '-') ||
    ops_private.link(v_path)
  );
  return new;
end $$;

drop trigger if exists telegram_settlement_requested on public.settlements;
create trigger telegram_settlement_requested after insert on public.settlements
  for each row execute function ops_private.alert_settlement();
drop trigger if exists telegram_course_question on public.course_questions;
create trigger telegram_course_question after insert on public.course_questions
  for each row execute function ops_private.alert_course_activity();
drop trigger if exists telegram_course_review on public.course_reviews;
create trigger telegram_course_review after insert on public.course_reviews
  for each row execute function ops_private.alert_course_activity();

-- 클라이언트(anon/authenticated)는 발송 함수를 직접 호출할 수 없다.
revoke all on all functions in schema ops_private from public, anon, authenticated;
commit;
