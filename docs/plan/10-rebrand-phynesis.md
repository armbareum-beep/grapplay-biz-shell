# Phase 10 — 리브랜딩: 그래플레이 비즈 → 파이네시스 (PHYNESIS)

> 작성일: 2026-09-19 · 상태: **계획 (미착수)**
> 선행: 없음 (Phase 0~9 완료 상태 기준). 후속: 없음.
> 관련: [00-db-schema.md](./00-db-schema.md), [DB-SCHEMA.md](./DB-SCHEMA.md), [../tasks/01-copy-labels.md](../tasks/01-copy-labels.md)(카테고리 rename 선례)

---

## 0. 한 줄 요약

"그래플레이의 하위 서비스(주짓수 체육관 관장 대상)"를 **"모든 분야 전문가를 위한 독립 브랜드
파이네시스"** 로 바꾼다. 단순 이름 교체가 아니라 **(1) 브랜드 표기 교체 → (2) 체육관 전제 카피 일반화
→ (3) 카테고리 구조를 다분야 대응으로 개편 → (4) 외부 서비스 설정 교체** 4단계로 진행한다.

### 브랜드 정의

| 항목 | 값 |
|---|---|
| 영문 표기 | **PHYNESIS** (워드마크) / Phynesis (문장 내) |
| 한글 표기 | **파이네시스** (고정. "피네시스" 표기는 사용하지 않음) |
| 어원 | Paideia(파이데이아, 전인적 교육) + Phronesis(프로네시스, 실천적 지혜) |
| 포지셔닝 | 전문가(전문직·자영 전문가·지도자 등)가 **자기 사업을 운영하는 데 필요한 실천 지식**을 다른 전문가에게서 배우는 교육 플랫폼 |
| 그래플레이와의 관계 | **없음.** 별개 브랜드. 그래플레이는 파이네시스의 첫 번째 분야(피트니스·무도) 콘텍스트로만 남는다. "by Grapplay" 병기 안 함. |
| 운영 주체 (법인) | 그래플레이 (상호명·사업자등록·통신판매업 신고는 **그대로 유지**) — §2.4 참고 |

---

## 1. 사전 결정 사항 (코드 작업 전에 확정)

코드를 건드리기 전에 아래를 정한다. 미정 항목은 작업 착수 시점에 채운다.

| # | 결정 | 상태 | 비고 |
|---|---|---|---|
| D1 | 한글 표기 "파이네시스" | ✅ 확정 | 로고·도메인·앱스토어·약관 전부 동일 표기 |
| D2 | 워드마크 표기: `PHYNESIS` 전부 대문자 vs `Phynesis` | ⬜ 미정 | 헤더/푸터/로그인 3곳에 동일 적용. 현재 `font-brand`(Inter) 유지 여부도 함께 |
| D3 | 태그라인 (한 줄 설명) | ⬜ 미정 | 추상 이름이라 **항상 함께 노출**. 초안: "전문가의 사업을 가르치는 전문가", "실력은 있는데 사업이 막힐 때" |
| D4 | 도메인 | ⬜ 미정 | phynesis.com / .kr / .co 확보 여부 확인 → Vercel 연결. **KIPRIS 상표 검색** 병행 |
| D5 | 대표 이메일 | ⬜ 미정 | 현재 `grapplay.com@gmail.com` (푸터·문의·개인정보 책임자 3곳). 새 주소를 만들지, 당분간 유지할지 |
| D6 | 첫 출시 분야 범위 | ⬜ 미정 | "모든 전문가"의 실제 첫 타깃. 카테고리 구조(§4)의 **분야 목록**이 여기서 나온다 |
| D7 | 카테고리 `연금` 명칭 | ⬜ 미정 | 4개 중 유일하게 협소한 이름. `재무·연금` 또는 `재무·세무` 제안 (§4.2) |
| D8 | 브랜드 컬러 | ⬜ 미정 | 현재 violet 계열. 유지하면 CSS 변경 0. 바꾸면 `src/index.css` 토큰 + Tailwind 클래스 전수 교체(별도 작업) |
| D9 | 저작권 표기 | ⬜ 미정 | 제안: `© 2026 PHYNESIS. Operated by 그래플레이.` |
| D10 | GitHub 리포지토리 이름 | ⬜ 미정 | `grapplay-biz-shell` → `phynesis` (선택. 코드에 영향 없음) |

