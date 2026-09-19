# Phase 10 — 리브랜딩: 그래플레이 비즈 → 파이네시스 (PHYNESIS)

> 작성일: 2026-09-19 · 갱신: 2026-09-19 · 상태: **PR 1 완료 (§2·§3) · PR 2 미착수 (§4) · 외부 설정 미착수 (§6)**
> 선행: 없음 (Phase 0~9 완료 상태 기준). 후속: 없음.
> 관련: [00-db-schema.md](./00-db-schema.md), [DB-SCHEMA.md](./DB-SCHEMA.md), [../tasks/01-copy-labels.md](../tasks/01-copy-labels.md)(카테고리 rename 선례)

---

## 0. 한 줄 요약

"그래플레이의 하위 서비스(주짓수 체육관 관장 대상)"를 **"모든 분야 전문가를 위한 독립 브랜드
파이네시스"** 로 바꾼다. 단순 이름 교체가 아니라 **(1) 브랜드 표기 교체 → (2) 체육관 전제 카피 일반화
→ (3) 카테고리 4개 → 6개 개편 → (4) 외부 서비스 설정 교체** 4단계로 진행한다.

### 브랜드 정의

| 항목 | 값 |
|---|---|
| 워드마크 | **파이네시스** + 아래 작게 **PHYNESIS** (2줄). 서체 **SUIT Bold**, 한글 자간 +0.04em, 영문 자간 +0.28em, 흑백 |
| 심볼(로고) | **PNS 모노그램** — `public/logo/`. **파비콘·앱 아이콘에만 사용**, 화면 안에는 넣지 않는다 (§6 E7) |
| 한글 표기 | **파이네시스** (고정. "피네시스" 표기는 사용하지 않음) |
| 어원 | Paideia(파이데이아, 전인적 교육) + Phronesis(프로네시스, 실천적 지혜) |
| 포지셔닝 | 전문가(전문직·자영 전문가·지도자 등)가 **자기 사업을 운영하는 데 필요한 실천 지식**을 다른 전문가에게서 배우는 교육 플랫폼 |
| 그래플레이와의 관계 | **없음.** 별개 브랜드. 기존 체육관 경영 콘텐츠는 파이네시스의 초기 콘텐츠로 남을 뿐이다. "by Grapplay" 병기 안 함. |
| 운영 주체 (법인) | 그래플레이 (상호명·사업자등록·통신판매업 신고는 **그대로 유지**) — §2.4 참고 |
| 카테고리 (6) | **마케팅 · 상권분석 · 투자 · 경영 · 브랜딩 · 인문교양** — §4 |

---

## 1. 사전 결정 사항

### 1.1 용어 설명 (D2·D3)

- **워드마크(wordmark)** = 로고를 그림 없이 **글자만으로** 표현한 것. 지금 헤더 왼쪽 위의 `Grapplay-biz` 글자가
  워드마크다. → 한국어 **파이네시스**로 확정(D2). 화면에는 글자만 쓰고 PNS 심볼은 파비콘에만 쓴다.
- **태그라인(tagline)** = 브랜드 이름 옆에 항상 붙는 **한 줄 설명**. 이름만 보고는 뭘 하는 서비스인지 알 수
  없으니 필요하다. 지금 푸터의 "체육관 경영자와 지도자를 위한 비즈니스 교육 플랫폼."이 태그라인이고,
  브라우저 탭 제목(`index.html`의 `<title>`)에도 같은 역할로 들어간다.

### 1.1.1 워드마크 서체 선정 (2026-09-19)

후보 Pretendard Bold · SUIT Bold · SUIT ExtraBold · Noto Sans KR Bold 를 같은 조건(파이네시스 + PHYNESIS, 자간 동일)으로
렌더링해 비교 → **SUIT Bold** 채택.

