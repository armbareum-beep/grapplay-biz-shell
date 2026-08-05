# Phase 9 — 상세페이지 조회 추적 + 전환율 분석 (지도자 대시보드)

> 선행: [03-expert-dashboard.md](./03-expert-dashboard.md), [04-payment-toss.md](./04-payment-toss.md) — `orders`(status='paid')가 구매 원천
> 상태: ✅ 구현 완료 (2026-08-05, PR #5)

## 목표

강의·전자책 **상세페이지 조회수를 자체 DB(Supabase)에 수집**하고, 지도자 대시보드
**수익 분석 탭**에서 조회 → 구매 **전환율**을 강의별 / 일별 / 월별로 볼 수 있게 한다.

- 외부 분석 도구(Vercel Analytics, GA 등) 없이 **추가 비용 0원**.
- 조회와 구매(orders)가 같은 DB에 있으므로 전환율을 직접 계산할 수 있다.
- **집계 시작일: 2026-08-05.** 그 이전 방문 데이터는 존재하지 않음(소급 불가).

## 설계 원칙

1. **원본 로그 비공개**: `page_views` 테이블은 RLS만 켜고 **직접 read/write 정책을 만들지 않는다**.
   쓰기는 `track_page_view` RPC, 집계 조회는 `page_view_counts`/`page_view_daily` RPC로만.
2. **집계 왜곡 방지**:
   - 브라우저 **세션당 아이템별 1회만** 기록 (sessionStorage 가드 — 새로고침 중복 방지).
   - **소유 지도자·관리자 본인 조회는 제외** (클라이언트에서 auth 로딩 완료 후 판단).
   - RPC가 **존재하는 강의/전자책만** insert (오타·스팸 item_id 방지).
3. **시간대 일관성**: 일별 집계는 DB에서 `Asia/Seoul` 기준으로 자른다.
   구매 날짜도 클라이언트에서 KST(`toLocaleDateString('sv-SE', {timeZone:'Asia/Seoul'})`)로 맞춘다.

## DB (마이그레이션 2개 — 적용 완료)

### `20260805000000_page_views.sql`

```sql
create table if not exists page_views (
  id         uuid primary key default gen_random_uuid(),
  item_type  text not null check (item_type in ('course','ebook')),
  item_id    text not null,          -- courses.id / ebooks.id (text, 다형 참조)
  viewer_id  uuid,                   -- 로그인 사용자면 auth.uid(), 익명은 null
  created_at timestamptz not null default now()
);
create index if not exists page_views_item_idx on page_views (item_type, item_id);
alter table page_views enable row level security;   -- 정책 없음 = 직접 접근 차단

-- 조회 기록 (anon + authenticated 실행 가능, 존재하는 아이템만 insert)
create or replace function track_page_view(p_item_type text, p_item_id text)
returns void language plpgsql security definer ...

-- 아이템별 누적 조회수 (해당 전문가 본인 또는 admin만 — 아니면 빈 결과)
create or replace function page_view_counts(p_expert_id text)
returns table (item_type text, item_id text, views bigint) ...
```

### `20260805100000_page_view_daily.sql`

```sql
-- 아이템별 · KST 일별 조회수 (본인 또는 admin만). 월별은 클라이언트에서 합산.
create or replace function page_view_daily(p_expert_id text)
returns table (day date, item_type text, item_id text, views bigint) ...
```

전체 SQL은 마이그레이션 파일 참조. 세 함수 모두 security definer +
`p_expert_id = current_expert_id() or is_admin()` 가드(집계 함수). 관리자는 대시보드의
"관리자 모드 · 지도자 선택"으로 임의 지도자 집계를 볼 수 있다.

## 클라이언트

| 파일 | 변경 |
|---|---|
| `src/lib/pageViews.ts` (신규) | `trackPageView(itemType, itemId)` — sessionStorage 가드(`pv_<type>_<id>`) 후 RPC 호출. 실패해도 페이지 동작에 영향 없음(fire-and-forget) |
| `src/pages/AcademyCourseDetail.tsx` | 마운트 시 기록. `authLoading` 완료 대기 후 admin / 소유 지도자(`profile.expert_id === course.expertId`)면 skip |
| `src/pages/AcademyEbookDetail.tsx` | 동일 (`item_type='ebook'`) |
| `src/lib/expertApi.ts` | `getPageViewCounts()` (누적 map), `getPageViewDaily()` (일별 rows), `ExpertRevenue.purchases`(결제 건별 KST 날짜) 추가 |
| `src/pages/academy-expert/AcademyExpertDashboard.tsx` | 수익 분석 탭에 **전환율 카드**: `강의별 | 일별 | 월별` 토글, 강의 필터(2개 이상일 때), 기간 표는 최신순 + sticky 헤더 + max-h 스크롤 |

## 집계 규칙 (혼동 주의)

- **수익 분석은 강의 + 전자책을 모두 집계**한다(`getExpertRevenue`가 두 타입의 paid 주문 합산).
- **상품별 모드의 "구매" = 고유 구매자 수**(`buyersByItem`, 같은 사람 중복 제거).
- **일별/월별 모드의 "구매" = 결제 건수**(그 기간의 paid orders 수).
  "그 날 방문 대비 그 날 결제"를 보는 목적이라 건수 기준. UI 하단에 안내 문구 있음.
- 조회수 0인 기간/상품의 전환율은 `—`로 표시(0으로 나누지 않음).
- **삭제된 상품의 주문은 집계에서 자동 제외**: 주문 행 자체는 DB에 남지만(결제 기록 보존,
  `item_id`는 FK 없는 다형 참조), 집계가 현재 존재하는 courses/ebooks의 id 목록과
  매칭하므로 삭제된 테스트 상품의 결제는 매출·전환율 어디에도 나타나지 않는다.

## 검증 (수행함)

- `npm run build` 통과.
- anon 키로 REST 스모크 테스트:
  - `rpc/track_page_view` + 존재하지 않는 item_id → 204, insert 없음.
  - `rpc/page_view_counts`·`rpc/page_view_daily` (anon) → `[]` (가드 동작, 데이터 유출 없음).

## 한계 / 향후 과제

- **소급 불가**: 2026-08-05 이전 데이터 없음.
- anon이 RPC를 반복 호출하면 조회수를 부풀릴 수 있음(레이트리밋 없음). 문제가 되면
  Edge Function 경유 + IP 기반 제한 또는 `viewer_id`/기간 dedup 집계로 보강.
- 조회수 추이 차트(막대그래프)는 필요 시 추가.
- `page_views`는 무한 적재 — 수년치가 쌓이면 월별 롤업 테이블로 압축 검토.
