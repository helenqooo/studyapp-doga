import type { AttemptResult, ChoiceLabel, Question } from '../api/types';

export const RESULT_LABELS: Record<AttemptResult, string> = {
  correct: 'Doğru yaptım',
  wrong: 'Yanlış yaptım',
  blank: 'Boş bıraktım',
};

export const RESULT_SHORT: Record<AttemptResult, string> = {
  correct: 'Doğru',
  wrong: 'Yanlış',
  blank: 'Boş',
};

/** The letter answers are graded against: the student's answer key, else the model's. */
export function gradingKey(q: Question): ChoiceLabel | null {
  return q.answerKey ?? q.correctChoice;
}

/** Answers are picked from the choices and graded by the app (not self-reported). */
export function isGradedChoice(q: Question): boolean {
  return !!q.choices?.length && !!gradingKey(q);
}

export function answerMarkdown(q: Question): string {
  if (q.answerKey && q.answerKey !== q.correctChoice) {
    const choice = q.choices?.find((c) => c.label === q.answerKey);
    return `> **Cevap anahtarı:** ${q.answerKey})${choice ? ` ${choice.text}` : ''}\n>\n> Çözümdeki cevap ${q.finalAnswer} idi; çözümde bir hata olabilir.`;
  }
  return `> **Cevap:** ${q.finalAnswer}`;
}

export function solutionMarkdown(q: Question): string {
  const steps = q.solutionSteps.map((s, i) => `**${i + 1}.** ${s}`).join('\n\n');
  return `${steps}\n\n${answerMarkdown(q)}`;
}
