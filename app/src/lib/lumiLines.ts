import type { Href } from 'expo-router';
import type { Leaderboard } from '../api/types';
import type { MascotMood } from '../components/mascot/Mascot';
import type { CompanionEvent, CompanionLine } from '../store/companionStore';
import { LINE_TTL_MS } from './companionRules';
import { suffix } from './turkish';

// Lumi's lines: the home hero's line, the weekly race line, and the companion's line bank.

/** "You're 2nd this week, 35 XP behind Elif" — a one-line race status. */
export function raceLine(board: Leaderboard | undefined): { title: string; detail: string } | null {
  const items = board?.items ?? [];
  const me = items.find((e) => e.isMe);
  if (!me || items.length < 2) return null;
  if (me.rank === 1) {
    const second = items.find((e) => !e.isMe);
    const lead = second ? me.xp - second.xp : 0;
    return { title: 'Bu hafta 1. sıradasın', detail: lead > 0 ? `${second!.displayName} ${lead} XP geride.` : 'Zirvede başa baş gidiyorsunuz.' };
  }
  const ahead = items.filter((e) => e.xp > me.xp).at(-1);
  return {
    title: `Bu hafta ${me.rank}. sıradasın`,
    detail: ahead ? `${suffix(ahead.displayName, 'acc')} geçmek için ${ahead.xp - me.xp + 1} XP.` : '',
  };
}

/** What Lumi says (and how it looks) on the home screen, from the most useful next step down. */
export function lumiLine(o: {
  phase: 'idle' | 'focus' | 'break';
  due?: number;
  streak: number;
  streakToday: boolean;
  hour: number;
  /** All of today's rings are closed. */
  ringsClosed: boolean;
}): { mood: MascotMood; title: string; body: string } {
  if (o.phase === 'focus') return { mood: 'focus', title: 'Odaktasın.', body: 'Bitince haber veririm, molayı ben başlatırım.' };
  if (o.phase === 'break') return { mood: 'break', title: 'Mola zamanı.', body: 'Biraz su iç, gözlerini dinlendir.' };
  if (o.ringsClosed) return { mood: 'celebrate', title: 'Bugünün halkası tamam!', body: 'Üç hedef de kapandı. Gerisi bonus; istersen bir soru daha.' };
  if (o.hour >= 0 && o.hour < 5) return { mood: 'sleepy', title: 'Geç oldu…', body: 'Uykusuz beyin unutkan olur. Yarın taze kafayla devam edelim.' };
  if (o.due) return { mood: 'reading', title: `Bugün ${o.due} soru tekrar bekliyor.`, body: 'Unutmadan önce bir bakalım; birkaç dakika sürer.' };
  if (o.streak > 0 && !o.streakToday) return { mood: 'cheer', title: `Serin ${o.streak} gün!`, body: 'Bugün bir pomodoro ya da tekrar seriyi korur.' };
  if (o.streakToday) return { mood: 'proud', title: 'Bugünlük harikasın.', body: 'Takıldığın bir soru olursa çek, birlikte bakalım.' };
  return { mood: 'wave', title: 'Merhaba, ben Lumi!', body: 'Takıldığın soruyu çek: önce ipucu veririm, istersen tam çözümü.' };
}

/** The home hero's line (the name the design spec uses for `lumiLine`). */
export const homeLine = lumiLine;

// ---------------------------------------------------------------------------------------
// The companion's line bank (design spec 6.6). Each line is data: when it applies, its mood,
// its text, an optional action and an optional highlight target. Placeholders are phrased so
// they need no Turkish case suffix. `companionRules` decides whether a line may show now.
// ---------------------------------------------------------------------------------------

