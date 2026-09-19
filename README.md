# 파이네시스 (PHYNESIS)

전문가를 위한 비즈니스 교육 플랫폼 **파이네시스**의 프론트엔드 + Supabase 백엔드입니다.
현장에서 사업을 키운 전문가의 강의·전자책을 단품으로 판매하고, 전문가 대시보드·관리자·정산까지 포함합니다.

> 이 프로젝트는 "그래플레이 비즈"에서 출발해 독립 브랜드로 리브랜딩됐습니다.
> 배경·계획은 [`docs/plan/10-rebrand-phynesis.md`](./docs/plan/10-rebrand-phynesis.md) 참고.
> 리브랜딩 이전 기획 문서: [`grapplay-biz-separation-and-sales.md`](./grapplay-biz-separation-and-sales.md),
> [`biz-server-migration.md`](./biz-server-migration.md).

## 기술 스택

- React 18 + TypeScript
- Vite 5
- Tailwind CSS 4
- React Router 6
- Supabase (Auth · DB · Storage · Edge Functions) — 파이네시스 전용 프로젝트
- 토스페이먼츠 (결제) · Vimeo (강의 영상) · pdf.js (전자책 뷰어)

## 실행 방법

```bash
npm install
cp .env.example .env   # Supabase / 토스 키 입력 (아래 참고)
npm run dev            # http://localhost:5173
```

> 환경변수(`.env`)가 비어 있으면 앱은 자동으로 **목업 데이터**로 동작합니다.

## 백엔드 (Supabase)

1. `.env`에 파이네시스 프로젝트의 값 입력:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   VITE_TOSS_CLIENT_KEY=test_ck_...
   ```
2. 스키마는 `supabase/migrations/` (순서대로 적용), 개발 시드는 `supabase/seed.sql`.
   현재 스키마 요약: [`docs/plan/DB-SCHEMA.md`](./docs/plan/DB-SCHEMA.md).
3. Edge Functions: `supabase/functions/confirm-payment` (토스 결제 승인), `vimeo-create-upload` (영상 업로드).
   시크릿(`TOSS_SECRET_KEY` 등)은 Edge Function 환경변수에만 둡니다.
4. 데이터 흐름: `src/lib/supabase.ts`(클라이언트) → `src/lib/api.ts`(읽기 + 목업 폴백)
   → `src/lib/useBizData.ts`(로드 훅) → 각 페이지. 쓰기는 `src/lib/expertApi.ts`(전문가), `src/lib/adminApi.ts`(관리자).

기타 스크립트:

```bash
npm run build    # 타입체크 + 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
```

## 화면 (라우트)

| 화면 | 경로 |
|------|------|
| 랜딩 | `/` |
| 강의 둘러보기 | `/library` |
| 강의 상세 | `/courses/:id` |
| 강의 수강 (플레이어) | `/learn/:id` |
| 전자책 목록 / 상세 / 읽기 | `/ebooks`, `/ebooks/:id`, `/read/:id` |
| 콘텐츠 허브 (강의+전자책) | `/content` |
| 통합 검색 | `/search` |
| 전문가 디렉터리 / 리뷰 | `/experts`, `/experts/:expertId/reviews` |
| 내 강의 (마이페이지) | `/my` |
| 로그인 | `/auth`, `/auth/callback` |
| 결제 | `/checkout`, `/payments/success`, `/payments/fail` |
| 문의 / 약관 / 개인정보 | `/contact`, `/terms`, `/privacy` |
| 전문가 대시보드 | `/expert/dashboard` |
| 강의 에디터 | `/expert/courses/new`, `/expert/courses/:id/edit` |
| 전자책 에디터 | `/expert/ebooks/new`, `/expert/ebooks/:id/edit` |
| 관리자 | `/admin` |

## 브랜드 자산

- 로고: `public/logo/` (PNS 심볼 원본 검정/흰, 투명 심볼). **심볼은 파비콘·앱 아이콘에만** 쓴다. 설명은 `public/logo/README.md`.
- 파비콘·OG 이미지: `public/favicon-*.png`, `favicon.ico`, `apple-touch-icon.png`, `og-image.png`, `site.webmanifest`.
- 워드마크: **파이네시스 / PHYNESIS** 2줄, SUIT Bold 서브셋(`public/fonts/wordmark.woff2`) — `src/components/BrandLogo.tsx`. 정적 SVG는 `public/logo/wordmark*.svg`.
- 포인트 컬러: violet 계열 단색 (`src/index.css`).
- 카테고리: `src/data/mock.ts`의 `CATEGORIES` 6종 (마케팅·브랜딩·상권분석·투자·경영·인문교양). 구 값 `연금`은 `resolveCategory()`가 `투자`로 매핑.

## 구조

```
src/
├─ App.tsx                        # 라우팅
├─ components/                    # 레이아웃·카드·플레이어·에디터 부품
│  ├─ AcademyLayout.tsx           # 공통 헤더 / 모바일 하단 탭 / 푸터
│  └─ BrandLogo.tsx               # 워드마크
├─ data/                          # 타입 + 카테고리 상수 (+ 목업 폴백)
├─ lib/                           # Supabase 클라이언트, API, 인증, 결제·영상·PDF 유틸
└─ pages/
   ├─ Academy*.tsx                # 소비자 화면
   ├─ academy-expert/             # 전문가 대시보드·에디터
   ├─ admin/                      # 관리자 대시보드 (탭별)
   └─ legal/                      # 약관·개인정보·정적 페이지
supabase/
├─ migrations/                    # 스키마 (순서대로)
├─ functions/                     # Edge Functions
└─ seed.sql                       # 개발용 시드
docs/
├─ plan/                          # Phase별 구현 명세 (00~10)
└─ tasks/                         # 소규모 작업 스펙
```
