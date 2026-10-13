#!/usr/bin/env python3
"""Cut a YKS question-bank PDF into one image per question, filed by topic and test.

    python3 tools/bank/cut.py KITAP.pdf --exam TYT --subject "Temel Matematik" --out bank

Output (one folder per book, zipped with --zip):

    bank/<book-id>/
      manifest.json                     every question: topic id, test, number, page, image, bbox
      index.html                        contact sheet for checking the cuts by eye
      <topic-id>/test-01/q-01.png ...   the crops (unmapped headers go under unmapped/<slug>/)

How it reads the book: the header band of each page names the topic and "TEST n"; questions
start with a number ("12." or "12)") at the left edge of a column; a question's box runs from
its number down to the next number in the same column (or the column's last line), across the
column. Pages without a header continue the previous test. Answer-key pages ("CEVAP ANAHTARI")
are parsed into `answerKey` when present.

Needs: pdfplumber, Pillow, and poppler's `pdftoppm` on PATH.
"""
from __future__ import annotations

import argparse
import difflib
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

import pdfplumber
from PIL import Image, ImageChops

TEST_RE = re.compile(r"\bTEST\s*[-–:]?\s*(\d{1,3})\b", re.IGNORECASE)
ANCHOR_RE = re.compile(r"^(\d{1,3})[.)]$")
KEY_PAIR_RE = re.compile(r"(\d{1,3})\s*[-–.):]?\s*([A-E])\b")
KEY_PAGE_RE = re.compile(r"CEVAP\s*ANAHTAR", re.IGNORECASE)

TR_MAP = str.maketrans({"ş": "s", "ğ": "g", "ı": "i", "ö": "o", "ü": "u", "ç": "c", "Ş": "s", "Ğ": "g", "İ": "i", "I": "i", "Ö": "o", "Ü": "u", "Ç": "c"})


def fold(text: str) -> str:
    """Lowercase ASCII for matching Turkish text loosely."""
    text = text.translate(TR_MAP).lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def slug(text: str) -> str:
    return re.sub(r"\s+", "-", fold(text))[:60] or "bos"


# ---------------------------------------------------------------- topics.ts

@dataclass
class Topic:
    id: str
    exam: str
    subject: str
    topic: str
    subtopic: str | None

    @property
    def label(self) -> str:
        return f"{self.topic} › {self.subtopic}" if self.subtopic else self.topic


TOPIC_LINE_RE = re.compile(
    r"\{\s*id:\s*'([^']+)',\s*exam:\s*'([^']+)',\s*subject:\s*'([^']+)',\s*topic:\s*(?:'([^']*)'|\"([^\"]*)\")(?:,\s*subtopic:\s*(?:'([^']*)'|\"([^\"]*)\"))?"
)


def load_topics(path: Path) -> list[Topic]:
    out: list[Topic] = []
    for m in TOPIC_LINE_RE.finditer(path.read_text(encoding="utf-8")):
        tid, exam, subject, t1, t2, s1, s2 = m.groups()
        out.append(Topic(tid, exam, subject, t1 if t1 is not None else t2, s1 if s1 is not None else s2))
    return out


class TopicMatcher:
    """Maps a header's topic text to a topic id (fuzzy, Turkish-folded) with manual overrides."""

    def __init__(self, topics: list[Topic], exam: str, subject: str, overrides: dict[str, str]):
        self.topics = [t for t in topics if t.exam == exam and t.subject == subject]
        self.overrides = {fold(k): v for k, v in overrides.items()}
        self.cache: dict[str, tuple[str | None, float]] = {}
        # Each topic can be matched by its full label, the konu alone and the subtopic alone.
        self.keys: list[tuple[str, str]] = []
        for t in self.topics:
            names = {t.label, t.topic}
            if t.subtopic:
                names.add(t.subtopic)
            for n in names:
                self.keys.append((fold(n), t.id))

    def match(self, header: str) -> tuple[str | None, float]:
        f = fold(TEST_RE.sub("", header))
        if not f:
            return None, 0.0
        if f in self.cache:
            return self.cache[f]
        if f in self.overrides:
            self.cache[f] = (self.overrides[f], 1.0)
            return self.cache[f]
        best: tuple[str | None, float] = (None, 0.0)
        for key, tid in self.keys:
            score = difflib.SequenceMatcher(None, f, key).ratio()
            # A header that contains the whole key (e.g. "uslu sayilar test 3") counts as a hit.
            if key and key in f:
                score = max(score, 0.9)
            if score > best[1]:
                best = (tid, score)
        if best[1] < 0.62:
            best = (None, best[1])
        self.cache[f] = best
        return best