> D2·D3·D7은 **PR 1(§2·§3) 착수 전**, D6은 **PR 2(§4) 착수 전**에 확정되어야 한다.

---

## 2. PR 1-A: 브랜드 표기 교체 (기계적)

### 2.1 현재 상태 → 변경

| 파일 | 위치 | 현재 | 변경 |
|---|---|---|---|
| `src/components/AcademyLayout.tsx` | :59-60 헤더 로고 | `Grapplay` + `-biz` 2 span | `PHYNESIS` 1 span (D2). `-biz` span 삭제 |
| `src/components/AcademyLayout.tsx` | :142-143 푸터 로고 | 같음 | 같음 |
| `src/components/AcademyLayout.tsx` | :146 푸터 설명 | "체육관 경영자와 지도자를 위한 비즈니스 교육 플랫폼." | 태그라인(D3) |
| `src/components/AcademyLayout.tsx` | :168 주석 | "그래플레이 본사이트와 동일" | "운영 법인 그래플레이 사업자 정보" |
| `src/components/AcademyLayout.tsx` | :189 저작권 | `© 2026 Grapplay.` | D9 |
| `src/pages/AuthPage.tsx` | :55-56 로고 | `Grapplay` + `-biz` | `PHYNESIS` |
| `index.html` | `<title>` | "그래플레이 비즈 — 체육관 경영자를 위한 비즈니스 교육" | "파이네시스 — {태그라인}" + `<meta name="description">` 신설 |
| `package.json` | `name` | `grapplay-biz` | `phynesis` |
| `src/data/mock.ts` | :1 주석 | "그래플레이 비즈 —" | "파이네시스 —" |
| `src/pages/AcademyCourseDetail.tsx` | :25 환불 안내 | "그래플레이 환불정책에 따라" | "파이네시스 환불정책에 따라" |
| `src/pages/legal/StaticPage.tsx` | :3 주석 | "비즈 라이트 테마" | "파이네시스 라이트 테마" |
| `src/pages/Contact.tsx` | :1 주석 | "그래플레이 Contact 참고" | 유지 가능 (출처 주석) |
| `.env.example` | 1행 주석 | "비즈 전용 프로젝트 — 그래플레이 운영 DB와 분리" | "파이네시스 전용 프로젝트" |

### 2.2 약관·개인정보처리방침 — 회사/서비스 분리

법인은 그래플레이, 서비스는 파이네시스이므로 "회사"와 "서비스"의 정의를 분리한다.

| 파일 | 위치 | 현재 | 변경 |
|---|---|---|---|
| `src/pages/legal/Terms.tsx` | :9 제1조 | `그래플레이 비즈(이하 "회사")가 제공하는 체육관 경영자·지도자를 위한 비즈니스 교육 플랫폼 서비스(이하 "서비스")` | `그래플레이(이하 "회사")가 운영하는 전문가 비즈니스 교육 플랫폼 파이네시스(PHYNESIS, 이하 "서비스")` |
| `src/pages/legal/Terms.tsx` | :3 주석 | "비즈(단품)로 조정" | "파이네시스(단품)로 조정" |
| `src/pages/legal/Terms.tsx` | `updated` prop | 2026년 7월 5일 | 배포일로 갱신 |
| `src/pages/legal/Privacy.tsx` | :8 서문 | `그래플레이 비즈(이하 "회사")` | `그래플레이(이하 "회사")는 파이네시스(PHYNESIS) 서비스 운영과 관련하여 …` |
| `src/pages/legal/Privacy.tsx` | :3 주석, `updated` | — | 갱신 |