/** What the companion knows when it picks a line; cheap, warm sources only (useCompanionContext). */
export interface LineContext {
  now: number;
  hour: number;
  /** Minutes after midnight. */
  minute: number;
  /** 0 = Sunday. */
  weekday: number;
  pathname: string;
  /** Display name for name lines; null for the demo user ("Sen") or when unknown. */
  name: string | null;
  /** Reviews due today (null while loading). */
  due: number | null;
  /** Rough minutes for today's reviews. */
  dueMinutes: number;
  /** The review that has waited longest. */
  oldest: { topic: string; days: number } | null;
  reviewsDoneToday: number;
  streak: number;
  longest: number;
  streakToday: boolean;
  /** XP left to the next level (null while loading). */
  xpToNext: number | null;
  focusMinutes: number;
  focusGoal: number;
  solvedToday: number;
  solvedGoal: number;
  timer: { phase: 'idle' | 'focus' | 'break'; remainingMin: number; pausedMin: number | null };
  daysToYks: number | null;
  /** Only on /exams. */
  exams: { count: number; lastDaysAgo: number | null; thisWeek: boolean } | null;
  /** The next rival up the weekly board (only on Home and /leaderboard). */
  rival: { name: string; xp: number } | null;
  /** A badge one step away (only on /profile). */
  badgeNear: { id: string; name: string; left: string } | null;
  /** The first app open today. */
  firstOpenToday: boolean;
  /** Days since the last visit (0 = earlier today). */
  awayDays: number;
  /** Hours since the last visit. */
  awayHours: number;
  /** The intro has never been shown. */
  firstRun: boolean;
}

/** Actions a line can carry beyond plain navigation; the companion wires them. */
export type LineRun = 'startBreak' | 'startFocus' | 'resumeTimer' | 'snooze' | 'stay';

export interface LineDef {
  id: string;
  /** What triggers it: the clock or a screen (unsolicited), an event, or a tap. */
  kind: 'time' | 'route' | 'event' | 'tap';
  priority: 'event' | 'time' | 'route';
  mood: MascotMood;
  text: (c: LineContext) => string;
  when?: (c: LineContext) => boolean;
  /** Screens where an unsolicited line may show (default: Home). */
  routes?: string[];
  action?: (c: LineContext) => { label: string; href?: Href; run?: LineRun } | undefined;
  /** A Highlight id Lumi flies to and marks. */
  target?: string | ((c: LineContext) => string | undefined);
  /** May show more than once a day. */
  repeats?: boolean;
  /** The day's highlight flight (at most one a day, plus countdown milestones). */
  signature?: boolean;
}

const between = (c: LineContext, from: number, to: number) => c.minute >= from * 60 && c.minute < to * 60;
const a = (label: string, href?: Href, run?: LineRun) => () => ({ label, href, run });
const COUNTDOWN_MILESTONES = [200, 150, 100, 50, 30, 7];

