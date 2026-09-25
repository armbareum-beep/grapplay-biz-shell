# 그래플레이 비즈 — DB 스키마 레퍼런스 (현재 상태)

> **이 문서가 DB 구조의 단일 진실(single source of truth)입니다.**
> Phase 문서(00~08)는 "왜/어떻게" 바꿨는지, 이 문서는 "지금 무엇이 있는지"를 담습니다.
> 스키마를 바꾸면 **반드시 이 문서도 같이 갱신**하세요. (마지막 갱신: 2026-08-05 — 페이지뷰/전환율)

## 기본 정보
- **별도 프로젝트**: 그래플레이 운영 DB와 완전히 분리된 비즈 전용 Supabase 프로젝트
  (`sjnmkmsdzuvywtaasvdn`). 운영 DB는 절대 건드리지 않음.
- 적용 방법: 비즈 프로젝트 **SQL Editor**에 마이그레이션을 순서대로 실행.
  모든 마이그레이션은 **재실행 안전**(`if not exists` / `on conflict do nothing` / `drop policy if exists`).

## 마이그레이션 순서 (적용 이력)
| # | 파일 | 내용 |
|---|---|---|
| 1 | `20260608000000_init_biz.sql` | experts, courses, expert_reviews, course_reviews + 공개 읽기 RLS + 시드 |
| 2 | `20260609000000_auth_orders_enroll.sql` | profiles, orders, enrollments, wishlist + enum/함수/트리거 + 소유자 쓰기 RLS |
| 3 | `20260609000100_ebooks.sql` | ebooks 테이블 + RLS + 시드 |
| 4 | `20260611000000_ebook_landing.sql` | ebooks에 use_landing_page, detail_blocks |
| 5 | `20260612000000_ebook_cover_image.sql` | ebooks에 cover_image + 공개 스토리지 버킷 `covers` |
| 6 | `20260612000100_ebook_preview_pages.sql` | ebooks에 preview_pages |
| 7 | `20260613000000_settlements.sql` | payout_accounts, settlements + RLS + `request_settlement()` RPC + 전문가 ebook 주문 읽기 정책 |
| 8 | `20260613000100_course_cover_image.sql` | courses에 cover_image (covers 버킷 재사용) |
| 9 | `20260614000000_admin_access.sql` | 관리자 read/관리 정책 (profiles·orders·enrollments read, experts write, course_reviews update, expert_reviews delete) |
| 10 | `20260614000100_admin_set_role.sql` | `admin_set_user_role()` RPC — 회원 역할 변경(승격/강등/관리자 지정) |
| 11 | `20260615000000_category_rename_ebook_category.sql` | 카테고리 "체육관 운영"→"경영" rename + ebooks에 category 컬럼 + 시드 카테고리 |
| 12 | `20260616000000_expert_category.sql` | experts에 category 컬럼 (관리자 지정 전문분야) + 시드 |
| — | `20260919000000_category_rename_invest.sql` | 카테고리 "연금"→"투자" rename (courses/ebooks/experts.category, experts.categories). 브랜딩·인문교양 신설은 앱 상수만 (check 제약 없음) |
| 13~22 | `20260617`~`20260624` 시리즈 | 강의 할인, 배너, 전문가 카테고리/아바타/삭제/자격, 전자책 리뷰, 리뷰 별점, 리뷰 관리자 삭제, 레슨 진도, 리뷰 작성자 트리거 (각 파일명 참조 — 이 표에 상세 미반영) |
| 23 | `20260805000000_page_views.sql` | page_views 테이블 + `track_page_view()`/`page_view_counts()` RPC (RLS 정책 없음 = RPC로만 접근) |
| 24 | `20260805100000_page_view_daily.sql` | `page_view_daily()` RPC — KST 일별 조회수 집계 |
| — | `20260926000000_private_pdfs.sql` | 보안: 비공개 버킷 `ebook-files`·`reward-files` + 스토리지 RLS, `ebooks.pdf_path`/`preview_pdf_url`, `courses.reward_pdf_path` (PDF 비공개 1단계) |
| — | `20260925000000_enrollments_update_columns.sql` | 보안: enrollments update 권한을 `progress`·`lesson_progress` 컬럼으로 제한 (수강 권한 바꿔치기 차단) |

---