> 약관 변경은 **시행 7일 전 공지**가 원칙(전자상거래법 기준 불리한 변경은 30일). 서비스명 변경은
> 불리한 변경이 아니므로 7일 공지로 충분하지만, 공지 배너(관리자 배너 탭 활용)를 배포 전에 띄운다.

### 2.3 문서

| 파일 | 변경 |
|---|---|
| `README.md` | 제목·첫 문단 파이네시스로. **라우트 표가 `/academy/*`로 낡아 있음** → 실제 `src/App.tsx` 기준(`/`, `/library`, `/courses/:id`, …)으로 갱신 |
| `docs/plan/README.md` | 제목만 파이네시스로. 본문 Phase 기록은 역사 문서이므로 유지 |
| `docs/tasks/README.md`, `docs/plan/requests/README.md` | 상단에 "본 문서들은 리브랜딩 이전 명칭(그래플레이 비즈) 기준" 1줄 추가. 내용 수정 안 함 |
| `grapplay-biz-separation-and-sales.md`, `biz-server-migration.md` | 유지 (기획 배경 기록). README에서 링크 시 "(리브랜딩 이전 문서)" 표기 |
| `supabase/migrations/*.sql`, `supabase/setup.sql`, `supabase/seed.sql` 헤더 주석 | **수정 안 함.** 이미 적용된 마이그레이션 파일은 건드리지 않는다 |

### 2.4 남겨두는 것 (의도적)

- **사업자 정보** — `AcademyLayout.tsx:171-184`, `Contact.tsx:34-37`, `Privacy.tsx:90`: 상호명 그래플레이,
  대표자, 사업자등록번호, 통신판매업 신고번호, 주소, 전화. 법인 정보이므로 서비스명과 무관하게 유지.
  (새 법인을 세울 경우에만 교체 — 현재 계획 범위 밖)
- **이메일** `grapplay.com@gmail.com` — D5 결정까지 유지.
- **DB 스키마·테이블명·Supabase 프로젝트** — 이름에 브랜드가 없으므로 변경 없음.

---

## 3. PR 1-B: 체육관 전제 카피 일반화

"체육관·관장·지도자"를 전제로 쓴 문구를 **분야 중립**으로 바꾼다. PR 1-A와 같은 PR에 넣는다.

### 3.1 사용자 노출 카피

| 파일:라인 | 현재 | 변경 제안 |
|---|---|---|
| `src/pages/AcademyLanding.tsx:36` | 체육관 경영, 오늘은 무엇을 배워볼까요? | 내 사업, 오늘은 무엇을 배워볼까요? |
| `src/pages/AcademyLanding.tsx:39` | 마케팅·상권분석·연금·경영까지 — 현장 전문가의 비즈니스 강의 | 마케팅·상권분석·{D7}·경영까지 — 현장에서 사업을 키운 전문가의 강의 |
| `src/pages/AcademyLanding.tsx:48` | 체육관 경영에 꼭 필요한 4가지 분야 | 전문가의 사업에 꼭 필요한 4가지 주제 |
| `src/pages/AcademyLanding.tsx:67` | 관장님들이 가장 많이 찾는 강의 | 전문가들이 가장 많이 찾는 강의 |
| `src/pages/AcademyLanding.tsx:99` | 바로 읽는 체육관 경영 가이드 | 바로 읽는 사업 운영 가이드 |
| `src/pages/AcademyLanding.tsx:137` | 체육관 경영, 이제 혼자 고민하지 마세요 | 사업 고민, 이제 혼자 하지 마세요 |
| `src/pages/AuthPage.tsx:61-63` | 혼자 고민하던 체육관 경영, / 이제 전문가에게 배우세요 | 혼자 고민하던 내 사업, / 이제 전문가에게 배우세요 |
| `src/components/AcademyLayout.tsx:146` | (§2.1 태그라인으로 대체) | — |
| `src/pages/AcademyLibrary.tsx:34` | 체육관 경영에 필요한 모든 강의를 한곳에서 | 사업 운영에 필요한 모든 강의를 한곳에서 |
| `src/pages/AcademyEbooks.tsx:33` | 바로 읽는 체육관 경영 가이드 · 워크북 | 바로 읽는 사업 운영 가이드 · 워크북 |
| `src/pages/ContentHub.tsx:67` | 강의와 전자책을 한 곳에서 — 체육관 경영에 필요한 모든 콘텐츠 | 강의와 전자책을 한 곳에서 — 사업 운영에 필요한 모든 콘텐츠 |
| `src/pages/AcademyExperts.tsx:43` | 현장에서 검증된 체육관 비즈니스 전문가를 만나보세요 | 현장에서 검증된 비즈니스 전문가를 만나보세요 |
| `src/pages/AcademyExperts.tsx:124` | 체육관 비즈니스 전문가이신가요? | 비즈니스 노하우를 가진 전문가이신가요? |
| `src/pages/AcademyMyPage.tsx:63` | `'관장님'` (이름 폴백) | `'회원님'` (`AcademyLayout.tsx:215`의 `'회원'`과 통일) |

