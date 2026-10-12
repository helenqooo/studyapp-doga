const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const MONTHS_LONG = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

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

/** "12 Ekim 2026" from "YYYY-MM-DD". */
export function longDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${d} ${MONTHS_LONG[m! - 1]} ${y}`;
}

/** Shifts a "YYYY-MM-DD" date by whole days. */
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y!, m! - 1, d! + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Turkish-style net: "32,75", "28", "−1,25". */
export function formatNet(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  const text = Math.abs(rounded).toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
  return rounded < 0 ? `−${text}` : text;
}

/** Signed difference for deltas: "+2,5", "−1", "0". */
export function formatDelta(n: number): string {
  if (Math.abs(n) < 0.005) return '0';
  return n > 0 ? `+${formatNet(n)}` : formatNet(n);
}
