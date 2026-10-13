"""Files the cut questions as Ders / Konu / Test and zips them with a manifest and a viewer.

    python3 package.py BOOK.json boxes.json crops topics.ts OUT_DIR [units.json] [--split "01-09;10-14,16-18;15;19-27"]

--split makes several zips (each under the upload limits), grouping the book's subject's topic
folders by their numbers; every part has its own manifest, viewer and answer keys.

BOOK.json names the book and maps each section to a topic id. units.json (optional) holds the
per-question classification: {"questionTopics": {qid: topicId}, "subtopics": {qid: unitId}}.
"""
import html
import json
import os
import re
import shutil
import sys
import zipfile

from PIL import Image

argv = list(sys.argv[1:])
split_spec = None
if '--split' in argv:
    i = argv.index('--split')
    split_spec = argv[i + 1]
    del argv[i:i + 2]
book_path, boxes_path, crops_dir, topics_path, out_dir = argv[:5]
units_path = argv[5] if len(argv) > 5 else None

_book = json.load(open(book_path))
BOOK = {k: v for k, v in _book.items() if k != 'sections'}
ROOT = 'Lumi Soru Bankası'

# ---------------------------------------------------------------- topics.ts

LINE = re.compile(r"\{\s*id:\s*'([^']+)',\s*exam:\s*'([^']+)',\s*subject:\s*'([^']+)',\s*topic:\s*(?:'([^']*)'|\"([^\"]*)\")(?:,\s*subtopic:\s*(?:'([^']*)'|\"([^\"]*)\"))?")
topics = []
for m in LINE.finditer(open(topics_path, encoding='utf-8').read()):
    tid, exam, subject, t1, t2, s1, s2 = m.groups()
    topics.append(dict(id=tid, exam=exam, subject=subject, topic=t1 if t1 is not None else t2, subtopic=s1 if s1 is not None else s2))
by_id = {t['id']: t for t in topics}
UNIT = re.compile(r"\{ id: (?:'([^']+)'|\"([^\"]+)\"), name: (?:'([^']*)'|\"([^\"]*)\") \}")
units = {}
_src = open(topics_path, encoding='utf-8').read()
if 'export const UNITS' in _src:
    block = _src[_src.index('export const UNITS'):]
    block = block[: block.index('\n};')]
    current = None
    for line in block.splitlines():
        m = re.match(r"\s*'([^']+)': \[", line)
        if m:
            current = m.group(1)
            units[current] = []
            continue
        u = UNIT.search(line)
        if u and current:
            units[current].append(dict(id=u.group(1) or u.group(2), name=u.group(3) if u.group(3) is not None else u.group(4)))
SUBJECT_ORDER = {'TYT': ['Türkçe', 'Sosyal', 'Temel Matematik', 'Fen'], 'AYT': ['Matematik', 'Fizik', 'Kimya', 'Biyoloji']}


def safe(name):
    """A folder or file name that works on iOS, Windows and macOS."""
    name = re.sub(r'[\\/:*?"<>|]', '-', name).strip().rstrip('.')
    return re.sub(r'\s+', ' ', name)


def topic_dirs():
    """Every topic's folder, numbered in curriculum order inside its subject. A topic with a
    subtopic (Problemler › Yaş Problemleri, Tarih › Millî Mücadele) sits in its group's folder."""
    dirs = {}
    for exam, subjects in SUBJECT_ORDER.items():
        for subject in subjects:
            unit = 0
            groups = {}
            for t in (t for t in topics if t['exam'] == exam and t['subject'] == subject):
                if t['subtopic']:
                    if t['topic'] not in groups:
                        unit += 1
                        groups[t['topic']] = [f"{unit:02d} {safe(t['topic'])}", 0]
                    g = groups[t['topic']]
                    g[1] += 1
                    dirs[t['id']] = f"{exam}/{subject}/{g[0]}/{g[1]:02d} {safe(t['subtopic'])}"
                else:
                    unit += 1
                    dirs[t['id']] = f"{exam}/{subject}/{unit:02d} {safe(t['topic'])}"
    return dirs


