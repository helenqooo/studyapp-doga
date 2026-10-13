"""Overlays (page + numbered boxes + a 50pt grid) and crops from boxes.json.

    python3 render.py overlay boxes.json r200 overlays [pages...]
    python3 render.py crops   boxes.json r200 crops    [pages...]
    python3 render.py sheets  boxes.json crops sheets   (one contact sheet per test)
"""
import json
import os
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFont

DPI = 200
SCALE = DPI / 72.0
COLORS = [(214, 40, 40), (30, 110, 220), (20, 150, 70), (200, 120, 0), (140, 60, 200), (0, 150, 160), (220, 0, 140), (90, 90, 90)]


def font(size):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf']:
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def load(path):
    d = json.load(open(path))
    return d, {e['page']: e for e in d['pages']}


def overlay(entry, src, dst, width=1100):
    img = Image.open(src).convert('RGB')
    k = width / img.width
    img = img.resize((width, int(img.height * k)))
    d = ImageDraw.Draw(img, 'RGBA')
    pt = SCALE * k  # pixels per PDF point in the overlay
    small, big = font(13), font(22)
    # Grid every 50pt, labelled on the left and top edges.
    for y in range(0, int(entry['H']) + 1, 50):
        d.line([(0, y * pt), (img.width, y * pt)], fill=(0, 0, 0, 28), width=1)
        d.text((2, y * pt + 1), str(y), fill=(0, 0, 0, 150), font=small)
    for x in range(0, int(entry['W']) + 1, 50):
        d.line([(x * pt, 0), (x * pt, img.height)], fill=(0, 0, 0, 28), width=1)
        d.text((x * pt + 2, 2), str(x), fill=(0, 0, 0, 150), font=small)
    for i, q in enumerate(entry['questions']):
        c = COLORS[q['n'] % len(COLORS)]
        x0, y0, x1, y1 = [v * pt for v in q['bbox']]
        d.rectangle([x0, y0, x1, y1], outline=c + (255,), width=3)
        d.rectangle([x0, y0, x0 + 34, y0 + 26], fill=c + (230,))
        d.text((x0 + 4, y0 + 1), str(q['n']), fill=(255, 255, 255), font=big)
    img.save(dst, optimize=True)


def ink_mask(img):
    """1 where a pixel is printed matter: dark, or clearly coloured; the faint grey watermark and
    the white page are 0."""
    rgb = img.convert('RGB')
    r, g, b = rgb.split()
    lo = ImageChops.darker(ImageChops.darker(r, g), b)
    hi = ImageChops.lighter(ImageChops.lighter(r, g), b)
    dark = lo.point(lambda v: 255 if v < 185 else 0)
    sat = ImageChops.subtract(hi, lo).point(lambda v: 255 if v > 70 else 0)
    return ImageChops.lighter(dark, sat)


def trim_box(img, pad):
    """The crop without empty rows and columns at its edges (keeps `pad` pixels of air)."""
    import numpy as np

    mask = np.asarray(ink_mask(img)) > 0
    h, w = mask.shape
    # Ignore specks: a row or column needs a few ink pixels to count.
    xs = np.nonzero(mask.sum(axis=0) >= 2)[0].tolist()
    row_mass = mask.sum(axis=1)
    ys = np.nonzero(row_mass >= 2)[0].tolist()
    if not xs or not ys:
        return (0, 0, w, h)
    # A stray speck far below the question (a dot of the next element) is not content: drop
    # trailing runs of rows that are tiny and separated from the rest by a wide gap.
    runs = []
    for y in ys:
        if runs and y - runs[-1][1] <= 3:
            runs[-1][1] = y
        else:
            runs.append([y, y])
    while len(runs) > 1:
        a, b = runs[-1]
        gap = a - runs[-2][1]
        if gap > 60 and int(row_mass[a:b + 1].sum()) < 400:
            runs.pop()
        else:
            break
    ys = [y for y in ys if y <= runs[-1][1]]
    sub = mask[: runs[-1][1] + 1]
    xs = np.nonzero(sub.sum(axis=0) >= 2)[0].tolist() or xs
    return (max(0, xs[0] - pad), max(0, ys[0] - pad), min(w, xs[-1] + 1 + pad), min(h, ys[-1] + 1 + pad))


_mask_cache = {}


def page_ink(src_img):
    import numpy as np

    key = id(src_img)
    if key not in _mask_cache:
        _mask_cache.clear()
        _mask_cache[key] = np.asarray(ink_mask(src_img)) > 0
    return _mask_cache[key]


def grow(src_img, box, region, step=4, strip=4, need=3):
    """Widens the box while print touches its edges (frames and figures that live in the page's
    background image, which the text layer can't see), never beyond `region`."""
    mask = page_ink(src_img)
    x0, y0, x1, y1 = box
    rx0, ry0, rx1, ry1 = region
    for _ in range(400):
        moved = False
        if y0 > ry0 and mask[max(ry0, y0 - strip):y0, x0:x1].sum() >= need:
            y0 = max(ry0, y0 - step); moved = True
        if y1 < ry1 and mask[y1:min(ry1, y1 + strip), x0:x1].sum() >= need:
            y1 = min(ry1, y1 + step); moved = True
        if x0 > rx0 and mask[y0:y1, max(rx0, x0 - strip):x0].sum() >= need:
            x0 = max(rx0, x0 - step); moved = True
        if x1 < rx1 and mask[y0:y1, x1:min(rx1, x1 + strip)].sum() >= need:
            x1 = min(rx1, x1 + step); moved = True
        if not moved:
            break
    return (x0, y0, x1, y1)