/** Every line Lumi can say, by trigger family. Order is priority within a tier. */
export const LINE_BANK: LineDef[] = [
  // Returning user and first run (time tier, Home).
  { id: 'return.firstRun', kind: 'time', priority: 'time', mood: 'wave', when: (c) => c.firstRun,
    text: () => 'Selam, ben Lumi. Şeridin yanında duruyorum. Bana dokunursan konuşuruz.' },
  // The signature flight: the first open of the day.
  { id: 'due.morning', kind: 'time', priority: 'time', mood: 'wave', signature: true, target: 'home.tekrar',
    when: (c) => c.firstOpenToday && (c.due ?? 0) > 0,
    text: (c) => `Günaydın. ${c.due} soru tekrar bekliyor, hepsi yaklaşık ${c.dueMinutes} dakika.`,
    action: a('Tekrara başla', '/review-session') },
  { id: 'streak.risk', kind: 'time', priority: 'time', mood: 'cheer', signature: true, target: 'home.seri',
    when: (c) => c.hour >= 20 && c.streak > 0 && !c.streakToday,
    text: (c) => `Serin ${c.streak} günde. Bugün tek bir pomodoro seriyi korur.`, action: a('Sayacı aç', '/timer') },
  { id: 'idle.countdown', kind: 'time', priority: 'time', mood: 'proud', signature: true, target: 'home.countdown',
    when: (c) => c.daysToYks !== null && COUNTDOWN_MILESTONES.includes(c.daysToYks),
    text: (c) => `YKS'ye ${c.daysToYks} gün. Her gün biraz daha net.` },
  { id: 'return.week', kind: 'time', priority: 'time', mood: 'wave', when: (c) => c.firstOpenToday && c.awayDays >= 7,
    text: () => 'Hoş geldin. Liste birikti ama dert değil; bugün sadece beş soru.', action: a('Tekrara başla', '/review-session') },
  { id: 'return.days', kind: 'time', priority: 'time', mood: 'love', when: (c) => c.firstOpenToday && c.awayDays >= 2 && c.awayDays <= 6,
    text: (c) => `Seni özledim! ${c.awayDays} gündür yoktun. Küçük bir tekrarla ısınalım mı?`, action: a('Tekrara başla', '/review-session') },
  { id: 'streak.lost', kind: 'time', priority: 'time', mood: 'love', when: (c) => c.firstOpenToday && c.streak === 0 && c.longest >= 3,
    text: (c) => `Seri sıfırlandı, olur. En uzun serin ${c.longest} gün; yenisine bugün başlıyoruz.`, action: a('Tekrara başla', '/review-session') },
  { id: 'return.sameDay', kind: 'time', priority: 'time', mood: 'wave',
    when: (c) => !c.firstOpenToday && c.awayDays === 0 && c.awayHours >= 3 && (c.due ?? 0) > 0,
    text: (c) => `Tekrar hoş geldin. Bugünkü listede ${c.due} soru kaldı.`, action: a('Tekrara başla', '/review-session') },
  { id: 'tod.morning', kind: 'time', priority: 'time', mood: 'wave', target: 'home.solve',
    when: (c) => between(c, 6, 11) && c.firstOpenToday && c.due === 0,
    text: () => 'Günaydın. Bugün küçük bir hedefle başlayalım: tek bir soru.', action: a('Fotoğraf çek', '/camera') },
  { id: 'tod.weekend', kind: 'time', priority: 'time', mood: 'reading',
    when: (c) => (c.weekday === 0 || c.weekday === 6) && between(c, 9, 13) && c.exams !== null && !c.exams.thisWeek,
    routes: ['/', '/exams'], text: () => 'Hafta sonu sabahı deneme için en sessiz zaman.', action: a('Deneme ekle', '/exam/new') },
  { id: 'tod.noon', kind: 'time', priority: 'time', mood: 'happy',
    when: (c) => between(c, 12, 14) && c.reviewsDoneToday === 0 && c.solvedToday === 0 && c.focusMinutes === 0,
    text: () => 'Öğle arası mı? Tek bir tekrar sorusu seriyi sıcak tutar.', action: a('Tekrar', '/review') },
  { id: 'tod.evening', kind: 'time', priority: 'time', mood: 'study', target: 'home.odak',
    when: (c) => between(c, 18, 22) && c.focusMinutes < c.focusGoal,
    text: (c) => `İyi akşamlar. Bugün ${c.focusMinutes} dakika odaklandın, hedefe ${c.focusGoal - c.focusMinutes} dakika kaldı.`,
    action: a('Sayacı aç', '/timer') },
  { id: 'tod.late', kind: 'time', priority: 'time', mood: 'sleepy', when: (c) => c.minute >= 22 * 60 + 30,
    text: () => 'Geç oldu. Son bir tekrar yapıp uyumak yarına iyi gelir.' },
  { id: 'streak.nearRecord', kind: 'time', priority: 'time', mood: 'cheer',
    when: (c) => c.streak > 0 && c.streak === c.longest - 1 && !c.streakToday,
    text: () => 'Bugün de çalışırsan en uzun serini geçiyorsun.' },
  { id: 'streak.week', kind: 'time', priority: 'time', mood: 'celebrate', when: (c) => c.streak === 7 && c.streakToday,
    text: () => 'Tam bir hafta! Bu artık alışkanlık.' },
  { id: 'streak.record', kind: 'time', priority: 'time', mood: 'proud', target: 'home.seri',
    when: (c) => c.streakToday && c.streak > 1 && c.streak >= c.longest,
    text: (c) => `Yeni rekor: ${c.streak} gün üst üste.` },
  { id: 'due.many', kind: 'time', priority: 'time', mood: 'thinking', when: (c) => (c.due ?? 0) >= 15, routes: ['/', '/review'],
    text: (c) => `Liste biraz kabarmış: ${c.due} soru. Bugün ilk beşi yeter, gerisi yarına.`, action: a('Tekrara başla', '/review-session') },
  { id: 'idle.levelNear', kind: 'time', priority: 'time', mood: 'happy', target: 'home.xp',
    when: (c) => c.xpToNext !== null && c.xpToNext > 0 && c.xpToNext <= 20,
    text: (c) => `Bir sonraki seviyeye ${c.xpToNext} XP kaldı. Bir tekrar sorusu yetiyor.` },
  { id: 'idle.league', kind: 'time', priority: 'time', mood: 'wink', target: (c) => (c.pathname === '/' ? 'home.lig' : undefined),
    when: (c) => !!c.rival && c.rival.xp <= 60, routes: ['/', '/leaderboard'],
    text: (c) => `Sıradaki rakibin ${c.rival!.name}. Aradaki fark ${c.rival!.xp} XP, üç soru yetiyor.`, action: a('Fotoğraf çek', '/camera') },

  // Route lines (after a 4 s dwell on that screen).
  { id: 'due.oldest', kind: 'route', priority: 'route', mood: 'reading', routes: ['/review'], target: 'review.count',
    when: (c) => (c.due ?? 0) > 0 && !!c.oldest && c.oldest.days >= 2,
    text: (c) => `${c.oldest!.topic} ${c.oldest!.days} gündür sırada. Ondan başlarsan liste hızlı erir.` },
  { id: 'due.none', kind: 'route', priority: 'route', mood: 'proud', routes: ['/review'], when: (c) => c.due === 0,
    text: () => 'Bugünlük tekrar yok. Yeni bir soru çözersen listeye eklerim.', action: a('Fotoğraf çek', '/camera') },
  { id: 'idle.solve', kind: 'route', priority: 'route', mood: 'wave', routes: ['/solve'], when: (c) => c.solvedToday === 0,
    text: () => 'Takıldığın bir soru varsa çek. Önce küçük bir ipucu veririm.' },
  { id: 'idle.noExams', kind: 'route', priority: 'route', mood: 'reading', routes: ['/exams'], when: (c) => c.exams?.count === 0,
    text: () => 'Henüz deneme yok. Karnenin fotoğrafını çekersen netleri ben çıkarırım.', action: a('Karne fotoğrafı', '/exam/new') },
  { id: 'idle.examGap', kind: 'route', priority: 'route', mood: 'reading', routes: ['/exams'],
    when: (c) => (c.exams?.lastDaysAgo ?? 0) >= 7,
    text: (c) => `Son denemenin üstünden ${c.exams!.lastDaysAgo} gün geçti. Bu hafta bir TYT çözelim mi?`, action: a('Deneme ekle', '/exam/new') },
  { id: 'idle.badgeNear', kind: 'route', priority: 'route', mood: 'proud', routes: ['/profile'], when: (c) => !!c.badgeNear,
    target: (c) => (c.badgeNear ? `profile.badge.${c.badgeNear.id}` : undefined),
    text: (c) => `${c.badgeNear!.name} rozetine ${c.badgeNear!.left} kaldı.` },
  { id: 'timer.paused', kind: 'route', priority: 'route', mood: 'thinking', routes: ['/', '/solve', '/review', '/exams', '/profile', '/timer'],
    when: (c) => (c.timer.pausedMin ?? 0) >= 10,
    text: (c) => `Sayaç ${c.timer.pausedMin} dakikadır duraklatılmış. Devam edelim mi?`, action: a('Devam et', undefined, 'resumeTimer') },

  // Event lines (the student caused them; they show even at the Sessiz level, as a note).
  { id: 'due.cleared', kind: 'event', priority: 'event', mood: 'celebrate', text: () => 'Bugünün tekrarları bitti. Yanlış olanlar yarın yine gelecek.' },
  { id: 'due.ladder', kind: 'event', priority: 'event', mood: 'proud', text: () => 'Bu soru 30 günlük basamağa çıktı. Artık seninle.' },
  { id: 'solve.three', kind: 'event', priority: 'event', mood: 'celebrate', text: () => 'Üç doğru üst üste. Böyle devam!' },
  { id: 'solve.wrongTwo', kind: 'event', priority: 'event', mood: 'cheer', text: () => 'Bugün iki soru zorladı. İkisi de tekrar listende, birlikte toparlarız.' },
  { id: 'solve.hint', kind: 'event', priority: 'event', mood: 'wink', text: () => 'İpucuyla buldun, bu da sayılır. Yarın ipucusuz deneriz.' },
  { id: 'solve.wrong', kind: 'event', priority: 'event', mood: 'love', text: () => 'Olur böyle. O soru yarın tekrar karşına çıkacak, o zaman daha net olacak.' },
  { id: 'solve.first', kind: 'event', priority: 'event', mood: 'happy',
    text: (c) => (c.solvedGoal - c.solvedToday > 0 ? `Günün ilk sorusu tamam. Soru hedefine ${c.solvedGoal - c.solvedToday} kaldı.` : 'Günün ilk sorusu tamam.') },
  { id: 'exam.up', kind: 'event', priority: 'event', mood: 'proud', text: () => '' },
  { id: 'exam.down', kind: 'event', priority: 'event', mood: 'thinking', text: () => '', action: a('Analize bak', '/exams') },
  { id: 'goals.done', kind: 'event', priority: 'event', mood: 'celebrate', text: () => 'Bugünün optiği tamam. Gerisi bonus.' },
  { id: 'timer.focusDone', kind: 'event', priority: 'event', mood: 'break', repeats: true, text: () => '', action: a('Molayı başlat', undefined, 'startBreak') },
  { id: 'timer.second', kind: 'event', priority: 'event', mood: 'proud', text: () => 'Bugün ikinci pomodoro. Odak hedefine az kaldı.', action: a('Molayı başlat', undefined, 'startBreak') },
  { id: 'timer.breakDone', kind: 'event', priority: 'event', mood: 'wave', repeats: true, text: () => 'Mola bitti. Bir tur daha?', action: a('Odağı başlat', undefined, 'startFocus') },

  // Tap responses.
  { id: 'snooze.ask', kind: 'tap', priority: 'event', mood: 'thinking', repeats: true, text: () => 'Bugün sessiz kalayım mı?' },
  { id: 'snooze.ok', kind: 'tap', priority: 'event', mood: 'sleepy', repeats: true, text: () => 'Tamam, yarın görüşürüz. Beni buradan çağırabilirsin.' },
  { id: 'timer.tap', kind: 'tap', priority: 'event', mood: 'focus', repeats: true, text: (c) => `Odaktayız. ${c.timer.remainingMin} dakika kaldı.` },
  { id: 'tap.sleeping', kind: 'tap', priority: 'event', mood: 'surprised', repeats: true, text: () => 'Uyanığım, uyanığım!' },
  { id: 'tod.night', kind: 'tap', priority: 'event', mood: 'sleepy', repeats: true, text: () => 'Uyku da çalışmanın parçası. Yarın kaldığımız yerden devam ederiz.' },
  { id: 'tap.sad', kind: 'tap', priority: 'event', mood: 'love', repeats: true, text: () => 'Buradayım, birlikte bakarız.' },
  { id: 'tip.camera', kind: 'tap', priority: 'event', mood: 'wink', text: () => "Çöz'e basılı tutarsan kamera hemen açılır." },
  { id: 'tip.quiet', kind: 'tap', priority: 'event', mood: 'wink', text: () => 'Bana basılı tutarsan bugün sessiz kalırım.' },
  { id: 'tip.ladder', kind: 'tap', priority: 'event', mood: 'reading', text: () => 'Tekrar listesindeki her doğru, soruyu bir basamak yukarı taşır.' },
  { id: 'tap.default', kind: 'tap', priority: 'event', mood: 'happy', repeats: true, text: () => 'Bir şey mi soracaksın?', action: a("Lumi'ye sor", '/assistant') },
];