- **SUIT Bold**: 획 끝이 직선적이고 속공간이 좁아 "판단·사업·지성" 톤. 24px 헤더 크기에서도 획이 뭉치지 않음. 라틴 `PHYNESIS`도 같은 패밀리라 두 줄의 결이 맞음.
- Pretendard Bold: 완성도는 같은 급이나 곡선이 조금 더 부드러워 "교육 서비스" 쪽으로 기움. 본문용으로는 최적이지만 워드마크 차별성이 약함.
- SUIT ExtraBold: 큰 사이즈에선 좋으나 헤더 24px에서 획이 붙기 시작.
- Noto Sans KR Bold(현재 본문 서체): 안정적이지만 평범. 본문과 워드마크가 같은 서체면 브랜드 구분이 안 됨.
- 피한 것: 명조, 둥근 고딕, 귀여운 스타트업 서체.

적용 방식: SUIT Bold 를 워드마크 13글자만 서브셋(1.3KB woff2)해 자체 호스팅 → 페이지 로드 부담 없음. 본문 서체(Noto Sans KR)는 그대로.
향후 획 커스텀(파·네·스)이 필요하면 `public/logo/wordmark.svg` 패스를 직접 손보면 된다.

### 1.2 결정표

| # | 결정 | 상태 | 값 / 비고 |
|---|---|---|---|
| D1 | 한글 표기 | ✅ 확정 | **파이네시스**. 로고·도메인·앱스토어·약관 전부 동일 표기 |
| D2 | 워드마크 표기 | ✅ 확정 | **파이네시스 / PHYNESIS** 2줄, 서체 **SUIT Bold**(서브셋 `public/fonts/wordmark.woff2` 1.3KB, `font-wordmark`). 헤더/푸터/로그인 공통 `BrandLogo.tsx`. **PNS 심볼은 파비콘·앱 아이콘 전용**. 정적 SVG: `public/logo/wordmark.svg` / `wordmark-white.svg`. 재생성: `scripts/build-wordmark.py` |
| D3 | 태그라인 | 🟡 기본값 채택 | **"전문가를 위한 비즈니스 교육 플랫폼"** (푸터·`<title>`·`meta description`용, 서술형). 랜딩 히어로는 §3.1의 감성 카피를 따로 쓴다. 다른 의견 없으면 이대로 진행 |
| D4 | 도메인 | ⬜ 미정 | phynesis.com / .kr / .co 확보 여부 확인 → Vercel 연결. **KIPRIS 상표 검색** 병행 |
| D5 | 대표 이메일 | ⬜ 미정 | 현재 `grapplay.com@gmail.com` (푸터·문의·개인정보 책임자 3곳). 새 주소를 만들지, 당분간 유지할지 |
| D6 | 분야(업종) 축 도입 | ✅ 결정: **도입 안 함** | 피트니스·무도 / 법률·세무 / 의료 같은 업종 분류를 만들지 않는다. 카테고리는 주제 단일 축으로 간다 (§4) |
| D7 | 카테고리 개편 | ✅ 확정 | `연금` → **`투자`** rename. **`브랜딩`, `인문교양`** 신설. 총 6개 |
| D8 | 브랜드 컬러 | ⬜ 미정 | 현재 violet 계열. 유지하면 CSS 변경 0. 바꾸면 `src/index.css` 토큰 + Tailwind 클래스 전수 교체(별도 작업) |
| D9 | 저작권 표기 | 🟡 기본값 채택 | `© 2026 PHYNESIS. Operated by 그래플레이.` |
| D10 | GitHub 리포지토리 이름 | ⬜ 미정 | `grapplay-biz-shell` → `phynesis` (선택. 코드에 영향 없음) |

> 🟡 기본값 항목은 코드 작업 착수 시 그대로 적용한다. 바꾸고 싶으면 착수 전에 이 표를 고친다.
> D4·D5는 코드가 아니라 배포(§6)와 관련되므로 배포 전까지만 정하면 된다.

---

## 2. PR 1-A: 브랜드 표기 교체 (기계적) — ✅ 완료

> 헤더·푸터·로그인 워드마크는 공용 컴포넌트 `src/components/BrandLogo.tsx`(파이네시스 / PHYNESIS 2줄, SUIT Bold 서브셋)로 뽑았다.
> `index.html`에 `meta description`·OG 태그·`og-image.png`(1200×630)까지 추가. `--font-brand` 토큰 제거.

