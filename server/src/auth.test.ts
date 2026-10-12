// Accounts: sign-up with an invite, sign-in, logout, data isolation and the legacy data claim.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { openDb } from './db/client';
import { legacyProfile, questions } from './db/schema';
import { createTestApp, INVITE } from './testing';

test('sign-up needs the invite after the first account; sign-in and logout', async () => {
  const t = await createTestApp();
  try {
    const config = await t.callAs(null, 'GET', '/auth/config');
    assert.deepEqual(config.json, { registrationOpen: true, inviteRequired: true });

    const body = { username: 'Arkadas', displayName: 'Arkadaş', password: 'parola-1234' };
    assert.equal((await t.callAs(null, 'POST', '/auth/register', body)).status, 403);
    assert.equal((await t.callAs(null, 'POST', '/auth/register', { ...body, inviteCode: 'yanlis' })).status, 403);
    const ok = await t.callAs(null, 'POST', '/auth/register', { ...body, inviteCode: INVITE });
    assert.equal(ok.status, 201);
    assert.equal(ok.json.user.username, 'arkadas');
    assert.equal((await t.callAs(null, 'POST', '/auth/register', { ...body, inviteCode: INVITE })).status, 409);
    assert.equal((await t.callAs(null, 'POST', '/auth/register', { ...body, username: 'a b', inviteCode: INVITE })).status, 400);
    assert.equal((await t.callAs(null, 'POST', '/auth/register', { ...body, username: 'kisa', password: '123', inviteCode: INVITE })).status, 400);

    const bad = await t.callAs(null, 'POST', '/auth/login', { username: 'arkadas', password: 'yanlis-parola' });
    assert.equal(bad.status, 401);
    const login = await t.callAs(null, 'POST', '/auth/login', { username: ' ARKADAS ', password: 'parola-1234' });
    assert.equal(login.status, 200);
    const me = await t.callAs(login.json.token, 'GET', '/me');
    assert.equal(me.json.user.displayName, 'Arkadaş');
    assert.equal(me.json.profile.xp, 0);

    assert.equal((await t.callAs(login.json.token, 'POST', '/auth/logout')).status, 204);
    assert.equal((await t.callAs(login.json.token, 'GET', '/me')).status, 401);
    assert.equal((await t.callAs(null, 'GET', '/profile')).status, 401);
    assert.equal((await t.callAs('not-a-token', 'GET', '/profile')).status, 401);
  } finally {
    await t.close();
  }
});

test('too many wrong passwords are slowed down', async () => {
  const t = await createTestApp();
  try {
    for (let i = 0; i < 10; i++) {
      assert.equal((await t.callAs(null, 'POST', '/auth/login', { username: 'ogrenci', password: `yanlis-${i}` })).status, 401);
    }
    const blocked = await t.callAs(null, 'POST', '/auth/login', { username: 'ogrenci', password: 'parola-1234' });
    assert.equal(blocked.status, 429);
  } finally {
    await t.close();
  }
});

test("one user can't see or change another user's data", async () => {
  const t = await createTestApp();
  try {
    const qid = await t.solveOne();
    await t.call('POST', `/questions/${qid}/attempt`, { result: 'wrong' });
    const exam = await t.call('POST', '/exams', {
      exam: 'TYT',
      date: '2026-10-11',
      sections: [{ subject: 'Türkçe', correct: 30, wrong: 4, blank: 6 }],
    });
    assert.equal(exam.status, 201);

    const other = await t.register('baska', 'Başka');
    assert.equal((await t.callAs(other, 'GET', `/questions/${qid}`)).status, 404);
    assert.equal((await t.callAs(other, 'GET', `/questions/${qid}/image`)).status, 404);
    assert.equal((await t.callAs(other, 'GET', `/questions/${qid}/messages`)).status, 404);
    assert.equal((await t.callAs(other, 'POST', `/questions/${qid}/attempt`, { result: 'correct' })).status, 404);
    assert.equal((await t.callAs(other, 'GET', '/questions')).json.total, 0);
    assert.equal((await t.callAs(other, 'GET', '/questions/facets')).json.total, 0);
    assert.equal((await t.callAs(other, 'GET', '/exams')).json.items.length, 0);
    assert.equal((await t.callAs(other, 'GET', `/exams/${exam.json.exam.id}`)).status, 404);
    assert.equal((await t.callAs(other, 'DELETE', `/exams/${exam.json.exam.id}`)).status, 404);
    const overview = await t.callAs(other, 'GET', '/stats/overview');
    assert.equal(overview.json.byExam.TYT.count, 0);
    assert.equal(overview.json.practice.attempts, 0);

    t.clock.now += 24 * 60 * 60 * 1000;
    assert.equal((await t.callAs(other, 'GET', '/reviews/today')).json.items.length, 0);
    assert.equal((await t.callAs(other, 'POST', `/reviews/${qid}/result`, { result: 'correct' })).status, 404);
    assert.equal((await t.call('GET', '/reviews/today')).json.items.length, 1);
  } finally {
    await t.close();
  }
});

test('the first account claims the data of the single-user version', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'derece-legacy-'));
  const db = openDb(path.join(dataDir, 'derece.db'));
  db.insert(legacyProfile)
    .values({ id: 1, xp: 480, currentStreak: 3, longestStreak: 9, lastStreakDate: '2026-10-11', badges: [{ id: 'first-exam', earnedAt: 1 }] })
    .run();
  const qid = randomUUID();
  db.insert(questions)
    .values({
      id: qid,
      createdAt: Date.parse('2026-10-01T10:00:00Z'),
      imageFile: `${qid}.png`,
      imageMime: 'image/png',
      exam: 'TYT',
      subject: 'Temel Matematik',
      topicId: 'tyt-mat-problem-yas',
      difficulty: 2,
      questionText: 'Eski soru',
      hints: ['a', 'b', 'c'],
      solutionSteps: ['x'],
      finalAnswer: 'A',
      confidence: 0.9,
      model: 'old',
    })
    .run();
  db.$client.close();

  const t = await createTestApp(undefined, { dataDir });
  try {
    const profile = await t.call('GET', '/profile');
    assert.equal(profile.json.xp, 480);
    assert.equal(profile.json.streak, 3);
    assert.equal(profile.json.longestStreak, 9);
    assert.deepEqual(profile.json.badges.map((b: { id: string }) => b.id), ['first-exam']);
    assert.equal((await t.call('GET', `/questions/${qid}`)).json.questionText, 'Eski soru');

    // Later accounts start empty.
    const other = await t.register('ikinci');
    assert.equal((await t.callAs(other, 'GET', '/profile')).json.xp, 0);
    assert.equal((await t.callAs(other, 'GET', `/questions/${qid}`)).status, 404);
  } finally {
    await t.close();
  }
});
