"""로고 PNG → SVG 추적. public/logo/README.md 참고.

주의: 단순화 계수(eps)는 --size 로 정한 좌표계 기준이라 해상도를 바꾸면 같이 조정해야 한다.
현재 public/logo/mark.svg 는 4096px 원본을 size=1024·eps=1.2 로 뽑은 것(viewBox 670x700, 1.4KB).
이 패스는 src/components/BrandLogo.tsx 에 인라인으로 복사돼 있으니, 다시 뽑으면 거기도 함께 갱신할 것."""

from PIL import Image
import math, sys

def binary(path, size=1024, thresh=128):
    """긴 변을 size 로 맞추되 원본 비율은 유지한다(정사각 강제 금지 — 마크가 찌그러진다)."""
    im = Image.open(path).convert("L")
    w0, h0 = im.size
    sc = size / max(w0, h0)
    im = im.resize((max(1, round(w0 * sc)), max(1, round(h0 * sc))), Image.LANCZOS)
    w, h = im.size
    px = im.load()
    grid = [[1 if px[x, y] < thresh else 0 for x in range(w)] for y in range(h)]
    return grid, w, h

def trim(grid, w, h):
    xs = [x for y in range(h) for x in range(w) if grid[y][x]]
    ys = [y for y in range(h) for x in range(w) if grid[y][x]]
    x0, x1, y0, y1 = min(xs), max(xs)+1, min(ys), max(ys)+1
    g = [[grid[y][x] for x in range(x0, x1)] for y in range(y0, y1)]
    return g, x1-x0, y1-y0

def loops(grid, w, h):
    """채워진 픽셀의 경계를 방향성 있는 변으로 만들고 폐곡선으로 잇는다."""
    def on(x, y):
        return 0 <= x < w and 0 <= y < h and grid[y][x]
    edges = {}
    for y in range(h):
        row = grid[y]
        for x in range(w):
            if not row[x]: continue
            if not on(x, y-1): edges[(x, y)] = (x+1, y)
            if not on(x+1, y): edges[(x+1, y)] = (x+1, y+1)
            if not on(x, y+1): edges[(x+1, y+1)] = (x, y+1)
            if not on(x-1, y): edges[(x, y+1)] = (x, y)
    out = []
    while edges:
        start = next(iter(edges))
        loop = [start]
        cur = start
        while True:
            nxt = edges.pop(cur, None)
            if nxt is None or nxt == start: break
            loop.append(nxt); cur = nxt
        if len(loop) > 3: out.append(loop)
    return out

def dp_closed(pts, eps):
    """폐곡선 단순화 — 시작점과 가장 먼 점으로 둘로 잘라 각각 DP."""
    n = len(pts)
    if n < 4: return pts
    p0 = pts[0]
    i1 = max(range(n), key=lambda i: (pts[i][0]-p0[0])**2 + (pts[i][1]-p0[1])**2)
    a = dp(pts[:i1+1], eps)
    b = dp(pts[i1:] + [p0], eps)
    return a[:-1] + b[:-1]

def dp(pts, eps):
    """Douglas-Peucker (열린 폴리라인용)"""
    if len(pts) < 3: return pts
    def rec(a, b):
        if b <= a + 1: return []
        (x0, y0), (x1, y1) = pts[a], pts[b]
        dx, dy = x1-x0, y1-y0
        L = math.hypot(dx, dy) or 1e-9
        best, bi = -1, -1
        for i in range(a+1, b):
            x, y = pts[i]
            d = abs(dy*x - dx*y + x1*y0 - y1*x0) / L
            if d > best: best, bi = d, i
        if best <= eps: return []
        return rec(a, bi) + [bi] + rec(bi, b)
    keep = [0] + rec(0, len(pts)-1) + [len(pts)-1]
    return [pts[i] for i in keep]

def to_svg(path, size=1024, eps=0.9, out="mark.svg", pad=0):
    grid, w, h = binary(path, size)
    grid, w, h = trim(grid, w, h)
    ds = []
    for lp in loops(grid, w, h):
        s = dp_closed(lp, eps)
        if len(s) < 4: continue
        d = "M" + " ".join(f"{x} {y}" for x, y in s) + "Z"
        ds.append(d)
    body = f'<path fill-rule="evenodd" d="{" ".join(ds)}"/>'
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {-pad} {w+pad*2} {h+pad*2}" '
           f'fill="currentColor">{body}</svg>')
    open(out, "w").write(svg)
    n = sum(d.count(" ") for d in ds)
    print(f"{out}: {w}×{h} (비 {w/h:.3f}), 폐곡선 {len(ds)}개, 점 약 {n}개, {len(svg)} bytes")
    return w, h

if __name__ == "__main__":
    import os
    ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src = os.path.join(ROOT, "public/logo/mark-source.png")
    out = os.path.join(ROOT, "public/logo/mark.svg")
    to_svg(src, size=int(sys.argv[1]) if len(sys.argv) > 1 else 1024,
           eps=float(sys.argv[2]) if len(sys.argv) > 2 else 1.2, out=out)