## 타입 규칙 (가장 중요 — 꼬임 방지)
- **콘텐츠 PK는 `text`**: `experts.id`='e1', `courses.id`='c1'/'c_xxxx', `ebooks.id`='eb1'/'eb_xxxx'.
- **사용자 PK는 `uuid`**: `auth.users.id` = `profiles.id`.
- 따라서: `user_id` = **uuid**, `item_id`(강의/전자책 참조) = **text**, `expert_id` = **text**.
  → `item_id`를 uuid FK로 만들지 말 것. `user_id`를 text로 만들지 말 것.

---

## 테이블

### 콘텐츠 (공개 읽기)

**experts** — 전문가(지도자)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | text PK | 'e1'~'e4' |
| name, title | text | |
| avatar | text | 이모지 |
| bio | text | |
| **category** | text | 전문분야 (마케팅/브랜딩/상권분석/투자/경영/인문교양, 관리자 지정, nullable) |
| created_at | timestamptz | |

**courses** — 강의
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | text PK | |
| expert_id | text FK→experts | on delete cascade |
| title, subtitle, category, summary | text | |
| price | int | 0 = 무료 |
| is_subscription_excluded | bool | |
| cover | text | Tailwind 그라데이션 (이미지 없을 때 폴백) |
| cover_image | text | 업로드 표지 이미지 URL (covers 버킷) |
| thumb_emoji | text | |
| lesson_count, duration_min, review_count, student_count | int | |
| rating | numeric(2,1) | |
| what_you_learn | jsonb | `string[]` ("이런 걸 배워요") |
| **curriculum** | jsonb | `{ title, durationMin, videoUrl?, preview? }[]` ← 레슨 영상/미리보기 |
| use_landing_page | bool | 리치 상세 사용 여부 |
| detail_blocks | jsonb | `{ id, type:'heading'\|'text'\|'image', value }[]` |
| review_reward_pdf_url | text | ⚠️ 구방식(공개 URL) — 이전 완료 후 제거 예정 |
| **reward_pdf_path** | text | 리뷰 리워드 PDF — 비공개 `reward-files` 버킷 경로. 숨김 안 된 후기 작성자만 열람 |
| sort_order | int | |
| created_at | timestamptz | |
| 인덱스 | | category, expert_id |

**ebooks** — 전자책
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | text PK | |
| expert_id | text FK→experts | on delete set null |
| title, subtitle, author, summary | text | |
| **category** | text | 마케팅/브랜딩/상권분석/투자/경영/인문교양 (강의와 동일 6종, nullable) |
| avatar, emoji | text | 이모지 |
| cover | text | 그라데이션 (이미지 없을 때 폴백) |
| **cover_image** | text | 업로드 표지 이미지 URL (covers 버킷) |
| price, original_price | int | |
| page_count | int | |
| **preview_pages** | int default 3 | 상세에서 공개할 앞 페이지 수 |
| rating | numeric(2,1) | |
| buyer_count | int | |
| highlights | jsonb | `string[]` |
| pdf_url | text | ⚠️ 구방식(공개 URL) — 이전 완료 후 제거 예정 |
| **pdf_path** | text | 원본 PDF — 비공개 `ebook-files` 버킷 경로. 구매자·소유 전문가·관리자만 서명 URL로 열람 |
| **preview_pdf_url** | text | 앞 N쪽만 잘라낸 공개 미리보기 PDF (covers/ebook-previews/) |
| is_new | bool | |
| use_landing_page | bool | |
| detail_blocks | jsonb | courses와 동일 형식 |
| sort_order, created_at | | |

**expert_reviews** — 전문가 별점 리뷰
| id text PK | expert_id text FK | user_name text | rating int(1~5) | content text | created_at text |

**course_reviews** — 강의 댓글형 리뷰
| id text PK | course_id text FK | user_name text | user_email text | content text | hidden bool | pdf_sent_count int | created_at text |

> ⚠️ `expert_reviews`/`course_reviews`의 `id`·`created_at`은 **text**(시드 호환). 향후 사용자 작성 리뷰를
> 본격화하면 기본값(`gen_random_uuid()::text`, `now()`) 보강 검토.

### 사용자 데이터 (본인 행만 접근)

**profiles** — auth.users ↔ 역할 ↔ 전문가
| id uuid PK FK→auth.users | email text | display_name text | role `user_role` | expert_id text FK→experts | created_at |
- 가입 시 트리거(`handle_new_user`)로 자동 생성. `role`/`expert_id` **자기 승격 차단**(승격은 service role).

