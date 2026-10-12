// Pomodoro sessions, streaks, badges and the leaderboard.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createTestApp, DAY } from './testing';

const MIN = 60 * 1000;

function pomodoro(t: { clock: { now: number } }, minutes = 25, extra: Record<string, unknown> = {}) {
  const endedAt = t.clock.now;
  return { id: randomUUID(), kind: 'focus', subject: 'Fizik', startedAt: endedAt - minutes * MIN, endedAt, completed: true, ...extra };
}

test('a completed pomodoro earns XP, starts the streak and shows in the day summary', async () => {
  const t = await createTestApp();
  try {
    const body = pomodoro(t);
    const res = await t.call('POST', '/sessions', body);
    assert.equal(res.status, 201);
    assert.equal(res.json.rewards.xpGained, 20);
    assert.equal(res.json.rewards.streak, 1);
    assert.equal(res.json.profile.streak, 1);
    assert.equal(res.json.profile.streakToday, true);

    // Same id again (a retried upload): stored once, no second reward.
    const again = await t.call('POST', '/sessions', body);
    assert.equal(again.json.duplicate, true);
    assert.equal((await t.call('GET', '/profile')).json.xp, 20);

    // Too short, a break, or stopped early: saved, but no XP.
    for (const extra of [{}, { kind: 'break', subject: null }, { completed: false }]) {
      const minutes = 'kind' in extra || 'completed' in extra ? 10 : 3;
      const r = await t.call('POST', '/sessions', pomodoro(t, minutes, { subject: 'Kimya', ...extra }));
      assert.equal(r.status, 201);
      assert.equal(r.json.rewards.xpGained, 0);
    }

    const day = await t.call('GET', '/sessions');
    assert.equal(day.json.date, '2026-10-12');
    assert.equal(day.json.items.length, 4);
    assert.equal(day.json.pomodoros, 1);
    assert.equal(day.json.focusSec, (25 + 3 + 10) * 60);
    assert.deepEqual(day.json.bySubject, [
      { subject: 'Fizik', seconds: 25 * 60 },
      { subject: 'Kimya', seconds: 13 * 60 },
    ]);

    const days = await t.call('GET', '/sessions/days?days=3');
    assert.deepEqual(days.json.days.map((d: { date: string }) => d.date), ['2026-10-10', '2026-10-11', '2026-10-12']);
    assert.equal(days.json.days[2].focusSec, 38 * 60);

    assert.equal((await t.call('POST', '/sessions', pomodoro(t, 25, { subject: 'Resim' }))).status, 400);
    assert.equal((await t.call('POST', '/sessions', pomodoro(t, 300))).status, 400);
  } finally {
    await t.close();
  }
});

test('the streak grows day by day, breaks after a missed day and remembers the longest', async () => {
  const t = await createTestApp();
  try {
    for (let day = 1; day <= 3; day++) {
      const res = await t.call('POST', '/sessions', pomodoro(t));
      assert.equal(res.json.rewards.streak, day);
      // A second pomodoro the same day doesn't extend it.
      assert.equal((await t.call('POST', '/sessions', pomodoro(t))).json.rewards.streak, null);
      t.clock.now += DAY;
    }
    assert.equal((await t.call('GET', '/profile')).json.streak, 3);
    t.clock.now += DAY; // a day without studying
    const profile = (await t.call('GET', '/profile')).json;
    assert.equal(profile.streak, 0);
    assert.equal(profile.longestStreak, 3);
    assert.equal((await t.call('POST', '/sessions', pomodoro(t))).json.rewards.streak, 1);
  } finally {
    await t.close();
  }
});