# ---------------------------------------------------------------- questions

boxes = json.load(open(boxes_path))
sections = {x['name']: x['topicId'] for x in _book['sections']}
_units = json.load(open(units_path)) if units_path else {}
subtopic_of = _units.get('subtopics', {})
question_topic = _units.get('questionTopics', {})
unit_unsure = set(_units.get('unsure', []))
by_page = {e['page']: e for e in boxes['pages']}
dirs = topic_dirs()

missing = sorted({t['section'] for t in boxes['tests'] if t['section'] not in sections})
if missing:
    sys.exit(f'no topic for sections: {missing}')
bad = sorted({v for v in sections.values() if v not in by_id})
if bad:
    sys.exit(f'unknown topic ids: {bad}')

stage = os.path.join(out_dir, ROOT)
if os.path.exists(stage):
    shutil.rmtree(stage)
for path in dirs.values():
    os.makedirs(os.path.join(stage, path), exist_ok=True)

SERIES_DIR = {'Test': 'Test', 'ÖSYM Tadında': 'ÖSYM Tadında', 'Orijinal Sorular': 'Orijinal Sorular'}
LEVELS = ['Kolay', 'Kolay-Orta', 'Orta', 'Orta-Zor', 'Zor']
questions = []
tests_out = []
for t in boxes['tests']:
    topic_id = sections[t['section']]
    topic = by_id[topic_id]
    topic_name = topic['subtopic'] or topic['topic']
    diff = t.get('difficulty') or {}
    parts = [BOOK['short']]
    # Name the book section when it isn't the topic itself (two sections can share a topic).
    if re.sub(r'\W', '', t['section'].lower()) != re.sub(r'\W', '', topic_name.lower()):
        parts.append(t['section'])
    parts.append(f"{SERIES_DIR.get(t['series'], t['series'])} {t['number']:02d}")
    test_name = safe(' · '.join(parts))
    # Konu / Zorluk / Test: the level folder sorts from easy to hard.
    if diff.get('label'):
        level_dir = f"{LEVELS.index(diff['label']) + 1} {diff['label']}"
    elif t['series'] == 'Orijinal Sorular':
        level_dir = 'Orijinal Sorular (ÖSYM-MEB)'
    else:
        level_dir = 'Zorluk belirtilmemiş'
    test_dir = os.path.join(dirs[topic_id], level_dir, test_name)
    os.makedirs(os.path.join(stage, test_dir), exist_ok=True)
    key_lines = []
    test_qs = []
    for p in t['pages']:
        for q in by_page[p]['questions']:
            qid = f"{BOOK['id']}-t{t['id']:03d}-q{q['n']:02d}"
            name = f"Soru {q['n']:02d}"
            if q.get('pastExam'):
                name += f" (Çıkmış {q['pastExam']})"
            if q.get('marked'):
                name += ' (işaretli)'
            rel = os.path.join(test_dir, safe(name) + '.webp')
            src = os.path.join(crops_dir, f"t{t['id']:03d}-q{q['n']:02d}.png")
            im = Image.open(src).convert('RGB')
            im.save(os.path.join(stage, rel), 'WEBP', quality=90, method=6)
            if q.get('pastExam'):
                # Every past exam question of a topic also sits in its "Çıkmış Sorular" folder.
                past_dir = os.path.join(stage, dirs[topic_id], 'Çıkmış Sorular')
                os.makedirs(past_dir, exist_ok=True)
                shutil.copyfile(os.path.join(stage, rel), os.path.join(past_dir, safe(f"{q['pastExam']} · {test_name} · Soru {q['n']:02d}") + '.webp'))
            key_lines.append(f"{q['n']}-{q['answer']}")
            item = dict(
                id=qid,
                exam=BOOK['exam'],
                subject=BOOK['subject'],
                topicId=question_topic.get(qid, topic_id),
                unitId=subtopic_of.get(qid),
                # The unit was picked from the flattened PDF text; false when that was a guess.
                unitSure=qid in subtopic_of and qid not in unit_unsure,
                bookSection=t['section'],
                series=t['series'],
                test=t['number'],
                testKey=f"t{t['id']:03d}",
                number=q['n'],
                answer=q['answer'],
                difficulty=diff.get('label'),
                difficultyScore=diff.get('score'),
                pastExam=q.get('pastExam'),
                marked=bool(q.get('marked')),
                page=p,
                bbox=q['bbox'],
                image=rel.replace(os.sep, '/'),
                width=im.width,
                height=im.height,
            )
            questions.append(item)
            test_qs.append(item)
    with open(os.path.join(stage, test_dir, 'cevap-anahtari.txt'), 'w', encoding='utf-8') as f:
        f.write(f"{BOOK['title']}\n{t['section']} · {t['series']} {t['number']}" + (f" · {diff['label']}" if diff.get('label') else '') + '\n\n')
        f.write('  '.join(key_lines) + '\n')
    tests_out.append(dict(key=f"t{t['id']:03d}", topicId=topic_id, bookSection=t['section'], series=t['series'], number=t['number'],
                          difficulty=diff.get('label'), difficultyScore=diff.get('score'), pages=t['pages'], folder=test_dir.replace(os.sep, '/'),
                          questions=[q['id'] for q in test_qs]))