### 3.2 입력 placeholder·예시 (전문가/관리자 화면)

| 파일:라인 | 현재 | 변경 제안 |
|---|---|---|
| `src/components/ExpertProfileEditor.tsx:98` | 예: 15년차 체육관 경영 컨설턴트 | 예: 15년차 세무사 · 개원 컨설턴트 |
| `src/components/ExpertProfileEditor.tsx:137` | 예: 체육관 경영 컨설팅 15년 | 예: 소규모 사업 컨설팅 15년 |
| `src/pages/admin/tabs/ExpertsTab.tsx:159` | 직함 (예: 주짓수 블랙벨트) | 직함 (예: 공인회계사) |
| `src/pages/admin/tabs/ExpertsTab.tsx:228` | 예: 체육관 경영 컨설팅 15년 | (위와 동일) |
| `src/pages/academy-expert/AcademyEbookEditor.tsx:239` | 예) 체육관 운영 체크리스트 50 | 예) 개업 준비 체크리스트 50 |
| `src/pages/academy-expert/AcademyCourseEditor.tsx:290` | 예) 체육관 첫 100명 회원 만들기 | 예) 첫 100명 고객 만들기 |
| `src/pages/academy-expert/AcademyCourseEditor.tsx:87` | 체육관 운영의 현실적인 고민을 풀어드립니다. (기본 블록) | 현장의 현실적인 고민을 풀어드립니다. |

### 3.3 카테고리 설명·이모지 (`src/data/mock.ts:7-12`)

카테고리 **키(문자열)는 PR 2에서** 다루고, 여기서는 설명만 중립화한다.

| key | 현재 desc | 변경 |
|---|---|---|
| 마케팅 | 신규 회원 모집과 브랜딩 전략 | 신규 고객 확보와 브랜딩 전략 |
| 상권분석 | 입지 선정과 상권 데이터 읽는 법 | (유지) |
| 연금 | 관장을 위한 노후·자산 설계 | 자영 전문가를 위한 노후·자산 설계 |
| 경영 (🏋️) | 운영 효율과 수익 구조 설계 | (유지) · 이모지 🏋️ → 📈 |

### 3.4 검증 (PR 1)

```bash
# 브랜드 잔존 — 사업자 정보 3곳(상호명) 외 0건이어야 함
grep -rn "Grapplay\|그래플레이" src | grep -v "상호명\|grapplay.com@gmail\|Contact 참고"
# 체육관 전제 — 0건
grep -rn "체육관\|관장\|주짓수\|도장" src
grep -rn "\-biz" src            # 로고 suffix 잔존 0건
npm run build                   # 타입체크 + 빌드
```

수동: `/`, `/auth`, `/library`, `/ebooks`, `/content`, `/experts`, `/my`, `/terms`, `/privacy`, `/contact`,
`/expert/courses/new`, `/admin`(전문가 탭) 열어 브랜드·카피 확인. 모바일 폭에서 헤더 로고 폭 확인
(`-biz` 제거로 짧아짐 → 레이아웃 깨짐 없음 확인).

---

## 4. PR 2: 카테고리 구조 개편 (다분야 대응)

