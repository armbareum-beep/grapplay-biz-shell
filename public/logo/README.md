# 파이네시스 로고 자산

| 파일 | 용도 |
|---|---|
| `wordmark.svg` | **워드마크** (파이네시스 / PHYNESIS 2줄, SUIT Bold, 글자 → 패스). 흰 배경용 |
| `wordmark-white.svg` | 워드마크 흰색 — 어두운 배경용 |
| `pns-black.png` | 심볼 원본 — 검정 PNS / 흰 배경 (1254×1254) |
| `pns-white.png` | 심볼 원본 — 흰 PNS / 검정 배경 (1254×1254) |
| `pns-symbol.png` | 검정 심볼만 투명 배경으로 추출 (1048×573). 파비콘·아이콘 생성 원본 |

**PNS 심볼은 파비콘·앱 아이콘(`/favicon-*.png`, `/favicon.ico`, `/apple-touch-icon.png`)에만 쓴다.**
화면 안(헤더·푸터·로그인)과 OG 이미지에는 워드마크만 쓴다.

- 화면 워드마크: `src/components/BrandLogo.tsx` — 서브셋 웹폰트 `public/fonts/wordmark.woff2`(SUIT Bold, 13글자, 1.3KB)를
  `src/index.css`의 `@font-face "Wordmark"` + `font-wordmark` 로 사용. 자간 한글 +0.04em / 영문 +0.28em.
- 재생성: `python3 scripts/build-wordmark.py <SUIT-Bold.otf 가 있는 폴더>` → SVG 2종 + woff2.
- SUIT 라이선스: SIL OFL 1.1 (상업 사용·임베딩 가능).

파비콘은 `pns-symbol.png`를 정사각형 캔버스에 여백 10%로 맞춰 생성했다. 다크 모드용(`favicon-dark-*.png`)은 흰 심볼 / 검정 배경.