# ---------------------------------------------------------------- page analysis

@dataclass
class Word:
    text: str
    x0: float
    x1: float
    top: float
    bottom: float
    size: float


@dataclass
class Anchor:
    number: int
    column: int
    x0: float
    top: float
    bottom: float


@dataclass
class Question:
    test: int
    number: int
    page: int
    bbox: tuple[float, float, float, float]
    topic_text: str
    topic_id: str | None
    image: str = ""
    answer: str | None = None


@dataclass
class PageInfo:
    index: int
    width: float
    height: float
    words: list[Word]
    header_text: str
    test: int | None
    topic_text: str | None
    is_key_page: bool
    anchors: list[Anchor] = field(default_factory=list)
    header_bottom: float = 0.0


def lines_of(words: list[Word], tol: float = 3.0) -> list[list[Word]]:
    """Groups words into text lines by their vertical position."""
    rows: list[list[Word]] = []
    for w in sorted(words, key=lambda w: (round(w.top), w.x0)):
        if rows and abs(rows[-1][0].top - w.top) <= tol:
            rows[-1].append(w)
        else:
            rows.append([w])
    for r in rows:
        r.sort(key=lambda w: w.x0)
    return rows


def read_page(page, index: int, header_share: float, footer_share: float) -> PageInfo:
    raw = page.extract_words(keep_blank_chars=False, use_text_flow=False, extra_attrs=["size"])
    words = [Word(w["text"], float(w["x0"]), float(w["x1"]), float(w["top"]), float(w["bottom"]), float(w.get("size", 0))) for w in raw]
    width, height = float(page.width), float(page.height)
    all_text = " ".join(w.text for w in words)
    info = PageInfo(index, width, height, words, "", None, None, bool(KEY_PAGE_RE.search(all_text[:4000])))

    # Question numbers first; the header is whatever sits above the first one (at most
    # `header_share` of the page when there are none).
    anchors = find_anchors(info, footer_share)
    header_bottom = min((a.top for a in anchors), default=height * header_share) - 1
    header_bottom = min(header_bottom, height * 0.25)
    info.header_bottom = header_bottom
    info.anchors = [a for a in anchors if a.top >= header_bottom]
    header_band = [w for w in words if w.bottom <= header_bottom + 1]
    header_lines = lines_of(header_band)
    info.header_text = " | ".join(" ".join(w.text for w in line) for line in header_lines)

    for line in header_lines:
        m = TEST_RE.search(" ".join(w.text for w in line))
        if m:
            info.test = int(m.group(1))
            break

    # The topic is the biggest header text (then the longest) once "TEST n" is removed.
    best: tuple[float, int] = (0.0, 0)
    for line in header_lines:
        cleaned = TEST_RE.sub("", " ".join(w.text for w in line)).strip(" -–|·•:")
        letters = sum(ch.isalpha() for ch in cleaned)
        size = max(w.size for w in line)
        if letters >= 3 and (round(size), letters) > best:
            best, info.topic_text = (round(size), letters), cleaned
    return info


def find_anchors(info: PageInfo, footer_share: float) -> list[Anchor]:
    """Question numbers at the left edge of a column, in reading order (left column, then right)."""
    body = [w for w in info.words if w.top <= info.height * (1 - footer_share)]
    mid = info.width / 2
    candidates: list[Anchor] = []
    for column in (0, 1):
        col_words = [w for w in body if (w.x0 < mid) == (column == 0)]
        left_edge = 0.0 if column == 0 else mid
        for line in lines_of(col_words):
            first = line[0]
            m = ANCHOR_RE.match(first.text) or re.match(r"^(\d{1,3})[.)](\S+)$", first.text)
            if not m:
                continue
            # A real question number sits near the column's left edge; numbers inside text don't.
            if first.x0 - left_edge > info.width * 0.14:
                continue
            candidates.append(Anchor(int(m.group(1)), column, first.x0, first.top, first.bottom))
    candidates.sort(key=lambda a: (a.column, a.top))
    # Keep the increasing run: numbers restart at 1 on a new test, otherwise +1 (a gap of one is
    # allowed for a missed anchor, which beats dropping the rest of the page).
    kept: list[Anchor] = []
    expected: int | None = None
    for a in candidates:
        if expected is None or a.number == expected or a.number == expected + 1 or (a.number == 1 and kept):
            kept.append(a)
            expected = a.number + 1
    return kept


