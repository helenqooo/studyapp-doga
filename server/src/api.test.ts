// End-to-end API test against a temp database, with mock AI and a controllable clock.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { buildApp } from './app';
import { createMockSolver } from './claude/solver';
import { createMockTutor } from './claude/tutor';
import { openDb } from './db/client';
import { loadEnv } from './env';
import { MAX_USER_MESSAGES } from './routes/messages';

const DAY = 24 * 60 * 60 * 1000;
const TOKEN = 'test-token-1234567890';
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'derece-test-'));
const env = loadEnv({ APP_TOKEN: TOKEN, MOCK_SOLVER: 'true', DATA_DIR: dataDir, APP_TIMEZONE: 'Europe/Istanbul' });

// Noon in Istanbul, so day arithmetic never straddles midnight.
let clock = Date.parse('2026-10-12T09:00:00Z');
const app = await buildApp(
  {
    env,
    db: openDb(env.dbFile),
    solver: createMockSolver({ delayMs: 0 }),
    tutor: createMockTutor({ delayMs: 0 }),
    now: () => clock,
  },
  { logger: false },
);

after(async () => {
  await app.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

const auth = { authorization: `Bearer ${TOKEN}` };

async function call<T = any>(method: 'GET' | 'POST', url: string, body?: unknown): Promise<{ status: number; json: T }> {
  const res = await app.inject({ method, url, headers: auth, ...(body !== undefined ? { payload: body as object } : {}) });
  return { status: res.statusCode, json: res.json() as T };
}

async function solveOne(): Promise<string> {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
  const boundary = '----derece-test';
  const payload = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="q.png"\r\nContent-Type: image/png\r\n\r\n`),
    png,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const res = await app.inject({
    method: 'POST',
    url: '/solve',
    headers: { ...auth, 'content-type': `multipart/form-data; boundary=${boundary}` },
    payload,
  });
  assert.equal(res.statusCode, 201);
  return res.json().id;
}

test('requests without the token are rejected', async () => {
  const res = await app.inject({ method: 'GET', url: '/reviews/today' });
  assert.equal(res.statusCode, 401);
});

test('a wrong answer goes through the full review ladder', async () => {
  const id = await solveOne();

  const attempt = await call('POST', `/questions/${id}/attempt`, { result: 'wrong', userAnswer: 'B', hintsUsed: 1 });
  assert.equal(attempt.status, 201);
  assert.equal(attempt.json.xpGained, 10);

  // Not due on the day it was solved.
  let today = await call('GET', '/reviews/today');
  assert.equal(today.json.items.length, 0);
  let q = await call('GET', `/questions/${id}`);
  assert.deepEqual([q.json.review.stage, q.json.review.dueDate], [0, '2026-10-13']);

  // Due the next day.
  clock += DAY;
  today = await call('GET', '/reviews/today');
  assert.equal(today.json.items.length, 1);
  assert.equal(today.json.items[0].id, id);

  let res = await call('POST', `/reviews/${id}/result`, { result: 'correct' });
  assert.equal(res.status, 200);
  assert.deepEqual([res.json.review.stage, res.json.review.intervalDays, res.json.review.dueDate], [1, 3, '2026-10-16']);
  assert.equal(res.json.xpGained, 15);
  assert.equal(res.json.profile.xp, 25);

  // Answering again before it is due is refused.
  res = await call('POST', `/reviews/${id}/result`, { result: 'correct' });
  assert.equal(res.status, 409);

  today = await call('GET', '/reviews/today');
  assert.equal(today.json.items.length, 0);
  assert.equal(today.json.completedToday, 1);

  // Wrong on the next review → back to the start.
  clock = Date.parse('2026-10-16T09:00:00Z');
  res = await call('POST', `/reviews/${id}/result`, { result: 'wrong' });
  assert.deepEqual([res.json.review.stage, res.json.review.dueDate, res.json.xpGained], [0, '2026-10-17', 0]);

  // Five correct reviews in a row graduate it.
  const due: string[] = [];
  for (let i = 0; i < 5; i++) {
    clock = Date.parse(`${res.json.review.dueDate}T09:00:00Z`);
    res = await call('POST', `/reviews/${id}/result`, { result: 'correct' });
    assert.equal(res.status, 200);
    due.push(res.json.review.status === 'graduated' ? 'graduated' : res.json.review.dueDate);
  }
  assert.deepEqual(due, ['2026-10-20', '2026-10-27', '2026-11-10', '2026-12-10', 'graduated']);

  q = await call('GET', `/questions/${id}`);
  assert.equal(q.json.attempts.length, 8);
  assert.equal(q.json.review.correctCount, 6);
});

test('history filters and facets', async () => {
  const facets = await call('GET', '/questions/facets');
  assert.ok(facets.json.total >= 1);
  assert.ok(facets.json.subjects.some((s: { subject: string }) => s.subject === 'Temel Matematik'));

  const math = await call('GET', `/questions?subject=${encodeURIComponent('Temel Matematik')}`);
  assert.ok(math.json.items.length >= 1);
  const fen = await call('GET', '/questions?subject=Fen');
  assert.equal(fen.json.items.length, 0);
  const byTopic = await call('GET', '/questions?topicId=tyt-mat-ikinci-derece&limit=1');
  assert.equal(byTopic.json.items.length, 1);
});

test('"Anlamadım" chat stores both turns and enforces the limit', async () => {
  const id = await solveOne();

  const first = await call('POST', `/questions/${id}/messages`, { content: 'İkinci adımı anlamadım' });
  assert.equal(first.status, 201);
  assert.equal(first.json.userMessage.role, 'user');
  assert.equal(first.json.assistantMessage.role, 'assistant');

  const empty = await call('POST', `/questions/${id}/messages`, { content: '   ' });
  assert.equal(empty.status, 400);

  for (let i = 1; i < MAX_USER_MESSAGES; i++) {
    assert.equal((await call('POST', `/questions/${id}/messages`, { content: `Soru ${i}` })).status, 201);
  }
  assert.equal((await call('POST', `/questions/${id}/messages`, { content: 'Bir tane daha' })).status, 409);

  const list = await call('GET', `/questions/${id}/messages`);
  assert.equal(list.json.items.length, MAX_USER_MESSAGES * 2);
  assert.equal((await call('GET', `/questions/${id}`)).json.messageCount, MAX_USER_MESSAGES * 2);
});
