# 그래플레이 비즈 — 비즈니스 기능 구현 계획 (Phase 문서 세트)

이 폴더는 `grapplay-biz`를 **UI 시안(shell)** 상태에서 실제 동작하는 서비스로 만드는
구현 명세를 Phase별로 나눠 담는다. 각 문서는 그 Phase만 보고 구현할 수 있도록
**목표 / 새 파일 / 수정 파일 / DB·RLS / 코드 외 설정 / 검증**을 자체 완결로 작성한다.

## 배경

현재 상태:
- 모든 버튼(구매/로그인/저장)이 동작하지 않는 UI 시안.
- 데이터는 목업(`src/data/*`) + Supabase **읽기 전용**(`src/lib/api.ts`가 에러 시 목업 폴백).
- 인증 미사용(`src/lib/supabase.ts`에 auth 설정만 되어 있음).
- 지도자(전문가) 대시보드(`src/pages/academy-expert/*`)는 `CURRENT_EXPERT_ID='e1'` 하드코딩.

목표: 그래플레이 본 서비스의 비즈니스 기능을 비즈 버전에 이식.
- **결제: 토스페이먼츠** (서버 승인은 Supabase Edge Function, 시크릿 키는 클라이언트 금지)
- **로그인: 이메일 + 카카오** (Supabase Auth)
- **지도자 대시보드 = 기존 academy-expert 대시보드** 실데이터 연결
- **마이페이지**: 실제 수강(enrollments) + 위시리스트
- **정산**: 결제로 쌓인 orders를 원천으로 매출 집계 → 출금 신청/상태 관리

## 문서 목록 / 의존 순서

| 순서 | 문서 | 내용 | 의존 | 상태 |
|---|---|---|---|---|
| 0 | [00-db-schema.md](./00-db-schema.md) | DB 마이그레이션 (profiles, orders, enrollments, wishlist, ebooks, RLS) | — | ✅ |
| 1 | [01-auth.md](./01-auth.md) | 인증 + 로그인 페이지 (이메일/카카오) | 00 | ✅ |
| 2 | [02-mypage-wishlist.md](./02-mypage-wishlist.md) | 마이페이지 + 위시리스트 (읽기 경로) | 00, 01 | ✅ |
| 3 | [03-expert-dashboard.md](./03-expert-dashboard.md) | 지도자 대시보드 + 강의 에디터 CRUD | 00, 01 | ✅ |
| 4 | [04-payment-toss.md](./04-payment-toss.md) | 토스 결제 + Edge Function 승인 | 00, 01, 02 | ✅ |
| 5 | [05-settlement-payout.md](./05-settlement-payout.md) | 정산 (매출 집계 → 출금 신청/상태) | 04 | ✅ |
| 6 | [06-course-player-and-ebook-editor.md](./06-course-player-and-ebook-editor.md) | 판매/수강 분리 + 영상 플레이어 + 전자책 에디터 | 00, 03 | ✅ |
| 7 | [07-vimeo-upload.md](./07-vimeo-upload.md) | 강의 영상 Vimeo 업로드 (tus + Edge Function) | 03, 06 | ✅ |
| 8 | [08-admin-dashboard.md](./08-admin-dashboard.md) | 관리자 대시보드 (개요/정산/회원/전문가/콘텐츠/주문/리뷰) | 00, 01, 03, 05 | ✅ |
| 9 | [09-page-view-conversion.md](./09-page-view-conversion.md) | 상세페이지 조회 추적 + 전환율 (강의별/일별/월별) | 03, 04 | ✅ |
| 10 | [10-rebrand-phynesis.md](./10-rebrand-phynesis.md) | **리브랜딩** 그래플레이 비즈 → 파이네시스(PHYNESIS): 브랜드 표기·카피 일반화·카테고리 2축(주제×분야)·외부 설정 체크리스트 | 00 | 📝 계획 |

> **현재 스키마는 [DB-SCHEMA.md](./DB-SCHEMA.md)가 단일 진실(single source of truth).**
> Phase 문서는 "왜/어떻게", DB-SCHEMA는 "지금 무엇이 있는지".

구현은 위 순서대로. 결제·정산은 인증/수강 테이블에 의존하므로 뒤에 둔다. 관리자(08)는 정산·역할까지
다루므로 가장 뒤.

## 공통 보안 원칙 (모든 Phase 공통 — 위반 금지)

1. **시크릿 분리**: 토스 **시크릿 키(`TOSS_SECRET_KEY`)** 와 **service-role 키**는
   클라이언트 번들에 절대 포함하지 않는다. `VITE_*` 접두 환경변수는 빌드 시 클라이언트로
   노출되므로 비밀값에 사용 금지. 비밀값은 **Supabase Edge Function 환경변수**에만 둔다.
2. **금액 신뢰 금지**: 결제 승인 시 클라이언트가 보낸 금액을 믿지 않고,
   **서버(Edge Function)에서 `courses`/`ebooks` 가격을 재조회**해 일치 여부를 검증한다.
3. **멱등성**: `orders.order_key` UNIQUE + "이미 결제됨" 단락(short-circuit) +
   `enrollments` UNIQUE(user, item_type, item_id)로 중복 결제/중복 수강 등록을 방지한다.
4. **RLS 우선**: 모든 사용자 데이터 테이블은 RLS 활성화. 본인 행만 read/write,
   소유권 검증은 security-definer 헬퍼 함수로 처리(정책 재귀 방지).

## 타입 규칙 (혼동 주의)

- 기존 PK는 **`text`** 다: `experts.id`='e1', `courses.id`='c1', `ebooks.id`='b1'.
- `auth.users.id`는 **`uuid`** 다.
- 따라서 새 테이블에서 사용자 참조(`user_id`)는 **uuid**, 강의/전자책 참조(`item_id`)는 **text**.
  `item_id`를 실수로 uuid FK로 만들지 말 것.

## 환경변수 정리

| 변수 | 위치 | 비밀? | 용도 |
|---|---|---|---|
| `VITE_SUPABASE_URL` | 클라이언트 `.env` | 공개 | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | 클라이언트 `.env` | 공개(anon) | Supabase anon 키 |
| `VITE_TOSS_CLIENT_KEY` | 클라이언트 `.env` | 공개(client) | 토스 위젯 초기화 |
| `TOSS_SECRET_KEY` | Edge Function secret | **비밀** | 토스 결제 승인 |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function secret(자동) | **비밀** | RLS 우회 서버 쓰기 |

## 진행 메모

- 이 문서 세트 작성 시점: 2026-06-08.
- 구현 전, 각 Phase 문서를 검토하고 시작한다.
- 실제 마이그레이션/배포는 Supabase MCP(`apply_migration`, `deploy_edge_function`) 또는
  로컬 supabase CLI 사용.
