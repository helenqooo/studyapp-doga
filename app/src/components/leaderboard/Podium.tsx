import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import type { LeaderboardEntry } from '../../api/types';
import type { BadgeTier } from '../../data/badges';
import { useWindowLayout } from '../../lib/layout';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Avatar } from '../Avatar';
import { Highlight } from '../Highlight';
import { Icon } from '../Icon';
import { spring } from '../motion/presets';


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
    const wait = order * theme.motion.podium.stagger;
    rise.value = withDelay(wait, withSpring(1, spring('settle')));
    drop.value = withDelay(wait + theme.motion.duration.fast, withSpring(1, spring('land')));
  }, [reduceMotion, order, rise, drop, theme.motion.duration.fast]);

  // The settle spring may overshoot, but never far enough to cover the XP line above the step.
  const maxScale = 1 + theme.spacing.xs / height;
  const stepStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: Math.min(maxScale, Math.max(0.001, rise.value)) }] }));
  const numeralStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, rise.value)) }));
  const dropStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, drop.value * 2)),
    transform: [{ translateY: (1 - drop.value) * -theme.motion.podium.drop }],
  }));

  const name = (
    <AppText variant={first ? 'heading' : 'label'} weight="semibold" numberOfLines={1} align="center">
      {entryName(entry)}
    </AppText>
  );

  return (
    <View
      accessible
      accessibilityLabel={`${entry.rank}. ${entryName(entry)}, ${entry.xp} XP`}
      style={{ flex: first ? theme.layout.podium.firstFlex : 1, minWidth: 0, alignItems: 'center', gap: theme.spacing.xs }}
    >
      <Animated.View style={[{ alignItems: 'center', gap: theme.spacing.xs }, dropStyle]}>
        {first ? <Icon name="crown" size={theme.layout.iconSize.lg} color={theme.colors.xp} filled /> : null}
        {/* Only your own avatar wears a ring: you are found by the ring and the swipe, not by a loud step. */}
        <Avatar name={entry.displayName} color={entry.avatar} size={avatar} ring={entry.isMe ? theme.colors.accent : undefined} />
      </Animated.View>
      <View style={{ maxWidth: '100%' }}>{entry.isMe ? <Highlight drawn>{name}</Highlight> : name}</View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xxs }}>
        <AppText variant="numeric" color={first ? 'text' : 'textMuted'}>
          {entry.xp}
        </AppText>
        <AppText variant="caption" color="textMuted">
          XP
        </AppText>
      </View>
      <View style={{ alignSelf: 'stretch', height, marginTop: theme.spacing.xs }}>
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
                  backgroundColor: theme.colors.surface,
                  // A hairline edge gives the quiet steps a body on the paper; the ground line closes them.
                  borderWidth: theme.layout.borderWidth,
                  borderBottomWidth: 0,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={[StyleSheet.absoluteFill, { backgroundColor: ink, opacity: theme.opacity.podiumTint[first ? 'first' : 'other'][theme.scheme] }]} />
            </View>
          </Animated.View>
        </View>
        <Animated.View style={[{ alignItems: 'center', paddingTop: theme.spacing.xs }, numeralStyle]}>
          {/* The winner's numeral in the readable XP ink; the others in muted ink (the raw silver and bronze
              read under 3:1 on their own tints), so the step's tint alone says the medal. */}
          <AppText variant={first ? 'title' : 'stat'} tint={first ? theme.colors.xpText : theme.colors.textMuted}>
            {entry.rank}
          </AppText>
        </Animated.View>
      </View>
    </View>
  );
}

/**
 * The top three on steps (second, first, third). The winner's step is the tallest and widest,
 * in a clear gold tint under a crown; second and third are quieter tints of their medals, each
 * step edged by a hairline and standing on one optik ground line. Yours
 * is marked by an accent ring and a highlighter swipe on the name, never by a louder step.
 * On first mount the steps rise 3, 2, 1 and the avatars drop onto them; Reduce Motion shows
 * them in place.
 */
export function Podium({ items }: { items: LeaderboardEntry[] }) {
  const theme = useTheme();
  const { tablet, landscape, sizeClass } = useWindowLayout();
  // A phone on its side stays short; a landscape iPad has the podium in its own 7-column side.
  const tall = tablet && (!landscape || sizeClass === 'wide');
  const steps = tall ? theme.layout.podium.tall.step : theme.layout.podium.step[tablet ? 'tablet' : 'compact'];
  const avatars = tall ? theme.layout.podium.tall.avatar : theme.layout.podium.avatar;
  // Second, first, third from left to right.
  const places = [1, 0, 2];
  return (
    <View style={{ paddingTop: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm }}>
        {places.map((place) => {
          const e = items[place];
          if (!e) return <View key={place} style={{ flex: 1 }} />;
          return (
            <Step
              key={e.userId}
              entry={e}
              place={place}
              height={steps[place]}
              avatar={place === 0 ? avatars.first : avatars.other}
            />
          );
        })}
      </View>
      {/* The ground the three steps stand on: one optik hairline under all of them. */}
      <View style={{ height: theme.layout.borderWidth, backgroundColor: theme.colors.optik }} />
    </View>
  );
}