### 4.1 현재 구조와 문제

- `src/data/mock.ts:5` — `type Category = '마케팅' | '상권분석' | '연금' | '경영'` 하드코딩 union.
- 이 타입/`CATEGORIES` 상수를 **12개 파일**이 import: `AcademyLanding`, `AcademyLibrary`, `AcademyEbooks`,
  `ContentHub`, `AcademyExperts`, `AcademyCourseEditor`, `AcademyEbookEditor`, `ExpertProfileEditor`,
  `admin/tabs/ExpertsTab`, `lib/expertApi`, `lib/adminApi`, `data/mockEbooks`.
- DB: `courses.category`, `ebooks.category` = `text`, `experts.category` = `text`, `experts.categories` =
  `text[]`. **check 제약 없음** → DB는 어떤 문자열이든 받는다. 제약은 앱 타입에만 있다.
- 핵심 관찰: **현재 4개 카테고리는 "주제(topic)"이고 이미 업종 중립적**이다(마케팅·상권분석·재무·경영은
  어느 전문가에게나 해당). 체육관 색은 `desc` 문구와 이모지, 그리고 `연금`이라는 협소한 이름에만 있다.
  따라서 "업종"은 카테고리를 갈아엎는 게 아니라 **별도 축(분야, field)을 추가**하는 문제다.

### 4.2 결정: 2축 분류 (주제 × 분야)

| 축 | 의미 | 예 | 저장 위치 |
|---|---|---|---|
| **주제(topic)** = 기존 `category` | 무엇을 배우나 | 마케팅 · 상권분석 · 재무·연금(D7) · 경영 | `courses.category`, `ebooks.category`, `experts.categories` (기존 컬럼 그대로) |
| **분야(field)** = 신규 | 누구를 위한 콘텐츠인가 | 피트니스·무도 · 의료·헬스케어 · 법률·세무 · 교육·학원 · 뷰티 · 크리에이터 … (D6에서 확정) | `courses.field`, `ebooks.field`, `experts.fields` (신규) |

- 분야는 **nullable / 빈 배열 허용** = "모든 분야 공통". 기존 콘텐츠는 마이그레이션에서
  `'피트니스·무도'`로 일괄 지정 (현재 콘텐츠 전부 체육관 대상이므로).
- 주제 4개는 **당분간 코드 상수 유지**. 분야 목록은 처음부터 DB 테이블로 두어 관리자가 추가할 수 있게 한다
  (분야는 늘어날 것이 확실하고, 주제는 안정적이기 때문).

### 4.3 단계

**4.3.1 `연금` → `재무·연금` rename (D7 확정 시)**
[`tasks/01-copy-labels.md`](../tasks/01-copy-labels.md)와 `supabase/migrations/20260615000000_category_rename_ebook_category.sql`
의 "체육관 운영 → 경영" 선례를 그대로 따른다.

```sql
-- supabase/migrations/2026MMDD000000_category_rename_finance.sql
update courses set category = '재무·연금' where category = '연금';
update ebooks  set category = '재무·연금' where category = '연금';
update experts set category = '재무·연금' where category = '연금';
update experts set categories = array_replace(categories, '연금', '재무·연금')
  where '연금' = any(categories);
```
+ `src/data/mock.ts:5,10` 타입·상수 갱신. URL 파라미터 `?cat=연금` 북마크는 깨지므로
`AcademyLibrary.tsx:16`, `AcademyEbooks.tsx:16`, `ContentHub.tsx:27`의 initialCat 판정 앞에 구 값 → 신 값
매핑 1줄 추가.

**4.3.2 분야(field) 테이블 + 컬럼**