**orders** — 결제 1건 = 1행 (멱등 앵커)
| id uuid PK | user_id uuid | **order_key text UNIQUE** | item_type('course'\|'ebook') | item_id text | amount int | status('pending'\|'paid'\|'failed'\|'canceled') | payment_key text | method text | raw_response jsonb | created_at | paid_at |
- **쓰기는 Edge Function(service role)만** — 클라이언트 insert/update 정책 없음.

**enrollments** — 수강/열람 권한
| id uuid PK | user_id uuid | item_type | item_id text | order_id uuid FK→orders | progress int | created_at | **UNIQUE(user_id,item_type,item_id)** |
- 무료 콘텐츠는 self-insert 허용(가격 0 확인), 유료는 Edge Function이 부여.
- 클라이언트 update는 **`progress`·`lesson_progress` 컬럼만** 허용(컬럼 단위 grant). `item_type`/`item_id`/`order_id`/`user_id` 변경 불가.

**wishlist** — 찜
| user_id uuid | item_type | item_id text | created_at | **PK(user_id,item_type,item_id)** |

### 정산 (전문가 80% / 플랫폼 20%)

**payout_accounts** — 정산 계좌 (전문가 1명당 1행)
| expert_id text PK FK→experts | bank text | account_no text | holder text | updated_at |
- RLS: 본인(`current_expert_id()`) 또는 admin만 읽기/쓰기.

**settlements** — 출금(정산) 신청
| id uuid PK | expert_id text FK | amount int(전문가 수령 80%) | fee_rate numeric(기본 0.200) | gross_amount int(차감 전) | status('requested'\|'approved'\|'paid'\|'rejected') | requested_at | paid_at | note |
- RLS: 전문가 본인 read + insert(status='requested'만), **상태 변경(승인/지급)은 admin만**.
- **RPC `request_settlement()`** (security definer): 서버에서 `(총 paid 매출 − 기신청 매출) × 0.8`를
  재계산해 신청 행 insert(금액 위변조 방지). 잔액 0이면 예외.
- 상태 변경은 이제 **관리자 대시보드 정산 탭**(`/admin`)에서 처리. 실제 송금 후 `status='paid', paid_at`을
  갱신(`updateSettlementStatus`). 자동 송금(지급대행)은 향후 과제. 자세히는 [08-admin-dashboard.md](./08-admin-dashboard.md).

### 분석 (RPC로만 접근)

**page_views** — 상세페이지 조회 로그 (전환율 분석용, 2026-08-05부터)
| id uuid PK | item_type('course'\|'ebook') | item_id text(다형 참조) | viewer_id uuid(익명 null) | created_at |
- RLS 활성화 + **정책 없음** → 클라이언트 직접 read/write 불가. 아래 RPC로만 접근.
- 세션당 1회 기록은 클라이언트(sessionStorage) 책임. 소유 지도자·관리자 본인 조회는 클라이언트에서 제외.
- 자세히는 [09-page-view-conversion.md](./09-page-view-conversion.md).

---

## Enum / 함수 / 트리거
- `user_role` enum: `'user' | 'expert' | 'admin'`
- `current_expert_id() → text` (security definer): 현재 로그인 사용자의 expert_id
- `is_admin() → boolean` (security definer)
- `handle_new_user()` 트리거: auth.users INSERT → profiles 자동 생성
- `request_settlement() → settlements` (security definer): 전문가 출금 신청(잔액 재계산)
- `admin_set_user_role(target_user uuid, new_role user_role, new_expert_id text) → profiles`
  (security definer): 관리자만 회원 역할 변경(승격/강등/관리자 지정). `is_admin()` 가드 +
  expert 승격 시 `expert_id` 무결성 검증. `profiles.update`의 자기승격 잠금을 우회하는 유일한 경로.
- `track_page_view(p_item_type, p_item_id)` (security definer, anon 실행 가능): 존재하는
  강의/전자책만 page_views에 insert.
- `page_view_counts(p_expert_id) → (item_type, item_id, views)` (security definer):
  아이템별 누적 조회수. 본인(`current_expert_id()`) 또는 admin이 아니면 빈 결과.
- `page_view_daily(p_expert_id) → (day, item_type, item_id, views)` (security definer):
  KST 일별 조회수. 가드 동일. 월별은 클라이언트 합산.
- (헬퍼·RPC는 RLS 정책 재귀를 막고 권한을 한정하기 위해 security definer로 작성)

## RLS 정책 요약
> `admin`은 `is_admin()`으로 거의 모든 테이블에 접근(아래 "admin" 열). 정책은 OR 합집합.