### 2.1 현재 상태 → 변경

| 파일 | 위치 | 현재 | 변경 |
|---|---|---|---|
| `src/components/AcademyLayout.tsx` | :59-60 헤더 로고 | `Grapplay` + `-biz` 2 span | `<BrandLogo>` — `파이네시스` 텍스트만, `font-black`. `font-brand` 제거 |
| `src/components/AcademyLayout.tsx` | :142-143 푸터 로고 | 같음 | 같음 |
| `src/components/AcademyLayout.tsx` | :146 푸터 설명 | "체육관 경영자와 지도자를 위한 비즈니스 교육 플랫폼." | "전문가를 위한 비즈니스 교육 플랫폼." (D3) |
| `src/components/AcademyLayout.tsx` | :168 주석 | "그래플레이 본사이트와 동일" | "운영 법인 그래플레이 사업자 정보" |
| `src/components/AcademyLayout.tsx` | :189 저작권 | `© 2026 Grapplay.` | `© 2026 PHYNESIS. Operated by 그래플레이.` (D9) |
| `src/pages/AuthPage.tsx` | :55-56 로고 | `Grapplay` + `-biz` | `<BrandLogo size="lg">` (헤더와 동일, 글자만) |
| `index.html` | `<title>` | "그래플레이 비즈 — 체육관 경영자를 위한 비즈니스 교육" | "파이네시스 — 전문가를 위한 비즈니스 교육 플랫폼" + `<meta name="description">` 신설 |
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

## 3. PR 1-B: 체육관 전제 카피 일반화 — ✅ 완료

"체육관·관장·지도자"를 전제로 쓴 문구를 **분야 중립**으로 바꾼다. PR 1-A와 같은 PR에 넣는다.

### 3.1 사용자 노출 카피

| 파일:라인 | 현재 | 변경 제안 |
|---|---|---|
| `src/pages/AcademyLanding.tsx:36` | 체육관 경영, 오늘은 무엇을 배워볼까요? | 내 사업, 오늘은 무엇을 배워볼까요? |
| `src/pages/AcademyLanding.tsx:39` | 마케팅·상권분석·연금·경영까지 — 현장 전문가의 비즈니스 강의 | 마케팅·브랜딩·투자·경영·인문교양까지 — 현장에서 사업을 키운 전문가의 강의 (PR 2와 함께 반영) |
| `src/pages/AcademyLanding.tsx:48` | 체육관 경영에 꼭 필요한 4가지 분야 | 전문가의 사업에 꼭 필요한 6가지 주제 (PR 2와 함께 반영) |
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

### 3.3 검증 (PR 1)

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

## 4. PR 2: 카테고리 4개 → 6개 — ⬜ 미착수

### 4.1 현재 구조

- `src/data/mock.ts:5` — `type Category = '마케팅' | '상권분석' | '연금' | '경영'` 하드코딩 union.
- `src/data/mock.ts:7-12` — `CATEGORIES` 상수 (key·emoji·desc). 필터 칩·에디터 select·랜딩 그리드가 전부
  이 상수를 `map` 해서 그리므로 **상수에 항목을 추가하면 UI에 자동 반영**된다.
- 이 타입/상수를 import 하는 파일 12개: `AcademyLanding`, `AcademyLibrary`, `AcademyEbooks`, `ContentHub`,
  `AcademyExperts`, `AcademyCourseEditor`, `AcademyEbookEditor`, `ExpertProfileEditor`, `admin/tabs/ExpertsTab`,
  `lib/expertApi`, `lib/adminApi`, `data/mockEbooks`. **타입이 union이므로 상수만 고치면 나머지는 자동으로 따라온다.**
- DB: `courses.category`, `ebooks.category`, `experts.category` = `text`, `experts.categories` = `text[]`.
  **check 제약 없음** → 새 카테고리 값 추가에 스키마 변경이 필요 없다. rename만 데이터 update가 필요하다.

### 4.2 결정된 카테고리 (D6·D7)

