#!/usr/bin/env python3
"""BırakGitsin uygulama simgesi üreticisi (saf Python, harici kütüphane yok).

Stil: koyu zeminli daire (badge) içinde parlak sigara simgesi.
"""
import os
import struct
import sys
import zlib

DARK_TOP = (30, 39, 54)
DARK_BOT = (9, 13, 19)
PAPER = (250, 250, 252)
FILTER = (228, 178, 106)
EMBER = (255, 126, 28)
EMBER_HOT = (255, 208, 104)
GLOW = (255, 150, 60)
WHITE = (255, 255, 255)


def clamp(v, lo, hi):
    return lo if v < lo else hi if v > hi else v


def lerp(a, b, t):
    return a + (b - a) * t


def rounded_rect_d(px, py, x0, y0, x1, y1, radii):
    hx = (x1 - x0) / 2.0
    hy = (y1 - y0) / 2.0
    ccx = (x0 + x1) / 2.0
    ccy = (y0 + y1) / 2.0
    lx = px - ccx
    ly = py - ccy
    right = lx > 0
    bottom = ly > 0
    if not right and not bottom:
        r = radii[0]
    elif right and not bottom:
        r = radii[1]
    elif right and bottom:
        r = radii[2]
    else:
        r = radii[3]
    r = min(r, hx, hy)
    qx = abs(lx) - (hx - r)
    qy = abs(ly) - (hy - r)
    ax = qx if qx > 0 else 0.0
    ay = qy if qy > 0 else 0.0
    return (ax * ax + ay * ay) ** 0.5 + min(max(qx, qy), 0.0) - r


def circle_d(px, py, cx, cy, radius):
    dx = px - cx
    dy = py - cy
    return (dx * dx + dy * dy) ** 0.5 - radius


def cov_from_d(d):
    return clamp(0.5 - d, 0.0, 1.0)


def blend(buf, idx, r, g, b, a):
    if a <= 0:
        return
    ia = int(a * 255 + 0.5)
    if ia <= 0:
        return
    inv = 255 - ia
    buf[idx] = (int(r) * ia + buf[idx] * inv) // 255
    buf[idx + 1] = (int(g) * ia + buf[idx + 1] * inv) // 255
    buf[idx + 2] = (int(b) * ia + buf[idx + 2] * inv) // 255
    buf[idx + 3] = (255 * ia + buf[idx + 3] * inv) // 255


def draw_rounded(buf, S, x0, y0, x1, y1, radii, color, alpha=1.0):
    xa = max(0, int(x0) - 2)
    xb = min(S - 1, int(x1) + 2)
    ya = max(0, int(y0) - 2)
    yb = min(S - 1, int(y1) + 2)
    for y in range(ya, yb + 1):
        row = y * S * 4
        for x in range(xa, xb + 1):
            d = rounded_rect_d(x + 0.5, y + 0.5, x0, y0, x1, y1, radii)
            c = cov_from_d(d) * alpha
            if c > 0:
                blend(buf, row + x * 4, color[0], color[1], color[2], c)


def draw_circle(buf, S, cx, cy, radius, color, alpha=1.0):
    xa = max(0, int(cx - radius) - 2)
    xb = min(S - 1, int(cx + radius) + 2)
    ya = max(0, int(cy - radius) - 2)
    yb = min(S - 1, int(cy + radius) + 2)
    for y in range(ya, yb + 1):
        row = y * S * 4
        for x in range(xa, xb + 1):
            d = circle_d(x + 0.5, y + 0.5, cx, cy, radius)
            c = cov_from_d(d) * alpha
            if c > 0:
                blend(buf, row + x * 4, color[0], color[1], color[2], c)


def draw_circle_grad(buf, S, cx, cy, radius, top, bottom):
    xa = max(0, int(cx - radius) - 2)
    xb = min(S - 1, int(cx + radius) + 2)
    ya = max(0, int(cy - radius) - 2)
    yb = min(S - 1, int(cy + radius) + 2)
    y0 = cy - radius
    span = 2 * radius
    for y in range(ya, yb + 1):
        row = y * S * 4
        t = clamp((y + 0.5 - y0) / span, 0.0, 1.0)
        rr = lerp(top[0], bottom[0], t)
        gg = lerp(top[1], bottom[1], t)
        bb = lerp(top[2], bottom[2], t)
        for x in range(xa, xb + 1):
            d = circle_d(x + 0.5, y + 0.5, cx, cy, radius)
            c = cov_from_d(d)
            if c > 0:
                blend(buf, row + x * 4, rr, gg, bb, c)


