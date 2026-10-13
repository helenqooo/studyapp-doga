"""Merges the visual review into boxes.json: corrected boxes, missing questions, marks, gauges.

    python3 apply_review.py boxes.json reviewed.json journal1.jsonl [journal2.jsonl ...]

The second look (when it ran) wins over the first reviewer's box. A corrected box is used as
is (`fixed`: no growing), so the crop is exactly what the reviewers looked at.
"""
import json
import sys

boxes_path, out_path, *journals = sys.argv[1:]
d = json.load(open(boxes_path))
by_page = {e['page']: e for e in d['pages']}
tests = {t['id']: t for t in d['tests']}

reviews, verdicts = [], []
for j in journals:
    for line in open(j):
        rec = json.loads(line)
        r = rec.get('result')
        if rec.get('type') != 'result' or not isinstance(r, dict):
            continue
        if 'issues' in r:
            reviews.append(r)
        elif 'results' in r:
            verdicts.append(r)

second = {}
for v in verdicts:
    for x in v['results']:
        second[(x['testId'], x['n'])] = x

stats = dict(fixed=0, added=0, marked=0, overruled=0, unfixed=[], grouping=[], gauges=0)
checked = set()
for r in reviews:
    checked.update(r['checked'])
    for t in r.get('tests', []):
        if t.get('difficulty') and not tests[t['testId']].get('difficulty'):
            tests[t['testId']]['difficulty'] = dict(score=None, label=t['difficulty'], angle=None, page=None, by='review')
            stats['gauges'] += 1
    for x in r['issues']:
        key = (x['testId'], x['n'])
        page = by_page.get(x['page'])
        if x['kind'] == 'grouping':
            stats['grouping'].append(x)
            continue
        if page is None:
            stats['unfixed'].append(x)
            continue
        q = next((q for q in page['questions'] if q['n'] == x['n']), None)
        if x['kind'] == 'marked':
            if q:
                q['marked'] = x['description']
                stats['marked'] += 1
            continue
        box = x.get('fixedBbox') if x.get('fixVerified') else None
        s = second.get(key)
        if s is not None:
            if not s['ok'] and s.get('fixedBbox'):
                box = s['fixedBbox']
                stats['overruled'] += 1
            elif not s['ok']:
                box = None
        if not box or len(box) != 4:
            stats['unfixed'].append(x)
            continue
        if q is None:
            q = dict(n=x['n'], answer=None, col=0 if box[0] < page['W'] / 2 else 1, wide=False, pastExam=None)
            page['questions'].append(q)
            page['questions'].sort(key=lambda q: q['n'])
            stats['added'] += 1
        q['bbox'] = [round(float(v), 1) for v in box]
        q['fixed'] = True
        stats['fixed'] += 1

json.dump(d, open(out_path, 'w'), ensure_ascii=False, indent=1)
print(f"tests checked: {len(checked)}/{len(tests)}  fixed: {stats['fixed']} (second look changed {stats['overruled']})  added: {stats['added']}  marked: {stats['marked']}  gauges read: {stats['gauges']}")
for x in stats['unfixed']:
    print('UNFIXED', x['testId'], x['page'], x['n'], x['kind'], x['description'][:120])
for x in stats['grouping']:
    print('GROUPING', x['testId'], x['page'], x['n'], x['description'][:160])
missing = sorted(set(tests) - checked)
if missing:
    print('NOT CHECKED', missing)
