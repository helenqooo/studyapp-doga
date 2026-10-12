import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialSchedule, nextSchedule, REVIEW_INTERVALS } from './srs';
import { addDays } from './time';

test('a missed question is due tomorrow at stage 0', () => {
  assert.deepEqual(initialSchedule('2026-10-12'), { stage: 0, dueDate: '2026-10-13', status: 'active' });
});

test('correct answers climb the 1-3-7-14-30 ladder and then graduate', () => {
  let today = '2026-10-13';
  let s = initialSchedule('2026-10-12');
  const gaps: number[] = [];
  for (let i = 0; i < REVIEW_INTERVALS.length - 1; i++) {
    s = nextSchedule(s.stage, true, today);
    assert.equal(s.status, 'active');
    gaps.push(REVIEW_INTERVALS[s.stage]!);
    assert.equal(s.dueDate, addDays(today, REVIEW_INTERVALS[s.stage]!));
    today = s.dueDate;
  }
  assert.deepEqual(gaps, [3, 7, 14, 30]);
  assert.equal(nextSchedule(s.stage, true, today).status, 'graduated');
});

test('a wrong answer at any stage starts over', () => {
  for (let stage = 0; stage < REVIEW_INTERVALS.length; stage++) {
    assert.deepEqual(nextSchedule(stage, false, '2026-11-01'), { stage: 0, dueDate: '2026-11-02', status: 'active' });
  }
});

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
});
