// Multiple choice: parsing old transcriptions, grading answers on the server, answer keys.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { eq } from 'drizzle-orm';
import { choiceFromAnswer, cleanChoices, resolveChoices, splitChoices } from './choices';
import { openDb } from './db/client';
import { questions } from './db/schema';
import { createTestApp, DAY } from './testing';

test('choices are split off the end of an old transcription', () => {
  const text = 'Bir sayının 3 katı 12 ise sayı kaçtır?\n\nA) 2\nB) 3\nC) 4\nD) 5\nE) 6\n';
  assert.deepEqual(splitChoices(text), {
    stem: 'Bir sayının 3 katı 12 ise sayı kaçtır?',
    choices: [
      { label: 'A', text: '2' },
      { label: 'B', text: '3' },
      { label: 'C', text: '4' },
      { label: 'D', text: '5' },
      { label: 'E', text: '6' },
    ],
  });
  // Bold letters, dots and math.
  const fancy = splitChoices('Kaçtır?\n**A)** $\\frac{1}{2}$\nB. $1$\nC) $2$\nD) $\\sqrt{2}$');
  assert.deepEqual(fancy?.choices.map((c) => c.text), ['$\\frac{1}{2}$', '$1$', '$2$', '$\\sqrt{2}$']);
  // All on one line.
  assert.deepEqual(splitChoices('Kaçtır?\nA) 11  B) 12  C) 13  D) 14  E) 15')?.choices.map((c) => c.label), ['A', 'B', 'C', 'D', 'E']);
  // Statements in the stem ("I.", "II.") and an open question are not choices.
  assert.equal(splitChoices('I. x > 0\nII. y > 0\nHangisi doğrudur?'), null);
  assert.equal(splitChoices('$x$ kaçtır?'), null);
  // Fewer than four is not a choice block.
  assert.equal(splitChoices('Soru\nA) 1\nB) 2'), null);

  assert.equal(choiceFromAnswer('C) 13'), 'C');
  assert.equal(choiceFromAnswer('**E)** 6'), 'E');
  assert.equal(choiceFromAnswer('13'), null);
  assert.deepEqual(cleanChoices([{ label: 'b', text: '2' }, { label: 'A', text: '1' }, { label: 'C', text: '3' }, { label: 'D', text: '4' }])?.map((c) => c.label), ['A', 'B', 'C', 'D']);
  assert.equal(cleanChoices([{ label: 'A', text: '1' }, { label: 'C', text: '3' }, { label: 'D', text: '4' }, { label: 'E', text: '5' }]), null);

  const legacy = resolveChoices({ questionText: 'Kaç?\nA) 1\nB) 2\nC) 3\nD) 4', finalAnswer: 'B) 2', choices: null, correctChoice: null, answerKey: null });
  assert.deepEqual([legacy.stem, legacy.aiChoice, legacy.key], ['Kaç?', 'B', 'B']);
  const keyed = resolveChoices({ questionText: 'Kaç?', finalAnswer: 'B) 2', choices: legacy.choices, correctChoice: 'B', answerKey: 'D' });
  assert.deepEqual([keyed.aiChoice, keyed.answerKey, keyed.key], ['B', 'D', 'D']);
});

test('a picked choice is graded on the server, not by the student', async () => {
  const t = await createTestApp();
  try {
    const id = await t.solveOne();
    const q = await t.call('GET', `/questions/${id}`);
    assert.equal(q.json.questionText.includes('A) 11'), false);
    assert.deepEqual(q.json.choices.map((c: { label: string }) => c.label), ['A', 'B', 'C', 'D', 'E']);
    assert.deepEqual([q.json.correctChoice, q.json.answerKey], ['C', null]);

    // "Doğru" without the choice is refused when the answer letter is known.
    assert.equal((await t.call('POST', `/questions/${id}/attempt`, { result: 'correct' })).status, 400);
    assert.equal((await t.call('POST', `/questions/${id}/attempt`, { choice: 'F' })).status, 400);
    // The client's own result is ignored: B is wrong whatever it claims.
    const res = await t.call('POST', `/questions/${id}/attempt`, { choice: 'B', result: 'correct', hintsUsed: 1 });
    assert.equal(res.status, 201);
    assert.deepEqual([res.json.attempt.result, res.json.attempt.userAnswer], ['wrong', 'B']);
    assert.equal((await t.call('GET', `/questions/${id}`)).json.review.stage, 0);

    // A blank needs no choice.
    const other = await t.solveOne();
    const blank = await t.call('POST', `/questions/${other}/attempt`, { result: 'blank' });
    assert.equal(blank.json.attempt.result, 'blank');

    // In review: the right choice moves up, the wrong one starts over, "bilmiyorum" is wrong.
    t.clock.now += DAY;
    const right = await t.call('POST', `/reviews/${id}/result`, { choice: 'C' });
    assert.deepEqual([right.json.attempt.result, right.json.attempt.userAnswer, right.json.xpGained], ['correct', 'C', 15]);
    const unknown = await t.call('POST', `/reviews/${other}/result`, { result: 'wrong' });
    assert.equal(unknown.json.attempt.result, 'wrong');
  } finally {
    await t.close();
  }
});

test('an answer key overrides the model and re-grades the first answer', async () => {
  const t = await createTestApp();
  try {
    const id = await t.solveOne();
    await t.call('POST', `/questions/${id}/attempt`, { choice: 'B' });
    let q = (await t.call('GET', `/questions/${id}`)).json;
    assert.equal(q.attempts[0].result, 'wrong');
    assert.ok(q.review);

    // The answer key says B: the first answer was right after all and leaves the queue.
    const set = await t.call('PUT', `/questions/${id}/answer-key`, { answerKey: 'B' });
    assert.equal(set.status, 200);
    assert.deepEqual([set.json.answerKey, set.json.correctChoice, set.json.attempts[0].result, set.json.review], ['B', 'C', 'correct', null]);

    // Clearing it puts the model's letter back: wrong again, back in the queue.
    q = (await t.call('PUT', `/questions/${id}/answer-key`, { answerKey: null })).json;
    assert.deepEqual([q.answerKey, q.attempts[0].result, q.review?.stage], [null, 'wrong', 0]);

    assert.equal((await t.call('PUT', `/questions/${id}/answer-key`, { answerKey: 'Z' })).status, 400);
    // Later answers are graded against the key.
    await t.call('PUT', `/questions/${id}/answer-key`, { answerKey: 'E' });
    t.clock.now += DAY;
    const review = await t.call('POST', `/reviews/${id}/result`, { choice: 'E' });
    assert.equal(review.json.attempt.result, 'correct');
  } finally {
    await t.close();
  }
});

test('questions saved before choices were stored get them from the text', async () => {
  const t = await createTestApp();
  try {
    const id = await t.solveOne();
    // Make it look like an old row: choices inside the text, no letters stored.
    const db = openDb(`${t.dataDir}/derece.db`);
    db.update(questions)
      .set({ questionText: 'Kaç?\n\nA) 11\nB) 12\nC) 13\nD) 14\nE) 15', choices: null, correctChoice: null, finalAnswer: 'C) 13' })
      .where(eq(questions.id, id))
      .run();
    const q = (await t.call('GET', `/questions/${id}`)).json;
    assert.deepEqual([q.questionText, q.choices.length, q.correctChoice], ['Kaç?', 5, 'C']);
    const res = await t.call('POST', `/questions/${id}/attempt`, { choice: 'C' });
    assert.equal(res.json.attempt.result, 'correct');
  } finally {
    await t.close();
  }
});
