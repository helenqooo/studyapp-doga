import type { AttemptResult, Question } from '../api/types';

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

export function answerMarkdown(q: Question): string {
  return `> **Cevap:** ${q.finalAnswer}`;
}

export function solutionMarkdown(q: Question): string {
  const steps = q.solutionSteps.map((s, i) => `**${i + 1}.** ${s}`).join('\n\n');
  return `${steps}\n\n${answerMarkdown(q)}`;
}
