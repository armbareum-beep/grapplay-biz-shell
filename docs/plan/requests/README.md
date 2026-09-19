# 요청 작업 — 종류별 구현 명세 (2026-06-10)

> 본 문서들은 리브랜딩 이전 명칭(그래플레이 비즈) 기준으로 작성됐다. 현재 서비스명은 **파이네시스** — [../10-rebrand-phynesis.md](../10-rebrand-phynesis.md) 참고.

사용자 요청 12건을 **종류별**로 묶어 7개 문서로 정리했다. 각 문서는 목표 / 현재 상태 /
변경 파일 / DB / 검증을 자체 완결로 담는다.

## 아키텍처 메모 (모든 문서 공통)

- 데이터는 **이중 구조**: `src/lib/api.ts`가 Supabase에서 읽고, 실패 시 `src/data/*` 목업으로 폴백.
  → 새 필드를 추가하면 **(1) 목업 타입/데이터, (2) `api.ts` 매퍼, (3) 마이그레이션 SQL** 세 곳을 함께 고친다.
- 이미지 업로드: `src/lib/storage.ts`의 `uploadToCovers(file, folder)` → 공개 `covers` 버킷 public URL.
- 쓰기 API: 전문가 = `src/lib/expertApi.ts`, 관리자 = `src/lib/adminApi.ts`. mutation 후 `invalidateBizData()`.
- 카테고리: `src/data/mock.ts`의 `Category` = `'마케팅' | '상권분석' | '연금' | '경영'`.

## 문서 ↔ 요청 매핑

| 문서 | 다루는 요청 | 핵심 |
|---|---|---|
| [R1-cards-and-filters.md](./R1-cards-and-filters.md) | ①무료 필터, ④카드 통일 | 무료 체크박스 필터, 강의/전자책 카드에 전문가 이름 통일 |
| [R2-banner.md](./R2-banner.md) | ②배너 링크, ③배너 관리자 편집 | 배너 클릭 시 링크 이동 + 관리자 대시보드 배너 탭 (DB) |
| [R3-header.md](./R3-header.md) | ⑤시작하기 제거 | 헤더 우상단 "시작하기" 버튼 삭제, "로그인"만 |
| [R4-expert-and-profile.md](./R4-expert-and-profile.md) | ⑥다중 카테고리, ⑦사진 업로드, ⑧마이페이지 프로필 | 전문가 다중 분야 + 사진 + 본인 프로필 편집 (DB) |
| [R5-content-editor-styling.md](./R5-content-editor-styling.md) | ⑨랜딩 텍스트 꾸미기 | DetailBlock에 굵기/크기/색상 스타일 |
| [R6-site-info.md](./R6-site-info.md) | ⑩이메일, ⑪통신판매업 | 연락처 일괄 교체 |
| [R7-ebook-protection.md](./R7-ebook-protection.md) | ⑫다운로드 방지+워터마크 | iframe→canvas 렌더, 다운로드 차단, 이메일 워터마크 |

## 구현 순서 (의존도/난이도)

1. R6 사이트 정보 (단순 텍스트)
2. R3 헤더 (JSX 1곳)
3. R1 카드·필터 (UI)
4. R5 콘텐츠 에디터 (타입 확장)
5. R2 배너 (DB + 관리자 탭)
6. R4 전문가·프로필 (DB + 업로드 + 마이페이지)
7. R7 전자책 보호 (PDF 렌더 교체)
</content>
</invoke>
