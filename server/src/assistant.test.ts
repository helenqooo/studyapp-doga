// The assistant chat: JSON and streamed replies, history, the daily cap, per-user threads,
// and the student context it is given.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ASSISTANT_DAILY_LIMIT } from './routes/assistant';
import { studentContext } from './studentContext';
import { openDb } from './db/client';
import { createTestApp } from './testing';

test('assistant replies as JSON or as an NDJSON stream and keeps the thread', async () => {
  const t = await createTestApp();
  try {
    const plain = await t.call('POST', '/assistant/messages', { content: 'Bugün ne çalışayım?' });
    assert.equal(plain.status, 201);
    assert.equal(plain.json.userMessage.content, 'Bugün ne çalışayım?');
    assert.match(plain.json.assistantMessage.content, /Selam!/);

    const res = await t.app.inject({
      method: 'POST',
      url: '/assistant/messages',
      headers: { authorization: `Bearer ${t.token}`, accept: 'application/x-ndjson' },
      payload: { content: 'Türevi anlat' },
    });
    assert.equal(res.statusCode, 200);
    assert.match(String(res.headers['content-type']), /application\/x-ndjson/);
    const lines = res.body.trim().split('\n').map((l) => JSON.parse(l));
    const deltas = lines.filter((l) => l.type === 'delta');
    const done = lines.at(-1);
    assert.ok(deltas.length > 3);
    assert.equal(done.type, 'done');
    assert.equal(deltas.map((d) => d.text).join(''), done.assistantMessage.content);

    const thread = await t.call('GET', '/assistant/messages');
    assert.deepEqual(thread.json.items.map((m: { role: string }) => m.role), ['user', 'assistant', 'user', 'assistant']);
    assert.equal(thread.json.remainingToday, ASSISTANT_DAILY_LIMIT - 2);

    // Another student sees only their own thread.
    const other = await t.register('arkadas');
    assert.equal((await t.callAs(other, 'GET', '/assistant/messages')).json.items.length, 0);

    assert.equal((await t.call('POST', '/assistant/messages', { content: '   ' })).status, 400);
    assert.equal((await t.call('DELETE', '/assistant/messages')).status, 204);
    assert.equal((await t.call('GET', '/assistant/messages')).json.items.length, 0);
  } finally {
    await t.close();
  }
});

test('the daily message cap', async () => {
  const t = await createTestApp();
  try {
    for (let i = 0; i < ASSISTANT_DAILY_LIMIT; i++) {
      assert.equal((await t.call('POST', '/assistant/messages', { content: `soru ${i}` })).status, 201);
    }
    assert.equal((await t.call('POST', '/assistant/messages', { content: 'bir tane daha' })).status, 429);
    t.clock.now += 25 * 60 * 60 * 1000;
    assert.equal((await t.call('POST', '/assistant/messages', { content: 'ertesi gün' })).status, 201);
  } finally {
    await t.close();
  }
});

test('"Anlamadım" chat can stream too', async () => {
  const t = await createTestApp();
  try {
    const id = await t.solveOne();
    const res = await t.app.inject({
      method: 'POST',
      url: `/questions/${id}/messages`,
      headers: { authorization: `Bearer ${t.token}`, accept: 'application/x-ndjson' },
      payload: { content: 'İkinci adımı anlamadım' },
    });
    const lines = res.body.trim().split('\n').map((l) => JSON.parse(l));
    assert.equal(lines.at(-1).type, 'done');
    assert.ok(lines.some((l) => l.type === 'delta'));
  } finally {
    await t.close();
  }
});

test('the student context has real numbers and nothing made up', async () => {
  const t = await createTestApp();
  try {
    const id = await t.solveOne();
    await t.call('POST', `/questions/${id}/attempt`, { choice: 'A' });
    await t.call('POST', '/exams', { exam: 'TYT', date: '2026-10-11', sections: [{ subject: 'Türkçe', correct: 30, wrong: 8, blank: 2 }] });
    const db = openDb(`${t.dataDir}/derece.db`);
    const me = (await t.call('GET', '/me')).json.user.id;
    const text = studentContext(db, me, t.clock.now, 'Europe/Istanbul');
    assert.match(text, /Name: Öğrenci/);
    assert.match(text, /Days until YKS/);
    assert.match(text, /Reviews: 0 due today, 1 in the queue/);
    assert.match(text, /1 answered, 0 correct, 1 wrong/);
    assert.match(text, /TYT exams: 1 entered; last: 2026-10-11 28 net \(partial\)/);
    assert.match(text, /AYT exams: none entered yet/);
    assert.match(text, /Topics losing the most net: .*−/);
  } finally {
    await t.close();
  }
});
