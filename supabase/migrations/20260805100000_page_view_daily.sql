-- 아이템별 · 일별(KST) 조회수 집계 — 수익 분석 탭의 일별/월별 추이용.
-- 월별은 클라이언트에서 일별 결과를 합산한다.
create or replace function page_view_daily(p_expert_id text)
returns table (day date, item_type text, item_id text, views bigint)
language sql stable security definer set search_path = public as $$
  select (v.created_at at time zone 'Asia/Seoul')::date as day,
         v.item_type, v.item_id, count(*)::bigint as views
  from page_views v
  where (p_expert_id = current_expert_id() or is_admin())
    and (
      (v.item_type = 'course' and v.item_id in (select id from courses where expert_id = p_expert_id))
      or
      (v.item_type = 'ebook'  and v.item_id in (select id from ebooks  where expert_id = p_expert_id))
    )
  group by 1, 2, 3
$$;

revoke execute on function page_view_daily(text) from anon;
grant execute on function page_view_daily(text) to authenticated;
