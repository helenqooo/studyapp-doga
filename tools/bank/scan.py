"""Per-page structure of the book from its text layer: header words, anchors, footer key."""
import sys, json, re, collections
import pdfplumber

pdf_path, out_path = sys.argv[1], sys.argv[2]
KEY_RE = re.compile(r'^(\d{1,2})\.([A-E])$')
NUM_RE = re.compile(r'^(\d{1,2})\.$')
pages = []
with pdfplumber.open(pdf_path) as pdf:
    for i, pg in enumerate(pdf.pages, 1):
        cx0, ctop, cx1, cbot = pg.cropbox
        W, H = cx1 - cx0, cbot - ctop
        view = pg.within_bbox((cx0, ctop, cx1, cbot))
        words = view.extract_words(extra_attrs=['size', 'fontname'])
        ws = [dict(t=w['text'], x0=round(w['x0'] - cx0, 1), x1=round(w['x1'] - cx0, 1), top=round(w['top'] - ctop, 1), bottom=round(w['bottom'] - ctop, 1), size=round(w['size'], 1), font=w['fontname'].split('+')[-1]) for w in words]
        ws = [w for w in ws if w['top'] > 6]  # drop the copyright watermark line
        keys = [(int(m.group(1)), m.group(2), w['x0'], w['top']) for w in ws for m in [KEY_RE.match(w['t'])] if m and w['top'] > H * 0.85]
        anchors = [(int(m.group(1)), w['x0'], w['top'], w['font'], w['size']) for w in ws for m in [NUM_RE.match(w['t'])] if m and w['top'] < H * 0.9]
        header = ' '.join(w['t'] for w in sorted([w for w in ws if w['top'] < 115], key=lambda w: (round(w['top'] / 6), w['x0'])) if w['size'] >= 7)
        imgs = [dict(x0=round(im['x0'] - cx0, 1), x1=round(im['x1'] - cx0, 1), top=round(im['top'] - ctop, 1), bottom=round(im['bottom'] - ctop, 1), src=list(im['srcsize'])) for im in view.images]
        rects = [dict(x0=round(r['x0'] - cx0, 1), x1=round(r['x1'] - cx0, 1), top=round(r['top'] - ctop, 1), bottom=round(r['bottom'] - ctop, 1)) for r in view.rects]
        pages.append(dict(page=i, W=round(W, 1), H=round(H, 1), header=header, anchors=anchors, keys=keys, words=ws, images=imgs, rects=rects))
json.dump(pages, open(out_path, 'w'), ensure_ascii=False)
print(len(pages), 'pages')