const byId = new Map(LINE_BANK.map((l) => [l.id, l]));

/** A line from the bank by id. */
export function lineDef(id: string): LineDef | undefined {
  return byId.get(id);
}

/** The tips a tap rotates through, in order. */
export const TAP_TIPS = ['tip.camera', 'tip.quiet', 'tip.ladder'] as const;

/** The Highlight id a line flies to here, if any. */
export function lineTarget(def: LineDef, c: LineContext): string | undefined {
  return typeof def.target === 'function' ? def.target(c) : def.target;
}

/** Resolves a line definition against the context (text, action, target), ready for `say`. */
export function resolveLine(
  def: LineDef,
  c: LineContext,
  source: CompanionLine['source'],
  run: (r: LineRun) => (() => void) | undefined,
  text?: string,
): CompanionLine {
  const act = def.action?.(c);
  const target = lineTarget(def, c);
  return {
    id: def.id,
    mood: def.mood,
    text: text ?? def.text(c),
    priority: def.priority,
    source,
    target,
    action: act ? { label: act.label, href: act.href, onPress: act.run ? run(act.run) : undefined } : undefined,
    expiresAt: c.now + LINE_TTL_MS,
  };
}

/**
 * The first unsolicited line that applies here, by tier (time before route) and bank order,
 * skipping ids already shown today. `signatureOnly` asks only for the day's flight lines;
 * `ready` can hold back a line that applies but cannot be said well right now.
 */