| 테이블 | 읽기 | 쓰기 | admin 추가 |
|---|---|---|---|
| experts | 공개(true) | (기본 write 정책 없음) | **insert/update** |
| courses/ebooks | 공개(true) | **소유 전문가**(`expert_id = current_expert_id()` 또는 admin) | insert/update/delete(기존 admin 절) |
| profiles | 본인 | 본인(단 role/expert_id 승격 불가) | **전체 read** + 역할변경은 `admin_set_user_role()` RPC |
| orders | 본인 + 소유 강의/전자책 전문가(매출용) | 클라이언트 불가(Edge Function service role) | **전체 read** |
| enrollments | 본인 | 무료 self-enroll, 진도 update 본인 | **전체 read** |
| wishlist | 본인 | 본인 | — |
| course_reviews | 공개 | 강의 소유 전문가 update(숨김/PDF), 수강생 insert | **update**(모더레이션) |
| expert_reviews | 공개 | — | **delete** |
| settlements | 본인 + admin | 본인 insert(requested), 상태변경 admin | (이미 admin) |
| payout_accounts | 본인 + admin | 본인 + admin | (이미 admin) |
| page_views | **직접 접근 불가** (집계는 `page_view_counts`/`page_view_daily` RPC) | **직접 접근 불가** (기록은 `track_page_view` RPC) | RPC 가드에 포함 |

## 스토리지 버킷
- **`covers`** (공개): 전자책 표지 이미지 + PDF 파일.
  - 경로 관례: 표지 `ebooks/<uuid>.<ext>`, PDF `ebook-pdfs/<uuid>.pdf`
  - 정책: 누구나 읽기, 로그인 사용자 업로드/수정
  - ⚠️ 공개 버킷이라 URL을 아는 사람은 파일 접근 가능(경로는 무작위 uuid). 전자책 PDF 완전 보호가
    필요하면 비공개 버킷 + signed URL로 전환 검토.

---

## 관계도 (요약)
```
auth.users 1──1 profiles ──(expert_id)──> experts
experts 1──* courses, ebooks, expert_reviews
courses 1──* course_reviews
profiles(user) 1──* orders, enrollments, wishlist
orders 1──0..1 enrollments (order_id; 무료는 null)
enrollments.item_id ──> courses.id 또는 ebooks.id (item_type로 구분, FK 아님 — 다형 참조)
```
> `item_id`/`order_key` 등 다형 참조는 FK가 아니라 **앱 레벨 규약**. item_type으로 어느 테이블인지 구분.

---

## DB가 꼬이지 않게 — 규칙
1. **이미 적용한 마이그레이션 파일은 수정 금지.** 변경은 항상 **새 마이그레이션 파일**(새 타임스탬프)로 추가.
2. 모든 마이그레이션은 **재실행 안전**하게 작성(`if not exists`, `drop policy if exists`, `on conflict do nothing`).
3. 스키마 변경 시 **이 문서를 같은 커밋에서 갱신**.
4. 컬럼 추가는 가능하면 `default` 포함(기존 행 깨지지 않게). 컬럼 삭제/이름변경은 신중히(앱 매퍼 `api.ts`도 같이 수정).
5. 타입 규칙(text vs uuid) 준수. 다형 `item_id`는 text 유지.
6. jsonb 형식(curriculum 항목, detail_blocks)을 바꾸면 `src/data/mock.ts` 타입과 `src/lib/api.ts` 매퍼도 함께 수정.

### 비공개 PDF 스토리지 (2026-09-26~)
| 버킷 | 경로 | 읽기 | 쓰기 |
|---|---|---|---|
| `ebook-files` (비공개) | `{expert_id}/{ebook_id}/{uuid}.pdf` | 해당 전자책 enrollments 보유자 · 소유 전문가 · 관리자 | 경로 첫 폴더 = 본인 expert_id · 관리자 |
| `reward-files` (비공개) | `{expert_id}/{course_id}/{uuid}.pdf` | 해당 강의 후기 작성자(숨김 제외, 이메일 매칭) · 소유 전문가 · 관리자 | 동일 |
- 클라이언트는 `createSignedUrl`(1시간)로만 연다 — `src/lib/privatePdf.ts`.
- 판단 헬퍼: `can_read_ebook_file(ebook_id)`, `can_read_reward_file(course_id)` (security definer).
- 기존 공개 PDF는 관리자 › 콘텐츠 탭의 "기존 PDF 이전"으로 복사. 구 컬럼·파일 정리는 3단계.
