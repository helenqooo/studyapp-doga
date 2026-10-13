"""Writes the deepened taxonomy into app/src/data/topics.ts (and the server copy).

    python3 apply_taxonomy.py journal.jsonl topics.ts OUT.ts [taxonomy-patch.json]

Keeps every existing id and its exam/subject; applies label renames; inserts new topics in
the order the subject expert gave; adds UNITS (topic id → fine-grained units) and helpers.
"""
import json
import re
import sys

journal, topics_path, out_path = sys.argv[1:4]
patch = json.load(open(sys.argv[4])) if len(sys.argv) > 4 else {}
results = {}
audits = []
for line in open(journal):
    d = json.loads(line)
    r = d.get('result')
    if d.get('type') == 'result' and isinstance(r, dict):
        if 'topics' in r and 'subject' in r:
            results[(r['exam'], r['subject'])] = r
        elif 'problems' in r:
            audits.append(r)

src = open(topics_path, encoding='utf-8').read()
LINE = re.compile(r"\{\s*id:\s*'([^']+)',\s*exam:\s*'([^']+)',\s*subject:\s*'([^']+)',\s*topic:\s*(?:'([^']*)'|\"([^\"]*)\")(?:,\s*subtopic:\s*(?:'([^']*)'|\"([^\"]*)\"))?\s*\}")
existing = []
for m in LINE.finditer(src):
    tid, exam, subject, t1, t2, s1, s2 = m.groups()
    existing.append(dict(id=tid, exam=exam, subject=subject, topic=t1 if t1 is not None else t2, subtopic=s1 if s1 is not None else s2))
by_id = {t['id']: t for t in existing}

ORDER = [('TYT', 'Türkçe'), ('TYT', 'Sosyal'), ('TYT', 'Temel Matematik'), ('TYT', 'Fen'), ('AYT', 'Matematik'), ('AYT', 'Fizik'), ('AYT', 'Kimya'), ('AYT', 'Biyoloji')]
ID_RE = re.compile(r'^(tyt|ayt)-[a-z0-9-]+$')


def q(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'" if "'" in s and '"' not in s and False else (f'"{s}"' if "'" in s else f"'{s}'")


final = []
units = {}
problems = []
for exam, subject in ORDER:
    r = results.get((exam, subject))
    old = [t for t in existing if t['exam'] == exam and t['subject'] == subject]
    if not r:
        final.extend(old)
        problems.append(f'no result for {exam} {subject}; kept as is')
        continue
    renames = {x['id']: x['newLabel'] for x in r.get('renamed', [])}
    seen = set()
    for t in r['topics']:
        tid = t['id']
        if not ID_RE.match(tid):
            problems.append(f'bad id {tid}')
            continue
        if tid in seen:
            problems.append(f'duplicate {tid}')
            continue
        seen.add(tid)
        if tid in by_id:
            e = dict(by_id[tid])
            if tid in renames:
                if e['subtopic']:
                    e['subtopic'] = renames[tid]
                else:
                    e['topic'] = renames[tid]
        else:
            e = dict(id=tid, exam=exam, subject=subject, topic=t['topic'], subtopic=(t.get('subtopic') or None))
        final.append(e)
        us = []
        useen = set()
        for u in t.get('subtopics', []):
            uid = u['id'] if u['id'].startswith(tid + '-') else f"{tid}-{u['id']}"
            if not ID_RE.match(uid) or uid in useen:
                continue
            useen.add(uid)
            us.append(dict(id=uid, name=u['name']))
        if us:
            units[tid] = us
    # Never lose an existing id, even if the expert left it out.
    for t in old:
        if t['id'] not in seen:
            final.append(t)
            problems.append(f'kept missing existing id {t["id"]}')

# Audit corrections.
for tid, label in patch.get('labels', {}).items():
    t = next((t for t in final if t['id'] == tid), None)
    if t is None:
        problems.append(f'patch: no topic {tid}')
    elif t['subtopic']:
        t['subtopic'] = label
    else:
        t['topic'] = label
drop = set(patch.get('dropUnits', []))
rename_units = patch.get('unitNames', {})
for tid in list(units):
    units[tid] = [dict(u, name=rename_units.get(u['id'], u['name'])) for u in units[tid] if u['id'] not in drop]
for tid, extra in patch.get('addUnits', {}).items():
    units.setdefault(tid, []).extend(extra)
for add in patch.get('addTopics', []):
    entry = {k: add.get(k) for k in ('id', 'exam', 'subject', 'topic', 'subtopic')}
    anchor = add.get('after') or add.get('before')
    idx = next((i for i, t in enumerate(final) if t['id'] == anchor), None)
    if idx is None:
        problems.append(f'patch: no anchor {anchor}')
        idx = len(final) - 1
    final.insert(idx + 1 if add.get('after') else idx, entry)
    units[entry['id']] = add.get('units', [])

all_ids = [t['id'] for t in final]
assert len(all_ids) == len(set(all_ids)), 'duplicate ids'
assert set(by_id) <= set(all_ids), 'lost an existing id'

head = src[: src.index('export const TOPICS: Topic[] = [')]
tail = src[src.index('const TOPIC_BY_ID'):]


def lit(s):
    return f'"{s}"' if "'" in s else f"'{s}'"


lines = ['export const TOPICS: Topic[] = [']
current = None
for t in final:
    group = (t['exam'], t['subject'], t['topic'] if t['subject'] in ('Sosyal', 'Fen') or t['subtopic'] else '')
    hdr = (t['exam'], t['subject'])
    if hdr != current:
        if current:
            lines.append('')
        lines.append(f"  // ───────────── {t['exam']} · {t['subject']} ─────────────")
        current = hdr
    sub = f", subtopic: {lit(t['subtopic'])}" if t['subtopic'] else ''
    lines.append(f"  {{ id: {lit(t['id'])}, exam: {lit(t['exam'])}, subject: {lit(t['subject'])}, topic: {lit(t['topic'])}{sub} }},")
lines.append('];')
lines.append('')
lines.append('/**')
lines.append(' * The units inside each topic ("incik cincik"): what a textbook section or a question')
lines.append(' * bank test is about. Ids start with their topic id and, like topic ids, are permanent.')
lines.append(' */')
lines.append('export const UNITS: Record<string, { id: string; name: string }[]> = {')
for t in final:
    if t['id'] in units:
        lines.append(f"  {lit(t['id'])}: [")
        for u in units[t['id']]:
            lines.append(f"    {{ id: {lit(u['id'])}, name: {lit(u['name'])} }},")
        lines.append('  ],')
lines.append('};')
lines.append('')
body = '\n'.join(lines) + '\n'
helpers = '''
const UNIT_BY_ID = new Map(Object.values(UNITS).flat().map((u) => [u.id, u]));

/** A unit by id ("tyt-mat-uslu-sayilar-uslu-denklemler"). */
export function getUnit(id: string | null | undefined): { id: string; name: string } | undefined {
  return id ? UNIT_BY_ID.get(id) : undefined;
}

/** The units of a topic, in curriculum order (empty when it has none). */
export function unitsOf(topicId: string): { id: string; name: string }[] {
  return UNITS[topicId] ?? [];
}
'''
out = head + body + '\n' + tail.rstrip('\n') + '\n' + helpers
open(out_path, 'w', encoding='utf-8').write(out)
print(f'{len(final)} topics ({len(final) - len(existing)} new), {sum(len(v) for v in units.values())} units')
for p in problems:
    print('note:', p)
for a in audits:
    print('audit:', len(a['problems']), 'problems,', len(a['missingTopics']), 'missing')
