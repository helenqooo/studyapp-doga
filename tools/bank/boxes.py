"""Candidate question boxes for every page of the book, from the text layer.

    python3 boxes.py BOOK.json scan.json gauge-read.json boxes.json

A question runs from its number down to the next number in the same column (or the
footer), across its column; the box is then tightened to the words and figures inside,
and widened to any panel (ÖSYM köşesi) that straddles its number. Tests are found where
the numbering restarts at 1. Everything here is a first guess for the visual review.
"""
import json
import re
import sys

book_path, scan_path, gauge_path, out_path = sys.argv[1:5]
pages = json.load(open(scan_path))
BOOK = json.load(open(book_path))

# Book sections (from the table of contents): first page, name.
SECTIONS = [(x['start'], x['name']) for x in BOOK['sections']]


def section_of(page):
    name = None
    for start, n in SECTIONS:
        if page >= start:
            name = n
    return name


def series_of(p):
    """(series, number) from a page header, or (None, None). The test number is the big digit."""
    ws = [w for w in p['words'] if w['top'] < 115]
    texts = {w['t'] for w in ws}
    digits = sorted((w for w in ws if w['t'].isdigit() and w['size'] >= 24), key=lambda w: -w['size'])
    number = int(digits[0]['t']) if digits else None
    if number is None:
        return None, None
    if 'TEST' in texts:
        return 'Test', number
    if 'Sınavda' in texts:
        return 'ÖSYM Tadında', number
    if 'Orıjinal' in texts:
        return 'Orijinal Sorular', number
    return None, None


def footer_keys(p):
    """Answer key printed at the page foot ("8.A 9.C"), also when split ("8." "A") or "3,C"."""
    foot = sorted((w for w in p['words'] if w['top'] > p['H'] * 0.85 and w['size'] <= 7.6), key=lambda w: (round(w['top']), w['x0']))
    text = ' '.join(w['t'] for w in foot)
    keys = {}
    for m in re.finditer(r'\b(\d{1,2})\s*[.,]\s*([A-E])\b', text):
        keys[int(m.group(1))] = m.group(2)
    return keys


def anchors_of(p):
    keys = footer_keys(p)
    mid = p['W'] / 2
    cands = []
    for n, x, top, font, size in p['anchors']:
        if not 8.5 <= size <= 9.6:
            continue
        col = 0 if x < mid else 1
        typical = 60 if col == 0 else 340
        cands.append(dict(n=n, col=col, x=x, top=top, off=abs(x - typical)))
    if keys:
        # One anchor per answer-key number: the one nearest the column's usual number position.
        best = {}
        for a in cands:
            if a['n'] in keys and (a['n'] not in best or a['off'] < best[a['n']]['off']):
                best[a['n']] = a
        out = list(best.values())
    else:
        out = [a for a in cands if a['off'] < 25]
    for a in out:
        a['answer'] = keys.get(a['n'])
    return sorted(out, key=lambda a: (a['col'], a['top']))


def content_items(p, header_bottom, footer_top):
    W, H = p['W'], p['H']
    items = []
    for w in p['words']:
        if header_bottom <= w['top'] and w['bottom'] <= footer_top:
            items.append((w['x0'], w['top'], w['x1'], w['bottom'], 'w'))
    for im in p['images']:
        if tuple(im['src']) in FURNITURE:
            continue
        w, h = im['x1'] - im['x0'], im['bottom'] - im['top']
        if w > 0.6 * W or h > 0.6 * H:  # page backgrounds, column divider
            continue
        if im['x1'] < 30 or im['x0'] > W - 30:  # colored side tabs
            continue
        if w < 4 and h > 100:  # vertical rules
            continue
        if im['bottom'] < header_bottom or im['top'] > footer_top:
            continue
        items.append((im['x0'], im['top'], im['x1'], im['bottom'], 'i'))
    return items


# Images repeated on many pages are page furniture (watermark pieces, tabs, badges), not figures.
_freq = {}
for _p in pages:
    for _src in {tuple(im['src']) for im in _p['images']}:
        _freq[_src] = _freq.get(_src, 0) + 1
FURNITURE = {src for src, n in _freq.items() if n > 15}

