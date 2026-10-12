import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeKarne } from './claude/karne';
import { weekStart } from './stats';

const base = { exam: 'AYT' as const, name: ' Örnek AYT ', date: '2026-10-05', notes: '', confidence: 0.8 };

test('karne output is fitted to the exam sections with warnings', () => {
  const draft = normalizeKarne({
    ...base,
    sections: [
      // Sub-totals printed separately get added up.
      { subject: 'Matematik', correct: 20, wrong: 5, blank: 10, topics: [] },
      { subject: 'Matematik', correct: 3, wrong: 0, blank: 2, topics: [] },
      // Blank doesn't add up to 14 → corrected.
      { subject: 'Fizik', correct: 6, wrong: 2, blank: 0, topics: [
        { topicId: 'ayt-fiz-newton', correct: 1, wrong: 1, blank: 0 },
        { topicId: 'ayt-fiz-newton', correct: 0, wrong: 1, blank: 0 },
        { topicId: 'ayt-kim-gazlar', correct: 1, wrong: 0, blank: 0 }, // wrong subject → dropped
      ] },
      // Kimya missing entirely; Biyoloji over the limit.
      { subject: 'Biyoloji', correct: 10, wrong: 5, blank: 0, topics: [] },
      // A TYT section on an AYT sheet is ignored.
      { subject: 'Türkçe', correct: 30, wrong: 5, blank: 5, topics: [] },
    ],
  });

  assert.equal(draft.name, 'Örnek AYT');
  assert.deepEqual(
    draft.sections.map((s) => [s.subject, s.correct, s.wrong, s.blank]),
    [
      ['Matematik', 23, 5, 12],
      ['Fizik', 6, 2, 6],
      ['Kimya', 0, 0, 13],
      ['Biyoloji', 10, 5, 0],
    ],
  );
  assert.deepEqual(draft.sections[1]!.topics, [{ topicId: 'ayt-fiz-newton', correct: 1, wrong: 2, blank: 0 }]);
  assert.equal(draft.warnings.length, 3); // Fizik blank fixed, Kimya missing, Biyoloji over
});

test('unreadable dates become null', () => {
  assert.equal(normalizeKarne({ ...base, date: '05.10.2026', sections: [] }).date, null);
});

test('weeks start on Monday', () => {
  assert.equal(weekStart('2026-10-12'), '2026-10-12'); // Monday
  assert.equal(weekStart('2026-10-18'), '2026-10-12'); // Sunday
  assert.equal(weekStart('2026-10-19'), '2026-10-19');
});
