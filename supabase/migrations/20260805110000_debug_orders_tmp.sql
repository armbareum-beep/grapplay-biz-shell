-- [임시] 주문 진단용 RPC — 수익 분석 매출 미표시 원인 조회.
-- 비밀 키 없이는 빈 결과. 다음 마이그레이션에서 즉시 drop 예정.
create or replace function debug_orders_tmp(p_key text)
returns table (status text, item_type text, item_id text, amount integer, paid_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select o.status, o.item_type, o.item_id, o.amount, o.paid_at, o.created_at
  from orders o
  where p_key = 'dbg_7f3k9q2m8x5v1z4w'
  order by o.created_at
$$;