out = []
for p in pages:
    W, H = p['W'], p['H']
    anchors = anchors_of(p)
    series, number = series_of(p)
    entry = dict(page=p['page'], W=W, H=H, section=section_of(p['page']), series=series, seriesNumber=number, questions=[])
    if not anchors:
        out.append(entry)
        continue
    header_bottom = min(a['top'] for a in anchors) - 40
    key_tops = [w['top'] for w in p['words'] if w['top'] > H * 0.85 and w['size'] <= 7.6 and re.match(r'^\d{1,2}[.,]', w['t'])]
    footer_top = (min(key_tops) - 3) if key_tops else H - 45
    items = content_items(p, max(60, header_bottom), footer_top)
    mid = W / 2
    for col in (0, 1):
        col_anchors = [a for a in anchors if a['col'] == col]
        cx0, cx1 = (28.0, mid - 1) if col == 0 else (mid + 1, W - 28.0)
        # Growth stops short of the thin column divider (it sits a few points either side of the
        # middle depending on the page).
        gx0, gx1 = (cx0, mid - 3.0) if col == 0 else (mid + 3.5, cx1)
        region_top = max(60, header_bottom)
        for i, a in enumerate(col_anchors):
            nxt = col_anchors[i + 1]['top'] if i + 1 < len(col_anchors) else footer_top
            prev_bottom = col_anchors[i - 1]['top'] + 10 if i else max(60, header_bottom)
            top, bottom = a['top'] - 4, nxt - 4
            # Panels that straddle the number (ÖSYM köşesi, framed questions) belong to it.
            for x0, y0, x1, y1, kind in items:
                if kind == 'i' and x0 >= cx0 - 2 and x1 <= cx1 + 2 and y0 < a['top'] < y1 and y0 > prev_bottom:
                    top = min(top, y0 - 2)
            inside = [it for it in items if cx0 - 2 <= (it[0] + it[2]) / 2 <= cx1 + 2 and top - 1 <= (it[1] + it[3]) / 2 <= bottom + 1]
            wide = [it for it in inside if it[0] < mid - 12 and it[2] > mid + 12]
            if inside:
                bx0 = max(cx0 - 2, min(it[0] for it in inside) - 5)
                bx1 = min(cx1 + 2 if not wide else W - 28, max(it[2] for it in inside) + 5)
                by1 = min(bottom, max(it[3] for it in inside) + 5)
            else:
                bx0, bx1, by1 = cx0, cx1, bottom
            # Where the box may grow to take in artwork drawn in the page's background image
            # (panel frames, figures): its column, from the end of the previous question's
            # print to just above the next number.
            region = [gx0, region_top, (W - 28.0) if wide else gx1, nxt - 2]
            entry['questions'].append(dict(n=a['n'], answer=a['answer'], col=col, bbox=[round(bx0, 1), round(top, 1), round(bx1, 1), round(by1, 1)], region=[round(v, 1) for v in region], wide=bool(wide)))
            region_top = by1 + 2
    entry['questions'].sort(key=lambda q: q['n'])
    out.append(entry)

# Tests: numbering restarts at 1. Series/number from any page header in the run.
tests = []
current = None
for e in out:
    if not e['questions']:
        continue
    first = e['questions'][0]['n']
    if first == 1 or current is None or e['section'] != current['section']:
        current = dict(section=e['section'], pages=[], series=None, number=None)
        tests.append(current)
    current['pages'].append(e['page'])
    if e['series'] and not current['series']:
        current['series'], current['number'] = e['series'], e['seriesNumber']
for i, t in enumerate(tests):
    t['id'] = i + 1
    for e in out:
        if e['page'] in t['pages']:
            e['test'] = t['id']

# Difficulty: the gauge on one of the test's pages. Needle angle → score 1 (Kolay) … 5 (Zor),
# piecewise linear through the band centres; the book also uses half steps between labels.
import os
LEVELS = ['Kolay', 'Kolay-Orta', 'Orta', 'Orta-Zor', 'Zor']
CENTRES = [164.0, 128.0, 89.0, 48.0, 12.0]
# Halfway between band centres, except Orta-Zor/Zor: the book's hardest tests park the needle in
# the white gap just before the purple band (31-35°), which reads as Zor.
BOUNDARIES = [146.0, 108.5, 68.5, 35.0]
gauges = json.load(open(gauge_path)) if os.path.exists(gauge_path) else {}


def score_of(angle):
    if angle >= CENTRES[0]:
        return 1.0
    if angle <= CENTRES[-1]:
        return 5.0
    for i in range(4):
        hi, lo = CENTRES[i], CENTRES[i + 1]
        if lo <= angle <= hi:
            return i + 1 + (hi - angle) / (hi - lo)
    return None


for t in tests:
    t['difficulty'] = None
    for pg in t['pages']:
        g = gauges.get(str(pg))
        if g and g.get('angle') is not None:
            sc = score_of(g['angle'])
            half = round(sc * 2) / 2
            # The label is the coloured band the needle points into (boundaries halfway between
            # the band centres); the score keeps the book's half steps for sorting.
            label = LEVELS[sum(1 for b in BOUNDARIES if g['angle'] < b)]
            t['difficulty'] = dict(score=half, label=label, angle=g['angle'], page=pg)
            break

# Past exam questions: "TYT - 2018", "MSÜ - 2020" printed inside the question.
PAST_RE = re.compile(r'\b(TYT|YGS|LYS|AYT|ÖSS|ÖYS|MSÜ|KPSS|ALES|DGS)\s*[-–]?\s*((?:19|20)\d{2})\b')
words_by_page = {p['page']: p['words'] for p in pages}
for e in out:
    for q in e['questions']:
        x0, y0, x1, y1 = q['bbox']
        inside = [w for w in words_by_page[e['page']] if x0 - 2 <= (w['x0'] + w['x1']) / 2 <= x1 + 2 and y0 - 2 <= (w['top'] + w['bottom']) / 2 <= y1 + 2]
        text = ' '.join(w['t'] for w in sorted(inside, key=lambda w: (round(w['top']), w['x0'])))
        m = PAST_RE.search(text)
        q['pastExam'] = f"{m.group(1)} {m.group(2)}" if m else None

json.dump(dict(pages=out, tests=tests), open(out_path, 'w'), ensure_ascii=False, indent=1)
total = sum(len(e['questions']) for e in out)
print(len(tests), 'tests,', total, 'questions')
unnamed = [t for t in tests if not t['series']]
print('with difficulty:', sum(1 for t in tests if t['difficulty']), ' past-exam questions:', sum(1 for e in out for q in e['questions'] if q['pastExam']))
from collections import Counter
print(Counter((t['difficulty'] or {}).get('label') for t in tests))
print('no gauge:', Counter(t['series'] for t in tests if not t['difficulty']))
print('tests without a series name:', len(unnamed), [(t['section'], t['pages']) for t in unnamed][:10])