manifest = dict(
    format='lumi-bank/1',
    book=BOOK,
    topics=[dict(t, folder=dirs.get(t['id']), units=units.get(t['id'], [])) for t in topics],
    tests=tests_out,
    questions=questions,
)
with open(os.path.join(stage, 'manifest.json'), 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=1)

# ---------------------------------------------------------------- viewer

viewer = r"""<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lumi Soru Bankası</title>
<style>
:root{--bg:#F4F2EC;--card:#FFFEFB;--text:#1A1917;--muted:#6B6962;--accent:#B5573A;--line:#E4E1D8}
@media (prefers-color-scheme:dark){:root{--bg:#1A1917;--card:#252422;--text:#F3F0E9;--muted:#ABA79C;--accent:#E08B6D;--line:#3A3833}}
body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text)}
header{position:sticky;top:0;background:var(--bg);padding:12px 16px;border-bottom:1px solid var(--line);z-index:2}
h1{font-size:18px;margin:0 0 8px}select,label{font-size:14px;margin:4px 8px 4px 0}select{padding:6px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--text)}
main{padding:16px;max-width:1100px;margin:0 auto}h2{font-size:15px;margin:24px 0 8px;color:var(--accent)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
figure{margin:0;background:#fff;border-radius:14px;padding:8px;border:1px solid var(--line)}figure img{width:100%;height:auto;display:block}
figcaption{font-size:12px;color:#6B6962;margin-top:6px;display:flex;gap:8px;flex-wrap:wrap}.tag{background:#F3EEE4;border-radius:99px;padding:1px 8px}
details summary{cursor:pointer;color:#6B6962;font-size:12px}
</style>
<header><h1>Lumi Soru Bankası</h1>
<select id="topic"></select><select id="diff"><option value="">Her zorluk</option><option>Kolay</option><option>Kolay-Orta</option><option>Orta</option><option>Orta-Zor</option><option>Zor</option></select>
<label><input type="checkbox" id="past"> Sadece çıkmış sorular</label> <span id="count"></span></header>
<main id="list"></main>
<script>
const M = __MANIFEST__;
const topics = new Map(M.topics.map(t => [t.id, t]));
const unitName = new Map(M.topics.flatMap(t => (t.units||[]).map(u => [u.id, u.name])));
const used = [...new Set(M.questions.map(q => q.topicId))];
const sel = document.getElementById('topic');
sel.innerHTML = '<option value="">Bütün konular</option>' + used.map(id => `<option value="${id}">${(topics.get(id).subtopic||topics.get(id).topic)}</option>`).join('');
function render(){
  const tid = sel.value, d = document.getElementById('diff').value, past = document.getElementById('past').checked;
  const qs = M.questions.filter(q => (!tid || q.topicId === tid) && (!d || q.difficulty === d) && (!past || q.pastExam));
  // Questions are grouped by their test (a test stays together even if a question is filed under a sibling topic).
  document.getElementById('count').textContent = qs.length + ' soru';
  const groups = new Map();
  for (const q of qs){ const k = q.testKey; if(!groups.has(k)) groups.set(k, []); groups.get(k).push(q); }
  const tests = new Map(M.tests.map(t => [t.key, t]));
  document.getElementById('list').innerHTML = [...groups].map(([k, list]) => { const t = tests.get(k); const top = topics.get(t.topicId);
    const name = top.subtopic||top.topic;
    const section = t.bookSection.replace(/\W/g,'').toLowerCase() === name.replace(/\W/g,'').toLowerCase() ? '' : ' · ' + t.bookSection;
    return `<h2>${name}${section} · ${t.series} ${t.number}${t.difficulty?' · '+t.difficulty:''}</h2><div class="grid">` +
      list.map(q => `<figure><img loading="lazy" src="${encodeURI(q.image)}"><figcaption><span>Soru ${q.number}</span>${q.unitId&&unitName.get(q.unitId)?`<span class="tag">${unitName.get(q.unitId)}</span>`:''}${q.pastExam?`<span class="tag">Çıkmış ${q.pastExam}</span>`:''}<details><summary>Cevap</summary>${q.answer}</details></figcaption></figure>`).join('') + '</div>'; }).join('');
}
for (const id of ['topic','diff','past']) document.getElementById(id).addEventListener('change', render);
render();
</script></html>"""


