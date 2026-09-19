# 파이네시스 로고 자산

| 파일 | 용도 |
|---|---|
| `pns-black.png` | 원본 — 검정 PNS 심볼 / 흰 배경 (1254×1254) |
| `pns-white.png` | 원본 — 흰 PNS 심볼 / 검정 배경 (1254×1254) |
| `pns-symbol.png` | 검정 심볼만 투명 배경으로 추출 (1048×573). 파비콘·아이콘 생성 원본 |

**PNS 심볼은 파비콘·앱 아이콘(`/favicon-*.png`, `/favicon.ico`, `/apple-touch-icon.png`)에만 쓴다.**
화면 안(헤더·푸터·로그인)과 OG 이미지에는 한국어 워드마크 **파이네시스** 글자만 쓴다
(`src/components/BrandLogo.tsx`, 계획: `docs/plan/10-rebrand-phynesis.md` D2).

파비콘은 `pns-symbol.png`를 정사각형 캔버스에 여백 10%로 맞춰 생성했다. 다크 모드용(`favicon-dark-*.png`)은 흰 심볼 / 검정 배경.
