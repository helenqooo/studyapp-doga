const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Device-local calendar date as "YYYY-MM-DD". */
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!) / 86_400_000;
}

/** "12 Eki" from a "YYYY-MM-DD" date or an ISO timestamp. */
export function shortDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [, m, d] = value.split('-').map(Number);
    return `${d} ${MONTHS[m! - 1]}`;
  }
  const date = new Date(value);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** When a review is next due; overdue items are in today's queue, so they read "bugün". */
export function reviewDueLabel(dueDate: string): string {
  const diff = dayNumber(dueDate) - dayNumber(localToday());
  if (diff <= 0) return 'bugün';
  if (diff === 1) return 'yarın';
  return `${diff} gün sonra`;
}

/** One-line plain-text preview of markdown + LaTeX. */
export function plainSnippet(markdown: string, max = 140): string {
  const text = markdown
    .replace(/\$\$?/g, '')
    .replace(/\\(dfrac|frac)\{([^}]*)\}\{([^}]*)\}/g, '($2)/($3)')
    .replace(/\\cdot/g, '·')
    .replace(/\\times/g, '×')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}*_#>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
