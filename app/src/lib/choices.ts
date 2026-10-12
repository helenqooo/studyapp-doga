// Multiple-choice answers: a copy of server/src/choices.ts (keep them in sync), used by
// demo mode to split old-style transcriptions and grade answers like the server does.

export const CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;
export type ChoiceLabel = (typeof CHOICE_LABELS)[number];

export interface Choice {
  label: ChoiceLabel;
  text: string;
}

export const isChoiceLabel = (v: unknown): v is ChoiceLabel =>
  typeof v === 'string' && (CHOICE_LABELS as readonly string[]).includes(v);

// "A) 12", "A. 12", "**A)** 12", "A) $\frac{1}{2}$"
const LINE_RE = /^\s*(?:\*\*)?\(?([A-E])\s*[).](?:\*\*)?\s*(.*)$/;
// Several choices on one line: "A) 11  B) 12  C) 13"
const INLINE_RE = /(?:^|\s)\(?([A-E])\)\s*/g;

/** The choices in order A, B, C…, or null unless at least 4 consecutive ones from A. */
function consecutive(found: Choice[]): Choice[] | null {
  for (let i = 0; i < found.length; i++) {
    if (found[i]!.label !== CHOICE_LABELS[i]) return null;
  }
  return found.length >= 4 ? found : null;
}

function inlineChoices(line: string): Choice[] | null {
  const marks = [...line.matchAll(INLINE_RE)];
  if (marks.length < 4) return null;
  const found: Choice[] = marks.map((m, i) => {
    const start = m.index! + m[0].length;
    const end = i + 1 < marks.length ? marks[i + 1]!.index! : line.length;
    return { label: m[1] as ChoiceLabel, text: line.slice(start, end).trim() };
  });
  return consecutive(found);
}

/**
 * Splits trailing answer choices off a transcribed question. Returns the stem and the
 * choices, or null when the text has no recognisable A–D/E block at its end.
 */
export function splitChoices(text: string): { stem: string; choices: Choice[] } | null {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let end = lines.length;
  while (end > 0 && !lines[end - 1]!.trim()) end--;
  if (!end) return null;

  // One line per choice, at the end of the text.
  const found: Choice[] = [];
  let start = end;
  for (let i = end - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (!line.trim()) continue;
    const m = LINE_RE.exec(line);
    if (!m) break;
    found.unshift({ label: m[1] as ChoiceLabel, text: m[2]!.trim() });
    start = i;
    if (m[1] === 'A') break;
  }
  let choices = consecutive(found);

  // Or all of them on the last line.
  if (!choices) {
    choices = inlineChoices(lines[end - 1]!);
    start = end - 1;
  }
  if (!choices || choices.some((c) => !c.text)) return null;

  const stem = lines.slice(0, start).join('\n').trim();
  return { stem, choices };
}

/** The choice letter at the start of an answer like "C) 13" or "**C)** 13". */
export function choiceFromAnswer(answer: string): ChoiceLabel | null {
  const m = /^\s*(?:\*\*)?\(?([A-E])\s*[).]/.exec(answer);
  return m ? (m[1] as ChoiceLabel) : null;
}

/** Cleans the model's choices: known labels, in order, no duplicates, no empty text. */
export function cleanChoices(raw: { label: string; text: string }[]): Choice[] | null {
  const byLabel = new Map<ChoiceLabel, string>();
  for (const c of raw) {
    const label = c.label.trim().toUpperCase();
    const text = c.text.trim();
    if (isChoiceLabel(label) && text && !byLabel.has(label)) byLabel.set(label, text);
  }
  const ordered = CHOICE_LABELS.filter((l) => byLabel.has(l)).map((label) => ({ label, text: byLabel.get(label)! }));
  return consecutive(ordered);
}

interface ChoiceFields {
  questionText: string;
  finalAnswer: string;
  choices: Choice[] | null;
  correctChoice: ChoiceLabel | null;
  answerKey: ChoiceLabel | null;
}

/**
 * The question's stem, choices and answer letters, also for questions saved before
 * choices were stored. `key` is what answers are graded against: the student's answer
 * key if they set one, otherwise the model's letter. Null key = graded by the student.
 */
export function resolveChoices(q: ChoiceFields) {
  const split = q.choices?.length ? { stem: q.questionText, choices: q.choices } : splitChoices(q.questionText);
  if (!split) return { stem: q.questionText, choices: null, aiChoice: null, answerKey: null, key: null };
  const valid = (l: ChoiceLabel | null) => (l && split.choices.some((c) => c.label === l) ? l : null);
  // Older questions had no separate letter; it leads their final answer ("C) 13").
  const aiChoice = valid(q.choices?.length ? q.correctChoice : choiceFromAnswer(q.finalAnswer));
  const answerKey = valid(q.answerKey);
  return { stem: split.stem, choices: split.choices, aiChoice, answerKey, key: answerKey ?? aiChoice };
}

export type GradeResult = 'correct' | 'wrong' | 'blank';

/**
 * Decides an answer's result. With an answer letter to grade against, a picked choice is
 * graded here, not by the student; without one (open-ended, or the model found no
 * letter), the student's own result counts. Returns an error message for a bad request.
 */
export function gradeAnswer(
  q: ChoiceFields,
  input: { choice?: ChoiceLabel | null; result?: GradeResult },
): { result: GradeResult; choice: ChoiceLabel | null } | { error: string } {
  const mc = resolveChoices(q);
  if (input.choice) {
    if (!mc.choices?.some((c) => c.label === input.choice)) return { error: 'Bu soruda böyle bir şık yok.' };
    if (mc.key) return { result: input.choice === mc.key ? 'correct' : 'wrong', choice: input.choice };
    if (input.result) return { result: input.result, choice: input.choice };
    return { error: 'Sonucu seç: doğru mu, yanlış mı?' };
  }
  if (!input.result) return { error: 'Bir şık seç ya da boş bıraktığını işaretle.' };
  // "Doğru" has to come with the picked choice when the answer letter is known.
  if (mc.key && input.result === 'correct') return { error: 'Doğru şıkkı seçerek işaretle.' };
  return { result: input.result, choice: null };
}