export function pickUnsolicited(
  c: LineContext,
  fresh: (def: LineDef) => boolean,
  opts: { signatureOnly?: boolean; ready?: (def: LineDef) => boolean } = {},
): LineDef | null {
  const tiers: LineDef['kind'][] = ['time', 'route'];
  for (const kind of tiers) {
    for (const def of LINE_BANK) {
      if (def.kind !== kind) continue;
      if (opts.signatureOnly && !def.signature) continue;
      const routes = def.routes ?? (kind === 'time' ? ['/'] : []);
      if (!routes.includes(c.pathname)) continue;
      if (!fresh(def)) continue;
      if (def.when && !def.when(c)) continue;
      if (opts.ready && !opts.ready(def)) continue;
      return def;
    }
  }
  return null;
}

/** Per-session answer counters for the "after solving" lines. */
export interface AnswerTally {
  correctRun: number;
  wrong: number;
  wrongShown: boolean;
  firstToday: boolean;
}

/**
 * The line an event earns, with its text filled in. Verdict lines are ordered by how much
 * they say (three in a row, two wrong, a hint, a wrong one, the first of the day).
 */
export function eventLineId(e: CompanionEvent, tally: AnswerTally): { id: string; text?: (c: LineContext) => string } | null {
  switch (e.type) {
    case 'pomodoro.focusDone':
      if (e.pomodorosToday === 2) return { id: 'timer.second' };
      // Offline, the XP is not known yet: the line leaves it out rather than say +0.
      return {
        id: 'timer.focusDone',
        text: () => `${e.minutes} dakika tamam${e.xp > 0 ? `, +${e.xp} XP` : ''}. Şimdi ${e.breakMinutes} dakika mola: su iç, gözlerini dinlendir.`,
      };
    case 'pomodoro.breakDone':
      return { id: 'timer.breakDone' };
    case 'review.sessionDone':
      return e.remaining === 0 ? { id: 'due.cleared' } : null;
    case 'exam.saved': {
      if (e.prevNet === null || e.net === e.prevNet) return null;
      const delta = Math.round((e.net - e.prevNet) * 100) / 100;
      if (delta > 0) {
        const tail = e.topSubject ? ` En büyük artış: ${e.topSubject}.` : '';
        return { id: 'exam.up', text: () => `Önceki denemene göre +${String(delta).replace('.', ',')} net.${tail}` };
      }
      const tail = e.weakTopic ? ` En çok net kaybı: ${e.weakTopic}. Oraya bakalım mı?` : ' Oraya bakalım mı?';
      return { id: 'exam.down', text: () => `Bu deneme biraz düşük geldi.${tail}` };
    }
    case 'goals.allDone':
      return { id: 'goals.done' };
    case 'answer.verdict': {
      if (e.result === 'correct' && tally.correctRun >= 3) return { id: 'solve.three' };
      if (e.result === 'wrong' && tally.wrong >= 2) return { id: 'solve.wrongTwo' };
      if (e.result === 'correct' && e.hintsUsed > 0) return { id: 'solve.hint' };
      if (e.result === 'wrong' && !tally.wrongShown) return { id: 'solve.wrong' };
      if (tally.firstToday) return { id: 'solve.first' };
      return null;
    }
    default:
      return null;
  }
}