def column_bounds(info: PageInfo, column: int, footer_share: float, margin: float) -> tuple[float, float, float]:
    """(x0, x1, bottom) of a column's printed area."""
    mid = info.width / 2
    body = [w for w in info.words if info.header_bottom <= w.top <= info.height * (1 - footer_share)]
    col = [w for w in body if (w.x0 < mid) == (column == 0)]
    if column == 0:
        x0, x1 = max(0.0, min((w.x0 for w in col), default=margin) - margin), mid - margin / 2
    else:
        x0, x1 = mid + margin / 2, min(info.width, max((w.x1 for w in col), default=info.width - margin) + margin)
    bottom = max((w.bottom for w in col), default=info.height * (1 - footer_share))
    return x0, x1, min(info.height * (1 - footer_share) + margin, bottom + margin)


def cut_page(info: PageInfo, current_test: int | None, topic_text: str, topic_id: str | None, footer_share: float, margin: float) -> list[Question]:
    out: list[Question] = []
    anchors = info.anchors
    for i, a in enumerate(anchors):
        nxt = anchors[i + 1] if i + 1 < len(anchors) and anchors[i + 1].column == a.column else None
        x0, x1, col_bottom = column_bounds(info, a.column, footer_share, margin)
        top = max(0.0, a.top - margin)
        bottom = (nxt.top - margin / 2) if nxt else col_bottom
        if bottom - top < 20:
            continue
        out.append(Question(current_test or 0, a.number, info.index, (x0, top, x1, bottom), topic_text, topic_id))
    return out


def parse_answer_key(info: PageInfo) -> dict[tuple[str, int], dict[int, str]]:
    """{(folded topic, test): {number: letter}} from a "CEVAP ANAHTARI" page. The test (and the topic,
    when the key names it) come from the nearest "TEST n" line above the answers."""
    out: dict[tuple[str, int], dict[int, str]] = {}
    current: tuple[str, int] = ("", 0)
    for line in lines_of(info.words):
        text = " ".join(w.text for w in line)
        m = TEST_RE.search(text)
        if m:
            current = (fold(TEST_RE.sub("", text)), int(m.group(1)))
            text = text[m.end():]
        for num, letter in KEY_PAIR_RE.findall(text):
            out.setdefault(current, {})[int(num)] = letter
    return out


def lookup_answer(keys: dict[tuple[str, int], dict[int, str]], topic_text: str, test: int, number: int) -> str | None:
    topic = fold(topic_text)
    exact = keys.get((topic, test))
    if exact and number in exact:
        return exact[number]
    # Keys that name no topic, or name it a little differently.
    for (kt, ktest), answers in keys.items():
        if ktest == test and number in answers and (not kt or difflib.SequenceMatcher(None, kt, topic).ratio() > 0.7):
            return answers[number]
    return None


# ---------------------------------------------------------------- rendering

def render_page(pdf: Path, page_number: int, dpi: int, cache: Path) -> Image.Image:
    """Renders one page with pdftoppm (cached on disk)."""
    png = cache / f"p{page_number}.png"
    if not png.exists():
        prefix = cache / f"p{page_number}"
        subprocess.run(["pdftoppm", "-r", str(dpi), "-f", str(page_number), "-l", str(page_number), "-png", "-singlefile", str(pdf), str(prefix)], check=True)
    return Image.open(png)


def trim(img: Image.Image, pad: int) -> Image.Image:
    """Cuts the white margins around the printed question, keeping a small pad."""
    grey = img.convert("L")
    bg = Image.new("L", grey.size, 255)
    diff = ImageChops.difference(grey, bg).point(lambda p: 255 if p > 40 else 0)
    box = diff.getbbox()
    if not box:
        return img
    x0, y0, x1, y1 = box
    return img.crop((max(0, x0 - pad), max(0, y0 - pad), min(img.width, x1 + pad), min(img.height, y1 + pad)))


