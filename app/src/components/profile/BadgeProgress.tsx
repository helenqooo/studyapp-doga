import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useExams, useFacets, useProfile } from '../../api/hooks';
import { BADGES, badgeInfo, type BadgeInfo } from '../../data/badges';
import { shortDate } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { BadgeSeal } from '../BadgeSeal';
import { Card } from '../Card';
import { Grid } from '../Grid';
import { Highlight } from '../Highlight';
import { SectionHeader } from '../SectionHeader';

// TOKEN-PENDING: layout.badge.seal = 68 (a profile seal, its progress arc included)
const SEAL_SIZE = 68;

/** Earned badges whose foil sheen has played, per account (the sheen plays once). */
const foilKey = (userId: string) => `derece.badgeFoil.${userId}`;

/**
 * The earned ids that haven't shown their foil yet on this device. They are marked seen
 * right away, so the sheen plays once even if the profile remounts mid-sweep.
 */
function useFreshFoil(userId: string | null, earned: string[]): Set<string> {
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const ids = earned.join('|');
  useEffect(() => {
    if (!userId || !ids) return;
    let alive = true;
    (async () => {
      const raw = await AsyncStorage.getItem(foilKey(userId)).catch(() => null);
      let seen: string[] = [];
      try {
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) seen = parsed.filter((x): x is string => typeof x === 'string');
      } catch {
        seen = [];
      }
      const all = ids.split('|');
      const next = all.filter((id) => !seen.includes(id));
      if (!next.length || !alive) return;
      setFresh(new Set(next));
      AsyncStorage.setItem(foilKey(userId), JSON.stringify([...seen, ...next])).catch(() => {});
    })();
    return () => {
      alive = false;
    };
  }, [userId, ids]);
  return fresh;
}

interface Cell {
  key: string;
  info: BadgeInfo;
  earnedAt: number | null;
  /** Locked: 0..1 toward the goal, and what's left in words. */
  progress?: number;
  left?: string;
  /** `left` is a short count ("1 gün kaldı"): Lumi's `idle.badgeNear` line can fly to it. */
  counted?: boolean;
}

/** How far a locked badge is, computed from the profile, the question count and the exams. */
function lockedProgress(id: string, streak: number | null, solved: number | null, exams: number | null): Pick<Cell, 'progress' | 'left' | 'counted'> {
  const goal = (have: number, need: number, unit: string) => ({
    progress: Math.min(1, have / need),
    left: `${Math.max(0, need - have)} ${unit} kaldı`,
    counted: true,
  });
  switch (id) {
    case 'streak-7':
      return streak === null ? {} : goal(streak, 7, 'gün');
    case 'streak-30':
      return streak === null ? {} : goal(streak, 30, 'gün');
    case 'questions-100':
      return solved === null ? {} : goal(solved, 100, 'soru');
    case 'questions-500':
      return solved === null ? {} : goal(solved, 500, 'soru');
    case 'first-exam':
      return exams === null ? {} : { progress: Math.min(1, exams), left: 'İlk denemeni gir.' };
    default:
      // Topic master: no single number to count toward; the description says what to do.
      return {};
  }
}

/**
 * "Rozetler": a section header with the earned count, then the seals 3 × 2. Locked seals
 * carry a progress arc and what's left; earned ones a duotone glyph and, the first time
 * they're seen on this device, a soft foil sheen.
 */
export function BadgeProgress() {
  const theme = useTheme();
  const profile = useProfile();
  const facets = useFacets();
  const exams = useExams();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const p = profile.data;
  const earned = p?.badges ?? [];
  const earnedIds = new Set(earned.map((b) => (b.id.startsWith('topic-master:') ? 'topic-master' : b.id)));
  const masters = earned.filter((b) => b.id.startsWith('topic-master:'));
  const solved = facets.data ? facets.data.total : null;
  const examCount = exams.data ? exams.data.items.length : null;

  const cells: Cell[] = [
    ...BADGES.map((b) => {
      const own = earned.find((e) => e.id === b.id || (b.id === 'topic-master' && e.id.startsWith('topic-master:')));
      if (own) return { key: b.id, info: badgeInfo(own.id), earnedAt: own.earnedAt };
      // Until the profile loads, no counts: "7 gün kaldı" for a 6-day streak would be wrong.
      return { key: b.id, info: b, earnedAt: null, ...lockedProgress(b.id, p ? p.streak : null, solved, examCount) };
    }),
    // A second, third… topic master shows as its own seal.
    ...masters.slice(1).map((m) => ({ key: m.id, info: badgeInfo(m.id), earnedAt: m.earnedAt })),
  ];
  const fresh = useFreshFoil(userId, cells.filter((c) => c.earnedAt).map((c) => c.key));

  return (
    <View>
      <SectionHeader title="Rozetler" count={p ? `${earnedIds.size}/${BADGES.length}` : undefined} />
      <Card>
        <Grid columns={{ compact: 3, regular: 3, wide: 3 }}>
          {cells.map((c, i) => {
            const earnedNow = !!c.earnedAt;
            return (
              <View
                key={c.key}
                accessible
                accessibilityLabel={`${c.info.title}: ${earnedNow ? 'kazanıldı' : (c.left ?? c.info.description)}`}
                style={{ alignItems: 'center', gap: theme.spacing.xs, paddingVertical: theme.spacing.sm }}
              >
                <BadgeSeal
                  icon={c.info.icon}
                  tier={c.info.tier}
                  locked={!earnedNow}
                  size={SEAL_SIZE}
                  progress={earnedNow ? undefined : (c.progress ?? 0)}
                  sheen={fresh.has(c.key)}
                  sheenDelay={theme.motion.duration.slow + i * theme.motion.stagger * 2}
                />
                <AppText variant="label" weight="semibold" align="center" color={earnedNow ? 'text' : 'textMuted'}>
                  {c.info.title}
                </AppText>
                {!earnedNow && c.counted && c.left ? (
                  // The companion's `idle.badgeNear` target ("7 günlük seri rozetine 1 gün kaldı.").
                  <Highlight id={`profile.badge.${c.key}`} style={{ alignSelf: 'center' }}>
                    <AppText variant="caption" color="textMuted" align="center" numberOfLines={1}>
                      {c.left}
                    </AppText>
                  </Highlight>
                ) : (
                  <AppText variant="caption" color="textMuted" align="center" numberOfLines={3}>
                    {earnedNow ? shortDate(new Date(c.earnedAt as number).toISOString()) : (c.left ?? c.info.description)}
                  </AppText>
                )}
              </View>
            );
          })}
        </Grid>
      </Card>
    </View>
  );
}