test('clearing the review queue counts the day for the streak', async () => {
  const t = await createTestApp();
  try {
    const a = await t.solveOne();
    const b = await t.solveOne();
    await t.call('POST', `/questions/${a}/attempt`, { result: 'wrong' });
    await t.call('POST', `/questions/${b}/attempt`, { result: 'blank' });
    t.clock.now += DAY;
    const first = await t.call('POST', `/reviews/${a}/result`, { result: 'wrong' });
    assert.equal(first.json.rewards.streak, null);
    const last = await t.call('POST', `/reviews/${b}/result`, { result: 'correct' });
    assert.equal(last.json.rewards.streak, 1);
  } finally {
    await t.close();
  }
});

test('badges: first deneme', async () => {
  const t = await createTestApp();
  try {
    const exam = { exam: 'AYT', date: '2026-10-12', sections: [{ subject: 'Fizik', correct: 8, wrong: 2, blank: 4 }] };
    const first = await t.call('POST', '/exams', exam);
    assert.deepEqual(first.json.rewards.badges.map((b: { id: string }) => b.id), ['first-exam']);
    const second = await t.call('POST', '/exams', exam);
    assert.deepEqual(second.json.rewards.badges, []);
    assert.equal((await t.call('GET', '/profile')).json.badges.length, 1);
    assert.equal((await t.call('GET', '/profile')).json.xp, 100);

    // Deleting a deneme takes its XP back (no create/delete farming); the badge stays.
    assert.equal((await t.call('DELETE', `/exams/${second.json.exam.id}`)).status, 204);
    const after = (await t.call('GET', '/profile')).json;
    assert.equal(after.xp, 50);
    assert.equal(after.badges.length, 1);
    const board = await t.call('GET', '/leaderboard?period=week');
    assert.equal(board.json.items.find((r: { isMe: boolean }) => r.isMe).xp, 50);
  } finally {
    await t.close();
  }
});

test('leaderboard ranks this week and all time; level up is reported', async () => {
  const t = await createTestApp();
  try {
    const friend = await t.register('arkadas', 'Arkadaş');
    // Me: 3 pomodoros = 60 XP this week. Friend: 1 exam = 50 XP.
    for (let i = 0; i < 3; i++) await t.call('POST', '/sessions', pomodoro(t));
    const exam = await t.callAs(friend, 'POST', '/exams', {
      exam: 'TYT',
      date: '2026-10-12',
      sections: [{ subject: 'Fen', correct: 10, wrong: 2, blank: 8 }],
    });
    assert.equal(exam.json.rewards.levelUp, null);

    let board = await t.call('GET', '/leaderboard');
    assert.equal(board.json.weekStart, '2026-10-12');
    assert.deepEqual(
      board.json.items.map((r: { displayName: string; xp: number; rank: number; isMe: boolean }) => [r.displayName, r.xp, r.rank, r.isMe]),
      [
        ['Öğrenci', 60, 1, true],
        ['Arkadaş', 50, 2, false],
      ],
    );

    // Next week the weekly board starts over; all time keeps the totals.
    t.clock.now += 7 * DAY;
    board = await t.call('GET', '/leaderboard?period=week');
    assert.deepEqual(board.json.items.map((r: { xp: number; rank: number }) => [r.xp, r.rank]), [[0, 1], [0, 1]]);
    board = await t.call('GET', '/leaderboard?period=all');
    assert.deepEqual(board.json.items.map((r: { xp: number }) => r.xp), [60, 50]);

    // 40 more XP crosses level 2 (100 XP).
    await t.call('POST', '/sessions', pomodoro(t));
    const up = await t.call('POST', '/sessions', pomodoro(t));
    assert.equal(up.json.rewards.levelUp, 2);
  } finally {
    await t.close();
  }
});

test('pomodoro settings are validated and saved', async () => {
  const t = await createTestApp();
  try {
    assert.equal((await t.call('PUT', '/profile/settings', { focusMinutes: 2, breakMinutes: 5 })).status, 400);
    const res = await t.call('PUT', '/profile/settings', { focusMinutes: 50, breakMinutes: 10 });
    assert.deepEqual(res.json.settings, { focusMinutes: 50, breakMinutes: 10 });
  } finally {
    await t.close();
  }
});