분야(업종) 축은 만들지 않는다. 주제 단일 축, 6개.

| # | key | 변경 | emoji | desc (제안) |
|---|---|---|---|---|
| 1 | 마케팅 | 유지 | 📣 | 신규 고객 확보와 광고·홍보 전략 (현재 "신규 회원 모집과 브랜딩 전략" — 회원→고객, 브랜딩은 별도 카테고리로 분리) |
| 2 | 브랜딩 | **신설** | 🎨 | 전문가 개인 브랜드와 포지셔닝 |
| 3 | 상권분석 | 유지 | 📍 | 입지 선정과 상권 데이터 읽는 법 (유지) |
| 4 | 투자 | **`연금` → rename** | 💰 | 사업 수익을 자산으로 키우는 투자·재무 설계 (현재 "관장을 위한 노후·자산 설계") |
| 5 | 경영 | 유지 | 📈 | 운영 효율과 수익 구조 설계 (유지) · 이모지 🏋️ → 📈 |
| 6 | 인문교양 | **신설** | 📚 | 사업의 안목을 넓히는 인문·교양 강의 |

순서는 "고객을 모으고(마케팅·브랜딩) → 자리를 잡고(상권분석) → 돈을 키우고(투자·경영) → 사람을 키운다(인문교양)"
흐름. 랜딩 그리드 순서에 그대로 쓴다.

### 4.3 변경

**4.3.1 데이터 마이그레이션 — `연금` → `투자`**
[`tasks/01-copy-labels.md`](../tasks/01-copy-labels.md)와 `supabase/migrations/20260615000000_category_rename_ebook_category.sql`
의 "체육관 운영 → 경영" 선례를 그대로 따른다. 신설 2개는 마이그레이션 불필요(행이 없으므로).

```sql
-- supabase/migrations/2026MMDD000000_category_rename_invest.sql
update courses set category = '투자' where category = '연금';
update ebooks  set category = '투자' where category = '연금';
update experts set category = '투자' where category = '연금';
update experts set categories = array_replace(categories, '연금', '투자')
  where '연금' = any(categories);
```

`docs/plan/DB-SCHEMA.md`의 카테고리 설명 문구에 6개 값 반영.

**4.3.2 앱**

| 파일 | 변경 |
|---|---|
| `src/data/mock.ts:3-12` | 주석 "카테고리 4종" → 6종. `Category` union에 `'투자' \| '브랜딩' \| '인문교양'` (연금 제거). `CATEGORIES` 배열을 §4.2 순서·emoji·desc로 교체 |
| `src/pages/AcademyLanding.tsx:49` | 그리드 `grid-cols-2 … lg:grid-cols-4` → `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` (6칸 한 줄) 또는 `lg:grid-cols-3` (2줄). 카드 안 desc가 길어서 **`lg:grid-cols-3` 2줄 권장** |
| `src/pages/AcademyLanding.tsx:39,48` | §3.1의 카테고리 나열 카피·"6가지 주제" |
| `src/pages/AcademyLibrary.tsx:16`, `AcademyEbooks.tsx:16`, `ContentHub.tsx:27` | `?cat=연금` 구 URL(북마크·공유 링크) → `투자`로 매핑하는 1줄 추가. 예: `const LEGACY_CAT: Record<string, Category> = { 연금: '투자' }` 를 `mock.ts`에 두고 initialCat 판정 전에 치환 |
| `src/pages/academy-expert/AcademyEbookEditor.tsx:77` | 기본값 `CATEGORIES[0].key` — 순서 바뀌어도 마케팅이 0번이므로 영향 없음 (확인만) |
| 나머지 9개 파일 | `CATEGORIES.map` / `Category` 타입 사용 → **수정 없음**. `npm run build`로 타입 에러 없음만 확인 |

> 필터 칩(`AcademyLibrary:38`, `AcademyEbooks:37`, `ContentHub:71`, `AcademyExperts:57`)은 `'전체'` + 6개 = 7개.
> 모바일 폭에서 `flex-wrap`으로 2줄 되는지 확인. 넘치면 가로 스크롤(`overflow-x-auto`)로 바꾼다.