```sql
-- supabase/migrations/2026MMDD000100_fields.sql
create table if not exists fields (
  key        text primary key,          -- '피트니스·무도'
  label      text not null,             -- 표시명 (key와 같아도 됨)
  emoji      text,
  sort_order integer not null default 0,
  is_active  boolean not null default true
);
alter table fields enable row level security;
create policy "fields public read" on fields for select using (true);
-- 쓰기: 관리자만 (기존 is_admin() 헬퍼 재사용 — DB-SCHEMA.md 참고)

alter table courses add column if not exists field  text references fields(key);
alter table ebooks  add column if not exists field  text references fields(key);
alter table experts add column if not exists fields text[] not null default '{}';

insert into fields (key, label, emoji, sort_order) values ('피트니스·무도','피트니스·무도','🥋',0)
  on conflict do nothing;
-- 기존 콘텐츠는 전부 첫 분야로
update courses set field = '피트니스·무도' where field is null;
update ebooks  set field = '피트니스·무도' where field is null;
update experts set fields = array['피트니스·무도'] where fields = '{}';
```
D6에서 확정한 나머지 분야를 `insert`로 추가. `docs/plan/DB-SCHEMA.md`에 `fields` 테이블과 3개 컬럼 반영.

**4.3.3 앱 반영**

| 영역 | 파일 | 변경 |
|---|---|---|
| 타입 | `src/data/mock.ts` | `Field` 타입(`string`), `Course.field?`, `Expert.fields?`; `mockEbooks.ts`의 `Ebook.field?` |
| 로드 | `src/lib/api.ts`, `src/lib/useBizData.ts` | `fields` 테이블 로드 + 매퍼에 `field`/`fields` 추가 |
| 쓰기 | `src/lib/expertApi.ts`, `src/lib/adminApi.ts` | course/ebook 저장 payload에 `field`, expert에 `fields` |
| 편집 | `AcademyCourseEditor`, `AcademyEbookEditor` | 카테고리 select 옆에 **분야 select** (fields 테이블 기반, "공통" 옵션 = null) |
| 편집 | `ExpertProfileEditor`, `admin/tabs/ExpertsTab` | 전문 주제 토글 아래 **활동 분야 토글**(다중) |
| 관리 | `admin/tabs/` 신규 `FieldsTab.tsx` 또는 `ContentTab` 내 섹션 | 분야 추가·순서·활성화 (BannerTab 패턴 재사용) |
| 필터 | `AcademyLibrary`, `AcademyEbooks`, `ContentHub`, `AcademyExperts` | 기존 주제 칩 위에 **분야 칩 1줄** 추가. URL `?field=` 파라미터 (기존 `?cat=`와 병행) |
| 랜딩 | `AcademyLanding.tsx:47-62` | "무엇을 배우고 싶으세요?"(주제 4칸) 유지 + 그 위/아래에 **"어떤 분야에서 일하시나요?"** 분야 그리드 신설 → `/library?field=` |
| 검색 | `SearchResults.tsx` | 결과에 분야 배지 표시 (필터는 선택) |

> 분야가 1개(피트니스·무도)뿐인 시점에는 분야 칩/그리드를 **자동 숨김**(`fields.length > 1`일 때만 렌더)
> → 첫 출시에서 UI가 비어 보이지 않는다.

### 4.4 검증 (PR 2)

- 마이그레이션 후 `select category, count(*) from courses group by 1` 에 `연금` 0건.
- `select field, count(*) from courses group by 1` 전부 `피트니스·무도`.
- 분야 1개 상태에서 랜딩·목록에 분야 UI **안 보임**; 관리자에서 분야 1개 추가 → 즉시 칩 노출.
- 강의 편집기에서 분야 저장 → 목록 `?field=` 필터 동작.
- `?cat=연금` 구 URL 진입 → `재무·연금` 필터로 정상 매핑.
- `npm run build` 통과.

---

## 5. 데이터 (시드·기존 콘텐츠)

- `supabase/seed.sql`, `supabase/setup.sql`: 개발용 시드(김도장, "체육관 첫 100명 회원 만들기" 등)가 전부
  체육관 콘텐츠. **운영 DB에는 영향 없음**(이미 실데이터). 두 가지 선택:
  - (권장) 시드는 "피트니스·무도 분야 샘플"로 두고 헤더 주석에만 명시. 새 분야 샘플 1~2건 추가.
  - 전면 재작성 — 비용 대비 효과 낮음.
