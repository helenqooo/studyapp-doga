import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import type { LeaderboardEntry } from '../../api/types';
import type { BadgeTier } from '../../data/badges';
import { useWindowLayout } from '../../lib/layout';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Avatar } from '../Avatar';
import { Icon } from '../Icon';
import { spring } from '../motion/presets';

// TOKEN-PENDING: opacity.podiumTint = { light: 0.16, dark: 0.24 } (a step's soft tier tint over the sheet)
const TINT = { light: 0.16, dark: 0.24 };
// TOKEN-PENDING: motion.podium = { stagger: 80, drop: 28 } (steps rise 3, 2, 1; avatars drop from 28 pt)
const PODIUM = { stagger: 80, drop: 28 };

/** First, second and third place: gold, silver, bronze. */
const TIER: BadgeTier[] = ['gold', 'silver', 'bronze'];

/** The display name, with "(sen)" when it's you under another name. */
export function entryName(e: LeaderboardEntry): string {
  return e.isMe && e.displayName !== 'Sen' ? `${e.displayName} (sen)` : e.displayName;
}

function Step({ entry, place, height, avatar }: { entry: LeaderboardEntry; place: number; height: number; avatar: number }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const ink = theme.colors.badge[TIER[place]];
  const first = place === 0;
  // Third rises first, then second, then first.
  const order = 2 - place;
  // Steps rise from their bottom edge (scaleY in a translate sandwich: iOS ignores
  // transformOrigin on Reanimated transforms), then the avatar drops onto its step.
  const rise = useSharedValue(reduceMotion ? 1 : 0);
  const drop = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    const wait = order * PODIUM.stagger;
    rise.value = withDelay(wait, withSpring(1, spring('settle')));
    drop.value = withDelay(wait + theme.motion.duration.fast, withSpring(1, spring('land')));
  }, [reduceMotion, order, rise, drop, theme.motion.duration.fast]);

  // The settle spring may overshoot, but never far enough to cover the XP line above the step.
  const maxScale = 1 + theme.spacing.xs / height;
  const stepStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: Math.min(maxScale, Math.max(0.001, rise.value)) }] }));
  const numeralStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, rise.value)) }));
  const dropStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, drop.value * 2)),
    transform: [{ translateY: (1 - drop.value) * -PODIUM.drop }],
  }));

  return (
    <View
      accessible
      accessibilityLabel={`${entry.rank}. ${entryName(entry)}, ${entry.xp} XP`}
      style={{ flex: 1, alignItems: 'center', gap: theme.spacing.xs }}
    >
      <Animated.View style={[{ alignItems: 'center', gap: theme.spacing.xs }, dropStyle]}>
        {first ? <Icon name="crown" size={theme.layout.iconSize.md} color={theme.colors.xp} filled /> : null}
        <Avatar name={entry.displayName} color={entry.avatar} size={avatar} ring={entry.isMe ? theme.colors.accent : ink} />
      </Animated.View>
      <AppText variant="label" weight="semibold" numberOfLines={1} align="center">
        {entryName(entry)}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xxs }}>
        <AppText variant="numeric" color="textMuted">
          {entry.xp}
        </AppText>
        <AppText variant="caption" color="textMuted">
          XP
        </AppText>
      </View>
      <View style={{ alignSelf: 'stretch', height }}>
        {/* translate down by half, scale around the center, translate back: a bottom origin. */}
        <View style={[StyleSheet.absoluteFill, { transform: [{ translateY: height / 2 }] }]}>
          <Animated.View style={[StyleSheet.absoluteFill, stepStyle]}>
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  transform: [{ translateY: -height / 2 }],
                  borderTopLeftRadius: theme.radius.sm,
                  borderTopRightRadius: theme.radius.sm,
                  borderCurve: 'continuous',
                  overflow: 'hidden',
                  backgroundColor: entry.isMe ? theme.colors.accent : theme.colors.surface,
                },
              ]}
            >
              {entry.isMe ? null : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: ink, opacity: TINT[theme.scheme] }]} />
              )}
            </View>
          </Animated.View>
        </View>
        <Animated.View style={[{ alignItems: 'center', paddingTop: theme.spacing.xs }, numeralStyle]}>
          <AppText variant="stat" tint={entry.isMe ? theme.colors.highlightInk : ink}>
            {entry.rank}
          </AppText>
        </Animated.View>
      </View>
    </View>
  );
}

/**
 * The top three on steps (second, first, third), each step a soft tint of its medal and
 * yours in fosfor. On first mount the steps rise 3, 2, 1 and the avatars drop onto them;
 * Reduce Motion shows them in place.
 */
export function Podium({ items }: { items: LeaderboardEntry[] }) {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  const steps = theme.layout.podium.step[tablet ? 'tablet' : 'compact'];
  // Second, first, third from left to right.
  const places = [1, 0, 2];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm, paddingTop: theme.spacing.md }}>
      {places.map((place) => {
        const e = items[place];
        if (!e) return <View key={place} style={{ flex: 1 }} />;
        return (
          <Step
            key={e.userId}
            entry={e}
            place={place}
            height={steps[place]}
            avatar={place === 0 ? theme.layout.podium.avatar.first : theme.layout.podium.avatar.other}
          />
        );
      })}
    </View>
  );
}
