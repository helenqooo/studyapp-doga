// Turkish suffixes after a name: "Can'ı", "Elif'e", "Doğa'yı", "Ufuk'tan". Vowel harmony
// follows the name's last vowel; a name ending in a vowel takes a buffer letter, and the
// ablative hardens after a voiceless consonant (fıstıkçı şahap).

type Case = 'acc' | 'dat' | 'gen' | 'abl';

const BACK = 'aıou';
const FRONT = 'eiöü';
const VOWELS = BACK + FRONT;
const HARD = 'fstkçşhp';

/** The name with its suffix, e.g. suffix('Can', 'acc') → "Can'ı". */
export function suffix(name: string, kind: Case): string {
  const lower = name.trim().toLocaleLowerCase('tr');
  const vowels = [...lower].filter((ch) => VOWELS.includes(ch));
  const last = vowels.at(-1) ?? 'e';
  const end = lower.at(-1) ?? '';
  const endsInVowel = VOWELS.includes(end);
  const back = BACK.includes(last);
  // Four-way vowel for accusative and genitive: ı i u ü.
  const four = { a: 'ı', ı: 'ı', o: 'u', u: 'u', e: 'i', i: 'i', ö: 'ü', ü: 'ü' }[last] ?? 'i';
  const two = back ? 'a' : 'e';
  let s: string;
  switch (kind) {
    case 'acc':
      s = (endsInVowel ? 'y' : '') + four;
      break;
    case 'gen':
      s = (endsInVowel ? 'n' : '') + four + 'n';
      break;
    case 'dat':
      s = (endsInVowel ? 'y' : '') + two;
      break;
    case 'abl':
      s = (HARD.includes(end) ? 't' : 'd') + two + 'n';
      break;
  }
  return `${name.trim()}'${s}`;
}
