-- ───────────────────────────────────────────────────────────
-- 원천징수 3.3% (사업소득: 소득세 3% + 지방소득세 0.3%)
-- 정산액(80%)에서 원천징수 후 실지급액을 함께 기록한다.
-- ───────────────────────────────────────────────────────────

-- 정산 계좌에 주민등록번호 (원천징수 신고용, 본인+관리자만 RLS로 접근 가능)
alter table payout_accounts
  add column if not exists resident_id text;

alter table settlements
  add column if not exists withholding_rate   numeric(4,3) not null default 0.033,
  add column if not exists withholding_amount integer      not null default 0,
  add column if not exists net_amount         integer      not null default 0;

-- 기존 행은 원천징수 없이 지급된 이력이므로 rate 0 / 실지급액 = 정산액으로 보존
update settlements set withholding_rate = 0, net_amount = amount where net_amount = 0;

-- 정산 신청 RPC — 잔액 서버 재계산 + 원천징수 3.3% 계산해서 insert
create or replace function request_settlement()
returns settlements language plpgsql security definer set search_path = public as $$
declare
  v_expert  text := current_expert_id();
  v_gross   integer;
  v_already integer;
  v_amount  integer;
  v_wh      integer;
  v_row     settlements;
begin
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
