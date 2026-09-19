# 파이네시스 로고 자산

브랜드 마크는 **PH 모노그램** 하나로 통일한다. 화면(헤더·푸터·로그인)·파비콘·OG 이미지 모두 같은 마크를 쓴다.
2026-09-19 이전에 쓰던 2줄 텍스트 워드마크(파이네시스 / PHYNESIS)와 PNS 심볼은 이 마크로 대체돼 삭제했다(git 이력에는 남아 있다).

| 파일 | 용도 |
|---|---|
| `mark.svg` | **마스터.** `fill="currentColor"` — 화면에서 배경색에 따라 색이 따라온다 |
| `mark-black.svg` | 잉크색(`#0f172a`) 고정 — 밝은 배경용. 외부 자료·인쇄 |
| `mark-white.svg` | 흰색 고정 — 어두운 배경용 |
| `mark-source.png` | 추적 원본(래스터 1024px). 벡터 재생성이 필요할 때만 씀 |

- 화면 마크: `src/components/BrandLogo.tsx` 가 패스를 인라인 SVG로 들고 있다(`currentColor`). 높이 sm 26 / md 32 / lg 52px.
- 마크 비율은 **670 × 700**(viewBox 기준). 정사각에 가까워, 텍스트 워드마크와 같은 존재감을 내려면 높이를 더 키워야 한다.

## 재생성

원본 PNG에서 다시 뽑아야 할 때:

```bash
python3 scripts/trace-logo.py <해상도> <단순화계수>   # 예: 1024 1.2 → mark.svg
python3 scripts/build-brand-assets.py                 # SVG 3종 + 파비콘 전체
```

- 추적은 픽셀 경계를 따라 폐곡선을 만든 뒤 Douglas-Peucker로 단순화한다. 계수 1.2가 원본과 시각적으로 동일하면서 1.4KB로 가장 작다.
- 파비콘은 정사각 캔버스에 마크를 중앙 배치. 여백은 크기별로 다르다 — 16px은 6%, 32px 10%, 48px 14%, 그 이상 20%.
  작은 탭 아이콘은 여백을 줄여야 형태가 보인다.
- 다크 모드용(`favicon-dark-*.png`)은 흰 마크 / 검정 배경.

## 그 밖

- `public/fonts/wordmark.woff2`(SUIT Bold 서브셋)는 로고에서는 더 이상 쓰지 않는다.
  랜딩의 대형 PHYNESIS 표기(히어로 배경 워터마크, 철학 섹션)에만 남아 있다. 재생성은 `scripts/build-wordmark.py`.
- SUIT 라이선스: SIL OFL 1.1 (상업 사용·임베딩 가능).