def crop(entry, q, src_img, dst):
    x0, y0, x1, y1 = q['bbox']
    box = (int(x0 * SCALE), int(y0 * SCALE), int(x1 * SCALE), int(y1 * SCALE))
    if q.get('region') and not q.get('fixed'):
        rx0, ry0, rx1, ry1 = q['region']
        region = (int(rx0 * SCALE), int(ry0 * SCALE), int(rx1 * SCALE), int(ry1 * SCALE))
        # Keep the start box inside the region too (it may begin on the column divider).
        box = (max(box[0], region[0]), box[1], min(box[2], region[2]), box[3])
        box = grow(src_img, box, region)
    piece = src_img.crop(box)
    if not q.get('noTrim'):
        piece = piece.crop(trim_box(piece, int(6 * SCALE)))
    if q.get('prefix'):
        # A shared intro ("1. ve 2. soruyu yukarıdaki bilgiye göre çözünüz") goes on top.
        px0, py0, px1, py1 = q['prefix']['bbox']
        intro = src_img.crop((int(px0 * SCALE), int(py0 * SCALE), int(px1 * SCALE), int(py1 * SCALE)))
        intro = intro.crop(trim_box(intro, int(6 * SCALE)))
        gap = int(10 * SCALE)
        both = Image.new('RGB', (max(intro.width, piece.width), intro.height + gap + piece.height), (255, 255, 255))
        both.paste(intro, (0, 0))
        both.paste(piece, (0, intro.height + gap))
        piece = both
    piece.save(dst, optimize=True)


def main():
    mode, boxes_path, src_dir, out_dir = sys.argv[1:5]
    only = {int(a) for a in sys.argv[5:]}
    d, by_page = load(boxes_path)
    if mode != 'one':
        os.makedirs(out_dir, exist_ok=True)
    if mode == 'overlay':
        for e in d['pages']:
            if (only and e['page'] not in only) or not e['questions']:
                continue
            overlay(e, f"{src_dir}/p-{e['page']:03d}.png", f"{out_dir}/o-{e['page']:03d}.png")
    elif mode == 'crops':
        for e in d['pages']:
            if (only and e['page'] not in only) or not e['questions']:
                continue
            img = Image.open(f"{src_dir}/p-{e['page']:03d}.png").convert('RGB')
            for q in e['questions']:
                crop(e, q, img, f"{out_dir}/t{e['test']:03d}-q{q['n']:02d}.png")
    elif mode == 'one':
        # render.py one boxes.json r200 OUT.png PAGE x0 y0 x1 y1  — try a corrected box.
        page, x0, y0, x1, y1 = int(sys.argv[5]), *map(float, sys.argv[6:10])
        img = Image.open(f"{src_dir}/p-{page:03d}.png").convert('RGB')
        crop(by_page[page], dict(bbox=[x0, y0, x1, y1]), img, out_dir)
        return
    elif mode == 'sheets':
        for t in d['tests']:
            if only and t['id'] not in only:
                continue
            files = []
            for p in t['pages']:
                for q in by_page[p]['questions']:
                    files.append((q['n'], f"{src_dir}/t{t['id']:03d}-q{q['n']:02d}.png"))
            files.sort()
            ims = [(n, Image.open(f).convert('RGB')) for n, f in files if os.path.exists(f)]
            if not ims:
                continue
            tw = 560
            ims = [(n, im.resize((tw, max(1, int(im.height * tw / im.width))))) for n, im in ims]
            cols = 3
            rows = [ims[i:i + cols] for i in range(0, len(ims), cols)]
            H = sum(max(im.height for _, im in r) + 34 for r in rows) + 50
            sheet = Image.new('RGB', (cols * (tw + 16) + 16, H), (238, 236, 230))
            dr = ImageDraw.Draw(sheet)
            diff = (t.get('difficulty') or {}).get('label') or '—'
            dr.text((16, 12), f"Test #{t['id']} · {t['section']} · {t['series']} {t['number']} · {diff} · pages {t['pages']}", fill=(0, 0, 0), font=font(18))
            y = 50
            for r in rows:
                for j, (n, im) in enumerate(r):
                    x = 16 + j * (tw + 16)
                    dr.text((x, y), f"Soru {n}", fill=(180, 30, 30), font=font(16))
                    sheet.paste(im, (x, y + 24))
                    dr.rectangle([x - 1, y + 23, x + im.width, y + 24 + im.height], outline=(120, 120, 120))
                y += max(im.height for _, im in r) + 34
            sheet.save(f"{out_dir}/test-{t['id']:03d}.png", optimize=True)


if __name__ == '__main__':
    main()