def write_viewer(root, qs, ts):
    with open(os.path.join(root, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(viewer.replace('__MANIFEST__', json.dumps(dict(topics=manifest['topics'], tests=ts, questions=qs), ensure_ascii=False)))


readme = f"""Lumi Soru Bankası
=================

Kitap: {BOOK['title']} ({BOOK['year']})
Soru: {{count_q}} · Test: {{count_t}}{{part_note}}

Düzen: Sınav / Ders / Konu / Zorluk / Test. Bütün TYT ve AYT dersleri ve konuları klasör olarak var;
bu kitaptaki sorular TYT / Temel Matematik konularının altında. Her konunun alt konuları
("incik cincik") manifest.json içinde; her sorunun alt konusu da orada (unitId) ve index.html'de
etiket olarak görünür.

Zorluk klasörleri: "1 Kolay", "2 Kolay-Orta", "3 Orta", "4 Orta-Zor", "5 Zor" (kitabın test başındaki
göstergesinden) ve "Orijinal Sorular (ÖSYM-MEB)" (göstergesi olmayan gerçek sınav soruları).
Test klasörü adı: kitap · (bölüm) · seri ve numara. Seri: "Test" (konu tanıma ve klasik sorular),
"ÖSYM Tadında", "Orijinal Sorular".
Her konunun "Çıkmış Sorular" klasöründe o konudaki bütün çıkmış soruların bir kopyası var.
Dosya adı: "Soru 07.webp"; çıkmış sorularda "(Çıkmış TYT 2018)" gibi bir ek var.
Her test klasöründe cevap-anahtari.txt bulunur.

index.html: tarayıcıda aç; konuya, zorluğa ve çıkmış sorulara göre süzerek bak.
manifest.json: uygulamanın içe aktaracağı liste (konu id'leri app/src/data/topics.ts ile aynı).

Bu sorular kitabın sahibinin kişisel çalışması içindir; paylaşma.
"""


def write_readme(root, n_q, n_t, part_note=''):
    with open(os.path.join(root, 'BENİOKU.txt'), 'w', encoding='utf-8') as f:
        f.write(readme.replace('{count_q}', str(n_q)).replace('{count_t}', str(n_t)).replace('{part_note}', part_note))


def write_zip(zip_path, root):
    base_dir = os.path.dirname(root)
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for base, dnames, fnames in os.walk(root):
            rel_base = os.path.relpath(base, base_dir)
            if not fnames and not dnames:
                zf.writestr(rel_base.replace(os.sep, '/') + '/', '')
            for fn in sorted(fnames):
                full = os.path.join(base, fn)
                arc = os.path.relpath(full, base_dir).replace(os.sep, '/')
                # Images are already compressed; store them.
                zf.write(full, arc, compress_type=zipfile.ZIP_STORED if fn.endswith('.webp') else zipfile.ZIP_DEFLATED)
    print(f"-> {zip_path} ({os.path.getsize(zip_path) // 1024 // 1024} MB)")


if not split_spec:
    write_viewer(stage, questions, tests_out)
    write_readme(stage, len(questions), len(tests_out))
    write_zip(os.path.join(out_dir, 'Lumi-Soru-Bankasi.zip'), stage)
    print(f"{len(questions)} questions, {len(tests_out)} tests")
else:
    # Parts: groups of topic folder numbers inside the book's subject ("01-09;10-14,16-18;15").
    subject_root = f"{BOOK['exam']}/{BOOK['subject']}/"

    def numbers(spec):
        out = set()
        for chunk in spec.split(','):
            lo, _, hi = chunk.partition('-')
            out.update(range(int(lo), int(hi or lo) + 1))
        return out

    groups = [numbers(g) for g in split_spec.split(';')]
    for k, nums in enumerate(groups, 1):
        def in_part(folder):
            if not folder.startswith(subject_root):
                return False
            return int(folder[len(subject_root):].split(' ', 1)[0]) in nums
        part_tests = [t for t in tests_out if in_part(t['folder'])]
        keys = {t['key'] for t in part_tests}
        part_qs = [q for q in questions if q['testKey'] in keys]
        topic_dirs_in = sorted({t['folder'].split('/')[2] for t in part_tests}, key=lambda n: int(n.split(' ', 1)[0]))
        first = topic_dirs_in[0].split(' ', 1)[1]
        last = topic_dirs_in[-1].split(' ', 1)[1]
        name = f"{ROOT} {k}-{len(groups)} ({first}" + (f" – {last})" if len(topic_dirs_in) > 1 else ")")
        part_root = os.path.join(out_dir, 'parts', safe(name))
        if os.path.exists(part_root):
            shutil.rmtree(part_root)
        os.makedirs(part_root)
        # Only this part's topic folders (the first part also carries every other subject's empty folders).
        for top in os.listdir(stage):
            src_top = os.path.join(stage, top)
            if not os.path.isdir(src_top):
                continue
            for dirpath, dirnames, filenames in os.walk(src_top):
                rel = os.path.relpath(dirpath, stage).replace(os.sep, '/')
                inside_book = rel.startswith(subject_root) or rel + '/' == subject_root
                if inside_book:
                    if rel + '/' != subject_root and not in_part(rel + '/' if rel.count('/') == 2 else '/'.join(rel.split('/')[:3]) + '/'):
                        continue
                elif k != 1:
                    continue
                os.makedirs(os.path.join(part_root, rel), exist_ok=True)
                for fn in filenames:
                    shutil.copyfile(os.path.join(dirpath, fn), os.path.join(part_root, rel, fn))
        part_manifest = dict(manifest, part=dict(index=k, of=len(groups), topics=topic_dirs_in), tests=part_tests, questions=part_qs)
        with open(os.path.join(part_root, 'manifest.json'), 'w', encoding='utf-8') as f:
            json.dump(part_manifest, f, ensure_ascii=False, indent=1)
        write_viewer(part_root, part_qs, part_tests)
        write_readme(part_root, len(part_qs), len(part_tests), f"\nParça {k}/{len(groups)}: {', '.join(n.split(' ', 1)[1] for n in topic_dirs_in)}")
        write_zip(os.path.join(out_dir, f"Lumi-Soru-Bankasi-{k}-{len(groups)}.zip"), part_root)
