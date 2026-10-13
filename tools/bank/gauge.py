"""Reads each test's difficulty gauge: where the red needle points on the coloured arc.

    python3 gauge.py gauges.json r200 gauge-read.json [sheet.png]

The arc is five coloured bands (Kolay green, Kolay-Orta blue, Orta yellow, Orta-Zor orange,
Zor purple). The needle's tip angle around the pivot picks the band whose pixels lie at
that angle, so the answer comes from the printed colours, not from fixed boundaries.
"""
import json
import math
import sys

import numpy as np
from PIL import Image, ImageDraw

gauges_path, src_dir, out_path = sys.argv[1:4]
sheet_path = sys.argv[4] if len(sys.argv) > 4 else None
SC = 200 / 72
LEVELS = ['Kolay', 'Kolay-Orta', 'Orta', 'Orta-Zor', 'Zor']


def classify(rgb):
    """Band index per pixel (-1 = not a band colour)."""
    r, g, b = [rgb[..., i].astype(int) for i in range(3)]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    sat = mx - mn
    out = np.full(r.shape, -1)
    coloured = (sat > 45) & (mx > 120)
    out[coloured & (g > r + 15) & (g > b + 15)] = 0  # green
    out[coloured & (b > r + 40) & (g > r + 20) & (b >= g - 10)] = 1  # light blue
    out[coloured & (r > 200) & (g > 170) & (b < g - 30) & (r - g < 60)] = 2  # yellow / beige
    out[coloured & (r > 190) & (g > 90) & (g < 175) & (b < 110) & (r - g >= 45)] = 3  # orange
    out[coloured & (b > g + 30) & (r > g + 20)] = 4  # purple
    return out


results = {}
crops = []
for page, x0, y0, x1, y1 in json.load(open(gauges_path)):
    img = Image.open(f"{src_dir}/p-{page:03d}.png").convert('RGB')
    box = (int((x0 - 8) * SC), int((y0 - 6) * SC), int((x1 + 8) * SC), int((y1 + 22) * SC))
    crop = img.crop(box)
    a = np.asarray(crop)
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    h, w = r.shape
    red = (r > 170) & (g < 90) & (b < 90)
    dark = (r < 70) & (g < 70) & (b < 70)
    dy, dx = np.nonzero(dark[h // 3 :, w // 4 : 3 * w // 4])
    ry, rx = np.nonzero(red)
    if len(dx) == 0 or len(rx) == 0:
        results[page] = None
        continue
    py, px = dy.mean() + h // 3, dx.mean() + w // 4  # pivot: the black dot
    # The needle is above the pivot; red text below the gauge (a section title) is not.
    up = ry <= py + 4
    rx, ry = rx[up], ry[up]
    if len(rx) == 0:
        results[page] = None
        continue
    dist = (rx - px) ** 2 + (ry - py) ** 2
    t = int(np.argmax(dist))
    tip_angle = math.degrees(math.atan2(py - ry[t], rx[t] - px))
    bands = classify(a)
    by, bx = np.nonzero(bands >= 0)
    angles = np.degrees(np.arctan2(py - by, bx - px))
    radius = np.hypot(bx - px, by - py)
    keep = (angles > -5) & (angles < 185) & (radius > 0.6 * math.sqrt(dist[t]))
    # Each band's centre angle (median of its pixels); the needle picks the nearest centre.
    centres = {}
    for k in range(5):
        ang = angles[keep & (bands[by, bx] == k)]
        if len(ang) >= 20:
            centres[LEVELS[k]] = float(np.median(ang))
    ranked = sorted(centres.items(), key=lambda kv: abs(kv[1] - tip_angle))
    best = ranked[0][0] if ranked else None
    # How clear the call is: distance to the second-nearest centre minus to the nearest.
    margin = abs(ranked[1][1] - tip_angle) - abs(ranked[0][1] - tip_angle) if len(ranked) > 1 else 0
    results[page] = dict(level=best, angle=round(tip_angle, 1), margin=round(margin, 1), centres={k: round(v) for k, v in centres.items()})
    crops.append((page, crop, best, tip_angle))

json.dump(results, open(out_path, 'w'), ensure_ascii=False, indent=1)
print(len(results), 'gauges;', sum(1 for v in results.values() if v and v['level']), 'read')
from collections import Counter
print(Counter(v['level'] for v in results.values() if v))

if sheet_path:
    cw = max(c.width for _, c, _, _ in crops)
    ch = max(c.height for _, c, _, _ in crops)
    cols = 8
    rows = (len(crops) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * (cw // 2 + 8), rows * (ch // 2 + 22)), 'white')
    d = ImageDraw.Draw(sheet)
    for i, (page, c, lvl, ang) in enumerate(crops):
        x, y = (i % cols) * (cw // 2 + 8), (i // cols) * (ch // 2 + 22)
        sheet.paste(c.resize((c.width // 2, c.height // 2)), (x, y + 20))
        d.text((x + 2, y + 4), f"p{page} {lvl} {ang:.0f}°", fill=(200, 0, 0))
    sheet.save(sheet_path)
