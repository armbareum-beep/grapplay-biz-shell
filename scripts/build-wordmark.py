"""파이네시스 워드마크 빌드.

- 비교 시안 이미지 렌더링 (scratch)
- 워드마크 서브셋 웹폰트(woff2) 생성 → public/fonts/
- 워드마크 SVG(글자 → 패스) 생성 → public/logo/wordmark*.svg

폰트 원본(OTF)은 리포에 넣지 않는다. FONT_DIR에 SUIT-Bold.otf 등을 두고 실행:
    python3 scripts/build-wordmark.py <FONT_DIR>
"""
import sys, os, subprocess
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONT_DIR = sys.argv[1] if len(sys.argv) > 1 else '.'
KO, EN = '파이네시스', 'PHYNESIS'
FONT = 'SUIT-Bold.otf'          # ← 워드마크 서체. 바꾸려면 여기만
KO_TRACK, EN_TRACK = 0.04, 0.28  # 자간 (em)

def text_path(font, text, size, track_em, x0=0, y0=0):
    """글자를 SVG path d 문자열로. 반환: (d, 총 너비)"""
    cmap = font.getBestCmap(); gs = font.getGlyphSet(); upem = font['head'].unitsPerEm
    s = size / upem; x = x0; parts = []
    for ch in text:
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[g].draw(TransformPen(pen, (s, 0, 0, -s, x, y0)))
        parts.append(pen.getCommands())
        x += font['hmtx'][g][0] * s + track_em * size
    return ' '.join(parts), x - x0 - track_em * size

def build_svg(font, fill, out):
    ko_size, en_size = 100, 30
    d1, w1 = text_path(font, KO, ko_size, KO_TRACK)
    d2, w2 = text_path(font, EN, en_size, EN_TRACK)
    W = max(w1, w2); H = 150
    y1 = 92; y2 = 138
    ox1 = (W - w1) / 2; ox2 = (W - w2) / 2
    d1, _ = text_path(font, KO, ko_size, KO_TRACK, ox1, y1)
    d2, _ = text_path(font, EN, en_size, EN_TRACK, ox2, y2)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H}" role="img" aria-label="파이네시스 PHYNESIS">'
           f'<path fill="{fill}" d="{d1}"/><path fill="{fill}" fill-opacity="0.6" d="{d2}"/></svg>')
    open(out, 'w').write(svg); print('svg', out, f'{W:.0f}x{H}')

if __name__ == '__main__':
    src = os.path.join(FONT_DIR, FONT)
    font = TTFont(src)
    build_svg(font, '#0f172a', 'public/logo/wordmark.svg')
    build_svg(font, '#ffffff', 'public/logo/wordmark-white.svg')
    subprocess.run(['pyftsubset', src, f'--text={KO}{EN}', '--flavor=woff2',
                    '--output-file=public/fonts/wordmark.woff2', '--no-hinting'], check=True)
    print('woff2', os.path.getsize('public/fonts/wordmark.woff2'), 'bytes')
