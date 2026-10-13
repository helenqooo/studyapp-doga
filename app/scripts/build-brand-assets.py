"""Renders the Lumi mark (assets/brand/logo.svg) into the app icon, splash, favicon,
Android adaptive icon layers and the web app icons.

    python3 scripts/build-brand-assets.py      (no dependencies: plain Python 3)

Geometry on a 100-unit grid: ring centre (50, 50), radius 30, stroke 14 with round caps,
a 50° gap centred at the top right (-70°..-20°), and a dot of radius 9 at (55.7, 44.3).

The shapes are drawn as signed distance fields with one pixel of anti-aliasing, and the
PNGs are written with zlib, so the script needs neither Pillow nor a vector renderer.
Every brand PNG comes from here; never edit them by hand.

Colours follow the soft palette (spec 2.0): a soft slate tile, paper ring, pastel fosfor dot.
"""
import math
import os
import struct
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', 'assets')

GRAPHITE = (75, 85, 103)  # #4B5567 soft slate (primary / mark, light)
PAPER = (241, 244, 248)  # #F1F4F8 (background, light)
FOSFOR = (255, 220, 110)  # #FFDC6E pastel fosfor (accent, light)
NIGHT_INK = (227, 231, 238)  # #E3E7EE (text, dark): the ring on the dark splash
NIGHT_FOSFOR = (242, 211, 115)  # #F2D373 (accent, dark)
WHITE = (255, 255, 255)

# Ring and dot on the 100-unit grid. The ring's outer diameter is 2 * (30 + 7) = 74 units.
RING_R, RING_W = 30.0, 14.0
GAP = (290.0, 340.0)  # degrees, clockwise on screen from +x: the open part of the ring
DOT = (5.7, -5.7, 9.0)  # offset from the centre and radius
OUTER = 74.0


def _cap_points(cx, cy, r):
    return [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))) for a in GAP]


def render(size, ring, dot=None, scale=1.0, background=None, radius=0.0):
    """The mark centred on a size x size canvas.

    `scale` is the ring's outer diameter / size; `radius` rounds the background tile
    (a share of the size). Returns rows of straight-alpha RGBA floats packed as bytes.
    """
    dot = dot or ring
    u = scale * size / OUTER
    c = size / 2.0
    r, hw = RING_R * u, RING_W * u / 2.0
    caps = _cap_points(c, c, r)
    dx, dy, dr = c + DOT[0] * u, c + DOT[1] * u, DOT[2] * u
    reach = r + hw + 1.0
    lo, hi = int(max(0, math.floor(c - reach))), int(min(size, math.ceil(c + reach)))
    corner = radius * size
    half = size / 2.0

    out = bytearray(size * size * 4)
    for y in range(size):
        py = y + 0.5
        row = y * size * 4
        for x in range(size):
            px = x + 0.5
            # Background tile (rounded box distance, or a full-bleed square).
            if background is None:
                br, bg, bb, ba = 0.0, 0.0, 0.0, 0.0
            else:
                ba = 1.0
                if corner > 0:
                    qx = abs(px - half) - (half - corner)
                    qy = abs(py - half) - (half - corner)
                    if qx > 0 and qy > 0:
                        d = math.hypot(qx, qy) - corner
                        ba = min(1.0, max(0.0, 0.5 - d))
                br, bg, bb = background
            cr, cg, cb, ca = br, bg, bb, ba
            if lo <= x < hi and lo <= y < hi:
                # Ring: distance to the arc, or to the nearer round cap inside the gap.
                ox, oy = px - c, py - c
                dist = math.hypot(ox, oy)
                angle = math.degrees(math.atan2(oy, ox)) % 360.0
                if GAP[0] < angle < GAP[1]:
                    d = min(math.hypot(px - caps[0][0], py - caps[0][1]), math.hypot(px - caps[1][0], py - caps[1][1])) - hw
                else:
                    d = abs(dist - r) - hw
                cov = min(1.0, max(0.0, 0.5 - d))
                if cov > 0:
                    cr, cg, cb, ca = _over(ring, cov, cr, cg, cb, ca)
                cov = min(1.0, max(0.0, 0.5 - (math.hypot(px - dx, py - dy) - dr)))
                if cov > 0:
                    cr, cg, cb, ca = _over(dot, cov, cr, cg, cb, ca)
            i = row + x * 4
            out[i] = int(round(cr))
            out[i + 1] = int(round(cg))
            out[i + 2] = int(round(cb))
            out[i + 3] = int(round(ca * 255))
    return out


def _over(color, a, br, bg, bb, ba):
    """Straight-alpha source-over of `color` at coverage `a` onto (br, bg, bb, ba)."""
    oa = a + ba * (1 - a)
    if oa <= 0:
        return 0.0, 0.0, 0.0, 0.0
    k = ba * (1 - a)
    return (
        (color[0] * a + br * k) / oa,
        (color[1] * a + bg * k) / oa,
        (color[2] * a + bb * k) / oa,
        oa,
    )


def solid(size, color):
    return bytes((*color, 255)) * (size * size)


def write_png(rgba, size, *path, rgb=False):
    """An 8-bit PNG (RGB when `rgb`, so the iOS icon has no alpha channel)."""
    raw = bytearray()
    stride = size * 4
    for y in range(size):
        raw.append(0)  # filter: none
        line = rgba[y * stride:(y + 1) * stride]
        if rgb:
            line = bytes(b for i, b in enumerate(line) if i % 4 != 3)
        raw.extend(line)

    def chunk(kind, data):
        body = kind + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xFFFFFFFF)

    header = struct.pack('>IIBBBBB', size, size, 8, 2 if rgb else 6, 0, 0, 0)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) + chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b'')
    out = os.path.join(ASSETS, *path)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'wb') as f:
        f.write(png)
    print('  ' + os.path.relpath(out, os.path.join(ASSETS, '..')))


def tile(size, scale):
    """The app icon: paper ring and fosfor dot on a soft slate tile, full bleed."""
    return render(size, PAPER, FOSFOR, scale=scale, background=GRAPHITE)


write_png(tile(1024, 0.56), 1024, 'icon.png', rgb=True)
# Splash: the mark on the splash paper (light), and in night ink on the dark splash.
write_png(render(1024, GRAPHITE, FOSFOR, scale=0.9), 1024, 'splash-icon.png')
write_png(render(1024, NIGHT_INK, NIGHT_FOSFOR, scale=0.9), 1024, 'splash-icon-dark.png')
write_png(render(48, PAPER, FOSFOR, scale=0.62, background=GRAPHITE, radius=0.22), 48, 'favicon.png')
write_png(solid(1024, GRAPHITE), 1024, 'android-icon-background.png')
write_png(render(1024, PAPER, FOSFOR, scale=0.42), 1024, 'android-icon-foreground.png')
write_png(render(1024, WHITE, WHITE, scale=0.42), 1024, 'android-icon-monochrome.png')
for name, size in (('icon-192.png', 192), ('icon-512.png', 512), ('apple-touch-icon.png', 180)):
    write_png(tile(size, 0.56), size, 'pwa', name, rgb=True)
write_png(render(512, PAPER, FOSFOR, scale=0.45, background=GRAPHITE), 512, 'pwa', 'maskable-512.png', rgb=True)
print('brand assets written')