- 운영 DB의 기존 전문가·강의·전자책은 그대로 파이네시스의 **첫 분야 콘텐츠**가 된다. 마이그레이션(§4.3.2)이
  `field` 를 채워 준다. 콘텐츠 본문의 "관장님" 등 표현은 전문가 각자가 수정(강제 안 함).

---

## 6. 코드 외 설정 (외부 서비스) — 오너 체크리스트

코드 배포와 **같은 날** 맞춰야 사용자에게 두 이름이 섞여 보이지 않는다.

| # | 서비스 | 항목 | 비고 |
|---|---|---|---|
| E1 | 도메인/Vercel | 새 도메인 연결, 기존 도메인 → 301 리다이렉트 | D4 |
| E2 | Supabase Auth | 이메일 템플릿(가입 확인·비밀번호 재설정) 발신자명·본문의 서비스명, **Site URL / Redirect URLs** 에 새 도메인 추가 | 카카오 콜백 `/auth/callback` 포함 |
| E3 | 카카오 개발자 콘솔 | 앱 이름·아이콘·동의 화면에 표시되는 서비스명, 플랫폼 도메인 | 로그인 동의창에 "그래플레이 비즈"가 그대로 보이는 지점 |
| E4 | 토스페이먼츠 | 상점명(결제창·영수증·카드 명세 표기) | `orderName`은 강의 제목이라 코드 변경 없음(`Checkout.tsx:72`). 상점명은 대시보드 설정 |
| E5 | Vimeo | 폴더/프로젝트명 | 선택. 사용자 비노출 |
| E6 | Supabase 프로젝트명 | 대시보드 표시명만 | 선택. URL 불변 |
| E7 | 파비콘·OG 이미지 | 현재 `index.html`에 **파비콘·OG 태그 없음** → 로고 확정 후 `favicon.svg`, `og:title/description/image` 추가 | 신규 |
| E8 | 통신판매업 | 신고 사항 중 **인터넷 도메인** 변경 신고 | 도메인 바뀌면 필요. 상호는 불변 |
| E9 | 공지 | 약관 변경 공지 배너 (관리자 배너 탭) — 배포 7일 전 | §2.2 |
| E10 | GitHub | 리포 rename(D10), Vercel Git 연동 재확인 | 선택 |

---

## 7. 실행 순서·PR 분할

| 순서 | 작업 | 선행 결정 | 산출물 |
|---|---|---|---|
| 0 | 사전 결정 D1~D10 중 D2·D3·D7 확정, 도메인·상표 확인 | — | 이 문서 §1 표 갱신 |
| 1 | **PR 1**: §2 브랜드 표기 + §3 카피 일반화 + §2.3 문서 | D2, D3, D7(명칭만) | 한 PR. 배포는 E1~E4·E9와 같은 날 |
| 2 | **PR 2**: §4 카테고리 2축 (rename 마이그레이션 → fields 테이블 → 앱) | D6, D7 | 마이그레이션 2개 + 앱. 분야 1개면 UI 자동 숨김이라 PR 1과 독립 배포 가능 |
| 3 | E5~E8, E10 정리, 시드 보강(§5) | — | 후속 소규모 |

- PR 1은 **문자열 교체 위주**로 하루 작업. PR 2는 스키마·12개 파일 수정으로 2~3일.
- PR 1을 먼저 배포하고 PR 2는 두 번째 분야 출시 직전에 배포해도 된다. 단 `연금` rename(§4.3.1)만은
  카피(§3.1의 랜딩 :39)와 같이 나가야 자연스러우므로 **PR 1에 포함**하는 것도 가능 — D7 확정 시점에 결정.

## 8. 범위 외

- 브랜드 컬러 변경(D8에서 "바꾼다"로 결정될 경우 별도 Phase).
- 새 법인 설립 시 사업자 정보 교체.
- 로고 디자인(이미지) 제작 — 확정되면 E7에서 파비콘/OG만 반영.
- 그래플레이 본 서비스 쪽 링크·언급 정리(별도 리포).