# ---------------------------------------------------------------- main

def parse_pages(spec: str | None, count: int) -> set[int]:
    if not spec:
        return set(range(1, count + 1))
    pages: set[int] = set()
    for part in spec.split(","):
        if "-" in part:
            a, b = part.split("-", 1)
            pages.update(range(int(a), int(b) + 1))
        else:
            pages.add(int(part))
    return {p for p in pages if 1 <= p <= count}


def contact_sheet(book_dir: Path, book: dict, questions: list[Question]) -> None:
    groups: dict[tuple[str, int], list[Question]] = {}
    for q in questions:
        groups.setdefault((q.topic_id or f"unmapped/{slug(q.topic_text)}", q.test), []).append(q)
    parts = [
        "<!doctype html><meta charset='utf-8'><title>%s</title>" % html.escape(book["title"]),
        "<style>body{font-family:system-ui;margin:20px;background:#f4f2ec;color:#1a1917}h2{margin:28px 0 8px}"
        ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}"
        "figure{margin:0;background:#fff;border-radius:12px;padding:8px;box-shadow:0 1px 3px rgba(0,0,0,.08)}"
        "img{width:100%;height:auto;display:block}figcaption{font-size:12px;color:#6b6962;margin-top:4px}</style>",
        f"<h1>{html.escape(book['title'])}</h1><p>{len(questions)} soru · {len(groups)} test</p>",
    ]
    for (tid, test), qs in sorted(groups.items(), key=lambda kv: (kv[0][0], kv[0][1])):
        parts.append(f"<h2>{html.escape(tid)} · Test {test} <small>({html.escape(qs[0].topic_text)})</small></h2><div class='grid'>")
        for q in qs:
            cap = f"Soru {q.number} · s.{q.page}" + (f" · Cevap {q.answer}" if q.answer else "")
            parts.append(f"<figure><img loading='lazy' src='{html.escape(q.image)}'><figcaption>{cap}</figcaption></figure>")
        parts.append("</div>")
    (book_dir / "index.html").write_text("\n".join(parts), encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--exam", required=True, choices=["TYT", "AYT"])
    ap.add_argument("--subject", required=True, help="Türkçe | Sosyal | Temel Matematik | Fen | Matematik | Fizik | Kimya | Biyoloji")
    ap.add_argument("--out", type=Path, default=Path("bank"))
    ap.add_argument("--book-id", help="folder name; default from the file name")
    ap.add_argument("--title", help="shown in the manifest and contact sheet")
    ap.add_argument("--topics", type=Path, default=Path(__file__).resolve().parents[2] / "app/src/data/topics.ts")
    ap.add_argument("--map", action="append", default=[], metavar="HEADER=topic-id", help="force a header's topic (repeatable)")
    ap.add_argument("--pages", help="e.g. 5-40,43")
    ap.add_argument("--dpi", type=int, default=200)
    ap.add_argument("--header", type=float, default=0.11, help="header band (share of the page height) on pages without question numbers")
    ap.add_argument("--footer", type=float, default=0.05, help="share of the page height that is the footer band")
    ap.add_argument("--margin", type=float, default=6.0, help="padding around a question, in PDF points")
    ap.add_argument("--no-trim", action="store_true", help="keep the full column box instead of trimming white margins")
    ap.add_argument("--zip", action="store_true", help="also write <out>/<book-id>.zip")
    ap.add_argument("--dry-run", action="store_true", help="list what would be cut, write nothing")
    args = ap.parse_args()

    if not args.pdf.exists():
        print(f"PDF yok: {args.pdf}", file=sys.stderr)
        return 2
    if shutil.which("pdftoppm") is None and not args.dry_run:
        print("pdftoppm bulunamadı (poppler-utils kur).", file=sys.stderr)
        return 2

    overrides = {}
    for item in args.map:
        k, _, v = item.partition("=")
        overrides[k.strip()] = v.strip()
    matcher = TopicMatcher(load_topics(args.topics), args.exam, args.subject, overrides)
    if not matcher.topics:
        print(f"topics.ts içinde {args.exam} {args.subject} için konu yok.", file=sys.stderr)
        return 2

    book_id = args.book_id or slug(args.pdf.stem)
    title = args.title or args.pdf.stem
    book_dir = args.out / book_id
    questions: list[Question] = []
    keys: dict[tuple[str, int], dict[int, str]] = {}
    unmatched: dict[str, int] = {}

    with pdfplumber.open(str(args.pdf)) as pdf:
        wanted = parse_pages(args.pages, len(pdf.pages))
        current_test: int | None = None
        current_topic_text = ""
        current_topic_id: str | None = None
        for i, page in enumerate(pdf.pages, start=1):
            if i not in wanted:
                continue
            info = read_page(page, i, args.header, args.footer)
            if info.is_key_page:
                for key, answers in parse_answer_key(info).items():
                    keys.setdefault(key, {}).update(answers)
                continue
            if info.test is not None:
                current_test = info.test
            if info.topic_text:
                tid, score = matcher.match(info.topic_text)
                if tid is None:
                    unmatched[info.topic_text] = unmatched.get(info.topic_text, 0) + 1
                current_topic_text, current_topic_id = info.topic_text, tid
            page_questions = cut_page(info, current_test, current_topic_text, current_topic_id, args.footer, args.margin)
            questions.extend(page_questions)
            if args.dry_run:
                print(f"s.{i:>3}  test {current_test or '?':>3}  {len(page_questions):>2} soru  [{current_topic_id or 'EŞLEŞMEDİ'}] {current_topic_text[:50]}")

    for q in questions:
        q.answer = lookup_answer(keys, q.topic_text, q.test, q.number)

    if args.dry_run:
        print(f"\n{len(questions)} soru; cevap anahtarı: {sum(len(v) for v in keys.values())} cevap")
        for text, n in unmatched.items():
            print(f"EŞLEŞMEYEN başlık ({n} sayfa): {text!r}  → --map \"{text}=<topic-id>\"")
        return 0

    book_dir.mkdir(parents=True, exist_ok=True)
    scale = args.dpi / 72.0
    with tempfile.TemporaryDirectory() as tmp:
        cache = Path(tmp)
        for q in questions:
            folder = book_dir / (q.topic_id or f"unmapped/{slug(q.topic_text)}") / f"test-{q.test:02d}"
            folder.mkdir(parents=True, exist_ok=True)
            img = render_page(args.pdf, q.page, args.dpi, cache)
            x0, y0, x1, y1 = q.bbox
            crop = img.crop((int(x0 * scale), int(y0 * scale), int(x1 * scale), int(y1 * scale)))
            if not args.no_trim:
                crop = trim(crop, int(args.margin * scale))
            rel = Path(q.topic_id or f"unmapped/{slug(q.topic_text)}") / f"test-{q.test:02d}" / f"q-{q.number:02d}.png"
            crop.save(book_dir / rel, optimize=True)
            q.image = rel.as_posix()

    book = {"id": book_id, "title": title, "exam": args.exam, "subject": args.subject, "source": args.pdf.name, "dpi": args.dpi}
    manifest = {
        "format": "lumi-bank/1",
        "book": book,
        "questions": [
            {
                "id": f"{book_id}-t{q.test:02d}-q{q.number:02d}",
                "exam": args.exam,
                "subject": args.subject,
                "topicId": q.topic_id,
                "topicHeader": q.topic_text,
                "test": q.test,
                "number": q.number,
                "page": q.page,
                "image": q.image,
                "bbox": [round(v, 1) for v in q.bbox],
                "answerKey": q.answer,
            }
            for q in questions
        ],
        "unmatchedHeaders": unmatched,
    }
    (book_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    contact_sheet(book_dir, book, questions)

    if args.zip:
        zip_path = args.out / f"{book_id}.zip"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for path in sorted(book_dir.rglob("*")):
                if path.is_file():
                    zf.write(path, path.relative_to(args.out).as_posix())
        print(f"zip: {zip_path}")

    print(f"{len(questions)} soru → {book_dir}  (cevap anahtarı: {sum(1 for q in questions if q.answer)})")
    for text, n in unmatched.items():
        print(f"EŞLEŞMEYEN başlık ({n} sayfa): {text!r}  → --map \"{text}=<topic-id>\"")
    return 0


if __name__ == "__main__":
    sys.exit(main())
