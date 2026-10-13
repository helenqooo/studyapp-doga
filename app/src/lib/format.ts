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

const SUP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', x: 'ˣ', i: 'ⁱ', y: 'ʸ', a: 'ᵃ', b: 'ᵇ', k: 'ᵏ', m: 'ᵐ', t: 'ᵗ',
};
const SUB: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋', n: 'ₙ', x: 'ₓ', i: 'ᵢ',
};
const SYMBOLS: Record<string, string> = {
  cdot: '·', times: '×', div: '÷', pi: 'π', le: '≤', leq: '≤', ge: '≥', geq: '≥', neq: '≠', ne: '≠', infty: '∞',
  Rightarrow: '⇒', rightarrow: '→', to: '→', alpha: 'α', beta: 'β', theta: 'θ', Delta: 'Δ', degree: '°', circ: '°', pm: '±',
};

/** The group starting at `i` ("{…}" with nested braces, or one character) and where it ends. */
function group(src: string, i: number): [string, number] {
  if (src[i] !== '{') return [src[i] ?? '', i + 1];
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) return [src.slice(i + 1, j), j + 1];
  }
  return [src.slice(i + 1), src.length];
}

const script = (text: string, map: Record<string, string>, mark: string) => {
  const plain = latexToText(text).replace(/\s+/g, '');
  const mapped = [...plain].map((ch) => map[ch]);
  return mapped.every(Boolean) ? mapped.join('') : `${mark}(${plain})`;
};

/** LaTeX → readable plain text: fractions, powers, roots and common symbols. */
function latexToText(src: string): string {
  let out = '';
  for (let i = 0; i < src.length; ) {
    const ch = src[i]!;
    if (ch === '\\') {
      const name = /^[a-zA-Z]+/.exec(src.slice(i + 1))?.[0] ?? '';
      i += 1 + name.length;
      if (name === 'frac' || name === 'dfrac' || name === 'tfrac') {
        const [a, j] = group(src, i);
        const [b, k] = group(src, j);
        // Parentheses only around compound parts: 5/18, (x+1)/(x-1).
        const wrap = (t: string) => (/^[\p{L}\p{N}.,]+$/u.test(t) ? t : `(${t})`);
        out += `${wrap(latexToText(a))}/${wrap(latexToText(b))}`;
        i = k;
      } else if (name === 'sqrt') {
        const [a, j] = group(src, i);
        const t = latexToText(a);
        out += /^[\p{L}\p{N}.,]+$/u.test(t) ? `√${t}` : `√(${t})`;
        i = j;
      } else if (name in SYMBOLS) {
        out += SYMBOLS[name];
      } else if (!name) {
        out += src[i] ?? '';
        i += 1;
      }
      continue;
    }
    if (ch === '^' || ch === '_') {
      const [a, j] = group(src, i + 1);
      out += script(a, ch === '^' ? SUP : SUB, ch);
      i = j;
      continue;
    }
    if (ch === '{' || ch === '}') {
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** One-line plain-text preview of markdown + LaTeX: "3ˣ⁺² + 3ˣ⁺¹ ifadesinin değeri…". */
export function plainSnippet(markdown: string, max = 140): string {
  const text = String(markdown)
    .replace(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g, (_, a, b) => latexToText(a ?? b))
    .replace(/[*_#>`]/g, '')
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

const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

/** Turkish capitals: "i" → "İ", "ı" → "I" (toUpperCase alone gives "I" for both). */
export function upperTr(text: string): string {
  return text.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
}

/** "12 Ekim Pazartesi" from "YYYY-MM-DD". */
export function dayTitle(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
  return `${d} ${MONTHS_LONG[m! - 1]} ${WEEKDAYS[weekday]}`;
}

/** Whole days from `from` to `to` (both "YYYY-MM-DD"). */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}
