-- ───────────────────────────────────────────────────────────
-- 부가세 10% 차감 단계 추가
-- 계산 순서: 매출 → 부가세 → 8:2 분배 → 원천징수 3.3%
--
-- orders.amount는 부가세 포함가(총액표시제)라 전액을 분배 기준으로 쓰면
-- 플랫폼이 납부할 부가세만큼 매번 과지급된다. 공급가액을 먼저 분리한다.
-- ───────────────────────────────────────────────────────────

alter table settlements
  add column if not exists vat_rate      numeric(4,3) not null default 0.100,
  add column if not exists vat_amount    integer      not null default 0,
  add column if not exists supply_amount integer      not null default 0;

-- 기존 행은 부가세 차감 없이 지급된 이력이므로 그대로 보존
-- (원천징수 3.3% 도입 때와 동일한 방식 — 이력 재작성 없음)
update settlements set vat_rate = 0, supply_amount = gross_amount where supply_amount = 0;

-- 정산 신청 RPC — 부가세 → 80% → 원천징수 순으로 서버 재계산
-- 시그니처·반환타입 동일하므로 create or replace로 교체 (drop 불필요)
create or replace function request_settlement(p_expert_id text default null)
returns settlements language plpgsql security definer set search_path = public as $$
declare
  v_expert  text;
  v_gross   integer;
  v_already integer;
  v_base    integer;
  v_supply  integer;
  v_vat     integer;
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

  -- 이미 신청/지급된 매출 기준 합 (gross_amount는 계속 부가세 포함 결제금액 기준)
  select coalesce(sum(gross_amount), 0) into v_already from settlements
   where expert_id = v_expert and status in ('requested','approved','paid');

  v_base := v_gross - v_already;
  if v_base <= 0 then raise exception 'no balance'; end if;

  -- 부가세 분리 — 정수 나눗셈이라 양수에서 floor와 동일하고 부동소수 오차가 없다.
  -- vat은 차액으로 역산해 supply + vat = base가 항상 정확히 성립하게 한다.
  v_supply := (v_base * 10) / 11;
  v_vat    := v_base - v_supply;

  v_amount := floor(v_supply * 0.8);        -- 지도자 80% (공급가액 기준)
  if v_amount <= 0 then raise exception 'no balance'; end if;
  v_wh     := floor(v_amount * 0.033);      -- 원천징수 3.3% (지급액 기준)

  insert into settlements (expert_id, amount, fee_rate, gross_amount,
                           vat_rate, vat_amount, supply_amount,
                           withholding_rate, withholding_amount, net_amount, status)
   values (v_expert, v_amount, 0.200, v_base,
           0.100, v_vat, v_supply,
           0.033, v_wh, v_amount - v_wh, 'requested')
   returning * into v_row;
  return v_row;
end $$;

-- 정산 행 생성은 security definer RPC로만 허용한다.
-- 기존 insert 정책은 금액을 전혀 제약하지 않아, 지도자가 PostgREST로 직접 insert하면
-- 서버 재계산(부가세·원천징수)을 통째로 우회할 수 있었다.
--
-- 단 RPC가 RLS를 우회하려면 함수 소유자가 테이블 소유자이거나 bypassrls 권한이 있어야 한다.
-- 그렇지 않은 환경에서 정책만 지우면 출금 신청이 전부 RLS 위반으로 실패하므로,
-- 안전할 때만 지우고 아니면 정책을 남긴다.
do $$
declare
  v_fn_owner  oid;
  v_tbl_owner oid;
  v_bypass    boolean;
begin
  select p.proowner into v_fn_owner from pg_proc p
   where p.proname = 'request_settlement' and p.pronamespace = 'public'::regnamespace
   limit 1;
  select c.relowner into v_tbl_owner from pg_class c
   where c.relname = 'settlements' and c.relnamespace = 'public'::regnamespace;
  select (r.rolsuper or r.rolbypassrls) into v_bypass from pg_roles r where r.oid = v_fn_owner;

  if v_fn_owner = v_tbl_owner or coalesce(v_bypass, false) then
    execute 'drop policy if exists "expert requests settlement" on settlements';
    raise notice 'insert 정책 제거 — 정산 행 생성은 RPC로만 가능합니다.';
  else
    raise notice 'insert 정책 유지 — RPC 소유자(%)와 테이블 소유자(%)가 다릅니다. 우회 구멍은 별도 처리 필요.',
      pg_get_userbyid(v_fn_owner), pg_get_userbyid(v_tbl_owner);
  end if;
end $$;
