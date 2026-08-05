-- ───────────────────────────────────────────────────────────
-- 상세페이지 조회 추적 — 지도자 대시보드 전환율 분석용
-- 쓰기는 RPC(track_page_view)로만, 집계 조회는 RPC(page_view_counts)로만.
-- 테이블 직접 read/write 정책 없음 → 원본 로그는 클라이언트에 노출되지 않음.
-- ───────────────────────────────────────────────────────────

create table if not exists page_views (
  id         uuid primary key default gen_random_uuid(),
  item_type  text not null check (item_type in ('course','ebook')),
  item_id    text not null,
  viewer_id  uuid,                       -- 로그인 사용자면 기록, 익명은 null
  created_at timestamptz not null default now()
);
create index if not exists page_views_item_idx on page_views (item_type, item_id);

alter table page_views enable row level security;

-- 조회 기록: 존재하는 아이템만 insert (오타/스팸 항목 방지)
create or replace function track_page_view(p_item_type text, p_item_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_item_type = 'course' then
    if not exists (select 1 from courses where id = p_item_id) then return; end if;
  elsif p_item_type = 'ebook' then
    if not exists (select 1 from ebooks where id = p_item_id) then return; end if;
  else
    return;
  end if;
  insert into page_views (item_type, item_id, viewer_id)
  values (p_item_type, p_item_id, auth.uid());
end $$;

grant execute on function track_page_view(text, text) to anon, authenticated;

-- 아이템별 조회수 집계 — 해당 전문가 본인 또는 관리자만
create or replace function page_view_counts(p_expert_id text)
returns table (item_type text, item_id text, views bigint)
language sql stable security definer set search_path = public as $$
  select v.item_type, v.item_id, count(*)::bigint as views
  from page_views v
  where (p_expert_id = current_expert_id() or is_admin())
    and (
      (v.item_type = 'course' and v.item_id in (select id from courses where expert_id = p_expert_id))
      or
      (v.item_type = 'ebook'  and v.item_id in (select id from ebooks  where expert_id = p_expert_id))
    )
  group by v.item_type, v.item_id
$$;

revoke execute on function page_view_counts(text) from anon;
grant execute on function page_view_counts(text) to authenticated;
