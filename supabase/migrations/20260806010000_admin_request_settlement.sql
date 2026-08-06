-- ───────────────────────────────────────────────────────────
-- 관리자가 지도자 대신 출금 신청 가능하게 RPC 확장
-- (관리자 프로필엔 expert_id가 없어 기존엔 'not an expert' 발생)
-- ───────────────────────────────────────────────────────────

-- 시그니처가 바뀌므로 기존 무인자 함수 제거 (남겨두면 rpc 호출이 모호해짐)
drop function if exists request_settlement();

create or replace function request_settlement(p_expert_id text default null)
returns settlements language plpgsql security definer set search_path = public as $$
declare
  v_expert  text;
  v_gross   integer;
  v_already integer;
  v_amount  integer;
  v_wh      integer;
  v_row     settlements;
begin
  -- 관리자는 지도자를 지정해 대신 신청 가능, 그 외엔 본인 expert_id만
  if is_admin() and p_expert_id is not null then
    v_expert := p_expert_id;
  else
    v_expert := current_expert_id();
  end if;
  if v_expert is null then raise exception 'not an expert'; end if;

  -- 원천징수 신고에 주민등록번호가 필요하므로 미등록 시 신청 차단
  if not exists (
    select 1 from payout_accounts
     where expert_id = v_expert and coalesce(resident_id, '') <> ''
  ) then
    raise exception 'no resident id';
  end if;

  -- 소유 강의/전자책의 결제완료 매출 합
  select coalesce(sum(o.amount), 0) into v_gross from orders o
   where o.status = 'paid' and (
     (o.item_type = 'course' and o.item_id in (select id from courses where expert_id = v_expert)) or
     (o.item_type = 'ebook'  and o.item_id in (select id from ebooks  where expert_id = v_expert))
   );

  -- 이미 신청/지급된 매출 기준 합
  select coalesce(sum(gross_amount), 0) into v_already from settlements
   where expert_id = v_expert and status in ('requested','approved','paid');

  v_amount := floor((v_gross - v_already) * 0.8);
  if v_amount <= 0 then raise exception 'no balance'; end if;
  v_wh := floor(v_amount * 0.033);

  insert into settlements (expert_id, amount, fee_rate, gross_amount,
                           withholding_rate, withholding_amount, net_amount, status)
   values (v_expert, v_amount, 0.200, v_gross - v_already,
           0.033, v_wh, v_amount - v_wh, 'requested')
   returning * into v_row;
  return v_row;
end $$;
