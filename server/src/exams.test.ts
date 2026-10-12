// Deneme entry, analysis and weekly summary, on a fresh database.
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createTestApp, DAY } from './testing';

const t = await createTestApp();
const { call, upload } = t;
after(() => t.close());

const tytSections = (turkce: [number, number], mat: [number, number], topics: { topicId: string; correct: number; wrong: number; blank: number }[] = []) => [
  { subject: 'Türkçe', correct: turkce[0], wrong: turkce[1], blank: 40 - turkce[0] - turkce[1] },
  { subject: 'Sosyal', correct: 12, wrong: 4, blank: 4 },
  { subject: 'Temel Matematik', correct: mat[0], wrong: mat[1], blank: 40 - mat[0] - mat[1], topics },
  { subject: 'Fen', correct: 10, wrong: 2, blank: 8 },
];

test('weekly summary needs some data first', async () => {
  const res = await call('GET', '/stats/weekly-summary');
  assert.equal(res.status, 200);
  assert.equal(res.json.status, 'insufficient');
});

test('karne photo becomes an editable draft without saving anything', async () => {
  const res = await upload('/exams/parse');
  assert.equal(res.status, 200);
  assert.equal(res.json.exam, 'TYT');
  assert.deepEqual(
    res.json.sections.map((s: { subject: string }) => s.subject),
    ['Türkçe', 'Sosyal', 'Temel Matematik', 'Fen'],
  );
  assert.equal((await call('GET', '/exams')).json.items.length, 0);
});

test('creating, validating, editing and deleting exams', async () => {
  const created = await call('POST', '/exams', { exam: 'TYT', date: '2026-10-04', name: 'Deneme 1', sections: tytSections([30, 8], [22, 6]) });
  assert.equal(created.status, 201);
  assert.equal(created.json.xpGained, 50);
  assert.equal(created.json.exam.sections[0].net, 28); // 30 − 8/4
  assert.equal(created.json.exam.totalNet, 28 + 11 + 20.5 + 9.5);
  assert.equal(created.json.exam.totalQuestions, 120);

  const bad = [
    { exam: 'AYT', date: '2026-10-04', sections: tytSections([30, 8], [22, 6]) }, // TYT subjects on an AYT exam
    { exam: 'TYT', date: '2026-10-04', sections: [{ subject: 'Fen', correct: 15, wrong: 6, blank: 0 }] }, // 21 > 20
    { exam: 'TYT', date: '2026-10-04', sections: [{ subject: 'Fen', correct: 5, wrong: 1, blank: 0, topics: [{ topicId: 'ayt-fiz-newton', correct: 1, wrong: 0, blank: 0 }] }] },
    { exam: 'TYT', date: '4 Ekim', sections: tytSections([30, 8], [22, 6]) },
  ];
  for (const body of bad) assert.equal((await call('POST', '/exams', body)).status, 400);

  const id = created.json.exam.id;
  const edited = await call('PUT', `/exams/${id}`, { exam: 'TYT', date: '2026-10-04', name: 'Deneme 1 (düzeltildi)', sections: tytSections([31, 8], [22, 6]) });
  assert.equal(edited.status, 200);
  assert.equal(edited.json.sections[0].net, 29);

  const extra = await call('POST', '/exams', { exam: 'AYT', date: '2026-10-05', sections: [{ subject: 'Fizik', correct: 7, wrong: 3, blank: 4 }] });
  assert.equal(extra.status, 201);
  assert.equal((await call('GET', '/exams?exam=AYT')).json.items.length, 1);
  assert.equal((await call('DELETE', `/exams/${extra.json.exam.id}`)).status, 204);
  assert.equal((await call('GET', `/exams/${extra.json.exam.id}`)).status, 404);
});

test('overview: net trend per subject and topic losses from exams + practice', async () => {
  await call('POST', '/exams', {
    exam: 'TYT',
    date: '2026-10-11',
    name: 'Deneme 2',
    sections: tytSections([32, 4], [25, 7], [
      { topicId: 'tyt-mat-problem-yas', correct: 1, wrong: 3, blank: 1 }, // 3·1.25 + 1 = 4.75
      { topicId: 'tyt-geo-cember-daire', correct: 2, wrong: 0, blank: 1 }, // 1
    ]),
  });

  // Practice: the mock solver classifies as tyt-mat-ikinci-derece; two wrong answers = 0.5 · 2.5 = 1.25.
  for (let i = 0; i < 2; i++) {
    const id = await t.solveOne();
    assert.equal((await call('POST', `/questions/${id}/attempt`, { result: 'wrong' })).status, 201);
  }

  const o = (await call('GET', '/stats/overview')).json;
  const tyt = o.byExam.TYT;
  assert.equal(tyt.count, 2);
  assert.deepEqual(tyt.trend.map((e: { name: string }) => e.name), ['Deneme 1 (düzeltildi)', 'Deneme 2']);
  const turkce = tyt.subjects.find((s: { subject: string }) => s.subject === 'Türkçe');
  assert.deepEqual([turkce.latestNet, turkce.previousNet, turkce.bestNet, turkce.averageNet], [31, 29, 31, 30]);
  assert.equal(o.byExam.AYT.count, 0);

  assert.deepEqual(
    o.topicLosses.map((x: { topicId: string; lostNet: number }) => [x.topicId, x.lostNet]),
    [
      ['tyt-mat-problem-yas', 4.75],
      ['tyt-mat-ikinci-derece', 1.25],
      ['tyt-geo-cember-daire', 1],
    ],
  );
  assert.equal(o.practice.wrong, 2);
  assert.equal(o.practice.activeReviews, 2);
});

test('weekly summary is generated once per week and can be refreshed', async () => {
  const first = await call('GET', '/stats/weekly-summary');
  assert.equal(first.json.status, 'ok');
  assert.equal(first.json.weekStart, '2026-10-12'); // Monday
  assert.equal(first.json.priorities.length, 3);
  assert.equal(first.json.priorities[0].topicId, 'tyt-mat-problem-yas');

  t.clock.now += 2 * DAY; // still the same week
  const cached = await call('GET', '/stats/weekly-summary');
  assert.equal(cached.json.generatedAt, first.json.generatedAt);

  const refreshed = await call('GET', '/stats/weekly-summary?refresh=true');
  assert.notEqual(refreshed.json.generatedAt, first.json.generatedAt);

  t.clock.now += 6 * DAY; // next week
  const next = await call('GET', '/stats/weekly-summary');
  assert.equal(next.json.weekStart, '2026-10-19');
});