def draw_cigarette(buf, S, g, oy, pal, glow=False, flame=False):
    cx = S / 2.0
    cy = S / 2.0 + oy * S
    a = 0.350 * S * g
    b = 0.080 * S * g
    r = b
    filter_len = 0.300 * S * g
    ember_len = 0.060 * S * g
    x0, x1 = cx - a, cx + a
    y0, y1 = cy - b, cy + b

    if glow:
        gx0, gy0 = x0 - 0.05 * S, y0 - 0.05 * S
        gx1, gy1 = x1 + 0.05 * S, y1 + 0.05 * S
        gr = r + 0.05 * S
        draw_rounded(buf, S, gx0 - 0.03 * S, gy0 - 0.03 * S, gx1 + 0.03 * S,
                     gy1 + 0.03 * S, (gr, gr, gr, gr), GLOW, 0.10)
        draw_rounded(buf, S, gx0, gy0, gx1, gy1, (gr, gr, gr, gr), GLOW, 0.16)

    draw_rounded(buf, S, x0, y0, x1, y1, (r, r, r, r), pal[0], 1.0)
    draw_rounded(buf, S, x0, y0, x0 + filter_len, y1, (r, 0, 0, r), pal[1], 1.0)
    draw_circle(buf, S, x1 - b, cy, 0.11 * S * g, GLOW, 0.45)
    draw_rounded(buf, S, x1 - ember_len, y0, x1, y1, (0, r, r, 0), pal[2], 1.0)
    draw_circle(buf, S, x1 - b, cy, 0.045 * S * g, pal[3], 0.95)

    if flame:
        fx = x1 - b
        for fr, fy, fc in (
            (0.085 * S * g, -0.10 * S * g, pal[2]),
            (0.055 * S * g, -0.20 * S * g, pal[3]),
            (0.030 * S * g, -0.29 * S * g, (255, 233, 150)),
        ):
            draw_circle(buf, S, fx, cy + fy, fr, fc, 0.95)
        return

    smoke = [
        (0.28, -0.19, 0.038, 0.60),
        (0.34, -0.28, 0.048, 0.52),
        (0.39, -0.37, 0.055, 0.44),
        (0.43, -0.44, 0.060, 0.36),
    ]
    for fx, fy, fr, fa in smoke:
        draw_circle(buf, S, cx + fx * S * g, cy + fy * S * g, fr * S * g, pal[4], fa)


def png_write(path, S, buf):
    raw = bytearray()
    stride = S * 4
    for y in range(S):
        raw.append(0)
        raw += buf[y * stride:(y + 1) * stride]

    def chunk(typ, data):
        return (struct.pack(">I", len(data)) + typ + data
                + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF))

    ihdr = struct.pack(">IIBBBBB", S, S, 8, 6, 0, 0, 0)
    out = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
           + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b""))
    with open(path, "wb") as fh:
        fh.write(out)


def render(S, mode="icon"):
    buf = bytearray(S * S * 4)
    if mode == "background":
        for i in range(0, len(buf), 4):
            buf[i], buf[i + 1], buf[i + 2], buf[i + 3] = DARK_BOT[0], DARK_BOT[1], DARK_BOT[2], 255
        return buf

    if mode == "icon":
        draw_circle_grad(buf, S, S / 2.0, S / 2.0, 0.47 * S, DARK_TOP, DARK_BOT)
        draw_cigarette(buf, S, 0.84, 0.05, (PAPER, FILTER, EMBER, EMBER_HOT, WHITE), glow=True, flame=True)
    elif mode == "foreground":
        draw_cigarette(buf, S, 0.62, 0.02, (PAPER, FILTER, EMBER, EMBER_HOT, WHITE), glow=True, flame=True)
    elif mode == "mono":
        w = (255, 255, 255)
        draw_cigarette(buf, S, 0.62, 0.02, (w, w, w, w, w), glow=False)
    return buf


def ascii_preview(S, buf, cols=64):
    rows = cols // 2
    lines = []
    for ry in range(rows):
        line = []
        for rx in range(cols):
            x = int((rx + 0.5) * S / cols)
            y = int((ry + 0.5) * S / rows)
            idx = (y * S + x) * 4
            rr, gg, bb, aa = buf[idx], buf[idx + 1], buf[idx + 2], buf[idx + 3]
            if aa < 40:
                line.append(" ")
            elif rr > 200 and gg > 200 and bb > 200:
                line.append("#")
            elif rr > 180 and gg < 175 and bb < 160:
                line.append("*")
            elif rr > 180 and gg > 140 and bb < 160:
                line.append("=")
            elif rr > 120 and gg > 70 and bb < 120:
                line.append("~")
            elif rr < 70 and gg < 80 and bb < 90:
                line.append(".")
            else:
                line.append("?")
        lines.append("".join(line))
    return "\n".join(lines)


if __name__ == "__main__":
    project = "/root/workspace/birakgitsin"
    assets = os.path.join(project, "assets")
    web = sys.argv[1] if len(sys.argv) > 1 else None

    png_write(os.path.join(assets, "icon.png"), 1024, render(1024, "icon"))
    png_write(os.path.join(assets, "favicon.png"), 64, render(64, "icon"))
    png_write(os.path.join(assets, "splash-icon.png"), 512, render(512, "icon"))
    png_write(os.path.join(assets, "android-icon-foreground.png"), 1024, render(1024, "foreground"))
    png_write(os.path.join(assets, "android-icon-background.png"), 1024, render(1024, "background"))
    png_write(os.path.join(assets, "android-icon-monochrome.png"), 1024, render(1024, "mono"))

    if web:
        png_write(os.path.join(web, "icon-512.png"), 512, render(512, "icon"))
        png_write(os.path.join(web, "icon-192.png"), 192, render(192, "icon"))
        png_write(os.path.join(web, "favicon.png"), 64, render(64, "icon"))

    print(ascii_preview(256, render(256, "icon")))
    print("Ikonlar uretildi.")
