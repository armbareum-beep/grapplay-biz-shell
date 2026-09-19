"""브랜드 마크 SVG 3종 + 파비콘 전체 생성. public/logo/README.md 참고."""
from PIL import Image
import re, os

import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "public")
SRC = f"{PUB}/logo/mark-source.png"

# ── 1. SVG (currentColor) ──
svg = open(f"{PUB}/logo/mark.svg").read()
m = re.search(r'viewBox="([^"]+)"', svg)
vb = m.group(1)
d = re.search(r'\sd="([^"]+)"', svg).group(1)
W, H = [float(v) for v in vb.split()[2:]]

def write_svg(path, fill):
    color = 'currentColor' if fill is None else fill
    open(path, "w").write(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" fill="{color}">'
        f'<path fill-rule="evenodd" d="{d}"/></svg>')

os.makedirs(f"{PUB}/logo", exist_ok=True)
write_svg(f"{PUB}/logo/mark.svg", None)
write_svg(f"{PUB}/logo/mark-black.svg", "#0f172a")
write_svg(f"{PUB}/logo/mark-white.svg", "#ffffff")

# ── 2. 파비콘 (기존 관례: 라이트=흰 배경+검정 마크, 다크=검정 배경+흰 마크) ──
src = Image.open(SRC).convert("L")
bb = Image.eval(src, lambda v: 255 - v).getbbox()      # 마크 영역
mark = src.crop(bb)                                     # 흰 배경 위 검정 마크(그레이)
mw, mh = mark.size

def icon(size, bg, fg, ratio=0.80):
    target = int(size * ratio)
    s = target / max(mw, mh)
    nw, nh = max(1, round(mw * s)), max(1, round(mh * s))
    m = mark.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), bg)
    # 그레이(0=검정 마크, 255=흰 배경) → 알파 마스크
    alpha = Image.eval(m, lambda v: 255 - v)
    layer = Image.new("RGBA", (nw, nh), fg)
    layer.putalpha(alpha)
    canvas.paste(layer, ((size - nw) // 2, (size - nh) // 2), layer)
    return canvas

WHITE, INK = (255, 255, 255, 255), (15, 23, 42, 255)    # slate-900
BLACK = (0, 0, 0, 255)

# 작은 크기는 여백을 줄여야 탭에서 형태가 보인다
RATIO = {16: 0.94, 32: 0.90, 48: 0.86}
r = lambda s: RATIO.get(s, 0.80)
light = {s: icon(s, WHITE, INK, r(s)) for s in (16, 32, 48, 180, 192, 512)}
dark  = {s: icon(s, BLACK, WHITE, r(s)) for s in (32, 192)}

for s in (16, 32, 48, 192, 512):
    light[s].save(f"{PUB}/favicon-{s}.png")
light[180].save(f"{PUB}/apple-touch-icon.png")
for s in (32, 192):
    dark[s].save(f"{PUB}/favicon-dark-{s}.png")
# .ico 는 16/32/48 다중 사이즈
light[48].save(f"{PUB}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

print("SVG viewBox", vb, "| path", len(d), "bytes")
for f in ["logo/mark.svg","favicon-16.png","favicon-32.png","favicon-48.png","favicon-192.png",
          "favicon-512.png","favicon-dark-32.png","favicon-dark-192.png","apple-touch-icon.png","favicon.ico"]:
    print(f"  {f:28s} {os.path.getsize(PUB+'/'+f):>7,}B")
