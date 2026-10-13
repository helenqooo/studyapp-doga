// Small Turkish date strings for Home (lib/format.ts is frozen).

const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const WEEKDAYS_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function parts(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return { d: d!, m: m!, weekday: new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay() };
}

/** "Salı, 13 Ekim" from "YYYY-MM-DD". */
export function dayLine(date: string): string {
  const { d, m, weekday } = parts(date);
  return `${WEEKDAYS[weekday]}, ${d} ${MONTHS[m - 1]}`;
}

/** "Pzt" … "Paz". */
export function weekdayShort(date: string): string {
  return WEEKDAYS_SHORT[parts(date).weekday]!;
}

/** Time-of-day greeting. */
export function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Günaydın';
  if (hour >= 12 && hour < 18) return 'İyi günler';
  if (hour >= 18 && hour < 23) return 'İyi akşamlar';
  return 'İyi geceler';
}
