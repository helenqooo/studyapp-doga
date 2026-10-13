import type { Leaderboard } from '../api/types';
import type { MascotMood } from '../components/mascot/Mascot';
import { suffix } from './turkish';

// Lumi's lines. For now: the home hero's line and the weekly race line, moved verbatim
// from the Home screen; the companion package grows this into the line bank.

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