### 4.4 검증 (PR 2)

```bash
grep -rn "'연금'" src                    # 0건 (LEGACY_CAT 매핑 제외)
npm run build
```
- 마이그레이션 후 `select category, count(*) from courses group by 1` 에 `연금` 0건, `투자` = 기존 연금 건수.
  `ebooks`, `experts`(category·categories) 동일.
- 랜딩 카테고리 6칸 표시·클릭 → `/library?cat=브랜딩` 등 정상 필터.
- `/library?cat=연금` 진입 → `투자` 칩 활성.
- 강의/전자책 에디터 select에 6개, 전문가 프로필·관리자 전문가 탭 토글에 6개.
- 관리자에서 전문가 카테고리를 `인문교양`으로 저장 → `/experts` 필터에서 조회됨.

---

## 5. 데이터 (시드·기존 콘텐츠)

- `supabase/seed.sql`, `supabase/setup.sql`: 개발용 시드(김도장, "체육관 첫 100명 회원 만들기" 등)가 전부
  체육관 콘텐츠. **운영 DB에는 영향 없음**(이미 실데이터). 시드 파일은 유지하고 §4.3.1 rename만 시드에도 반영
  (`'연금'` → `'투자'`, 시드가 다시 돌아도 구 값이 안 들어가도록). 브랜딩·인문교양 샘플 1건씩 추가는 선택.
- 운영 DB의 기존 전문가·강의·전자책은 그대로 파이네시스의 초기 콘텐츠가 된다. 콘텐츠 본문의 "관장님" 등 표현은
  전문가 각자가 수정(강제 안 함).

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
| E7 | 파비콘·OG 이미지 | ✅ 완료 — 파비콘 세트(PNS 심볼) + `og-image.png`(1200×630, 워드마크 2줄+태그라인, SUIT Bold) + OG/twitter 메타 태그 | 완료 |
| E8 | 통신판매업 | 신고 사항 중 **인터넷 도메인** 변경 신고 | 도메인 바뀌면 필요. 상호는 불변 |
| E9 | 공지 | 약관 변경 공지 배너 (관리자 배너 탭) — 배포 7일 전 | §2.2 |
| E10 | GitHub | 리포 rename(D10), Vercel Git 연동 재확인 | 선택 |

---

## 7. 실행 순서·PR 분할

| 순서 | 작업 | 선행 결정 | 규모 |
|---|---|---|---|
| 1 | **PR 1**: §2 브랜드 표기 + §3 카피 일반화 + §2.3 문서 | — | ✅ 완료 (PR #12) |
| 2 | **PR 2**: §4 카테고리 6개 (마이그레이션 1개 + `mock.ts` + 랜딩 그리드 + 구 URL 매핑) | D7 (확정됨) | 반나절 |
| 3 | 배포: PR 1·2 머지 → 마이그레이션 적용 → E1~E4·E9 같은 날 | D4·D5 | 오너 작업 |
| 4 | E5~E8, E10 정리 | — | 후속 소규모 |

- PR 1과 PR 2는 파일이 겹치는 곳이 `AcademyLanding.tsx:39,48` 두 줄뿐이다. **PR 1을 먼저 머지하고 PR 2를
  그 위에서 만든다.** 둘 다 코드 결정이 끝났으므로 연달아 진행 가능.
- 마이그레이션(§4.3.1)은 PR 2 머지 직후 Supabase에 적용. 앱 배포 전에 적용해도 안전하다(구 앱은 `연금` 행이
  0건이 되어 필터에 안 잡힐 뿐 오류는 없음).

## 8. 범위 외

- 분야(업종) 축 — D6에서 도입 안 함으로 결정. 필요해지면 별도 Phase.
- 브랜드 컬러 변경(D8에서 "바꾼다"로 결정될 경우 별도 Phase).
- 새 법인 설립 시 사업자 정보 교체.
- 그래플레이 본 서비스 쪽 링크·언급 정리(별도 리포).
