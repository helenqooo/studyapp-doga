import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import type { TopicLoss } from '../../api/types';
import { getTopic, topicLabel } from '../../data/topics';
import { formatNet } from '../../lib/format';
import { useWindowLayout } from '../../lib/layout';
import { useHistoryFilter } from '../../store/historyFilter';
import { subjectColor, subjectSoftColor, useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Grid } from '../Grid';
import { PressableScale } from '../motion/PressableScale';
import { ease } from '../motion/presets';

// TOKEN-PENDING: layout.chart.lossValueWidth = { compact: 72, tablet: 84 } (fits "88,88 net"; every track ends at the same x)
const VALUE_WIDTH = { compact: 72, tablet: 84 };
/** AppText's `numeric` stops growing at this Dynamic Type scale. */
const NUMERIC_MAX_SCALE = 1.6;

const counts = (wrong: number, blank: number) =>
  [wrong ? `${wrong} yanlış` : '', blank ? `${blank} boş` : ''].filter(Boolean).join(', ');

/** "TYT Temel Matematik, denemede 5 yanlış, 2 boş; soru çözerken 1 yanlış". */
function breakdown(t: TopicLoss, where: string): string {
  const parts: string[] = [];
  if (t.examWrong || t.examBlank) parts.push(`denemede ${counts(t.examWrong, t.examBlank)}`);
  if (t.practiceWrong || t.practiceBlank) parts.push(`soru çözerken ${counts(t.practiceWrong, t.practiceBlank)}`);
  const text = parts.join('; ');
  if (where) return text ? `${where}, ${text}` : where;
  return text.charAt(0).toLocaleUpperCase('tr') + text.slice(1);
}

/**
 * A bar in subject ink over the subject's soft track, grown to `share` (0..1) with scaleX
 * from its left edge (the translate sandwich: iOS ignores transformOrigin on Reanimated
 * transforms). Staggered by index (at most `motion.staggerMax` steps); Reduce Motion jumps.
 */
function GrowBar({ share, index, ink, track }: { share: number; index: number; ink: string; track: string }) {
  const theme = useTheme();
  const dims = theme.layout.chart;
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const scale = useSharedValue(reduceMotion ? share : 0);
  useEffect(() => {
    if (reduceMotion) {
      scale.value = share;
      return;
    }
    scale.value = withDelay(
      Math.min(index, theme.motion.staggerMax) * theme.motion.stagger,
      withTiming(share, { duration: theme.motion.progress.fill, easing: ease('standard') }),
    );
  }, [share, index, reduceMotion, scale, theme.motion]);
  const half = width / 2;
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: -half }, { scaleX: scale.value }, { translateX: half }] }), [half]);
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))}
      style={{ flex: 1, height: dims.barThickness, borderRadius: dims.barEndRadius, backgroundColor: track, overflow: 'hidden' }}
    >
      {width > 0 ? <Animated.View style={[{ width, height: dims.barThickness, borderRadius: dims.barEndRadius, backgroundColor: ink }, style]} /> : null}
    </View>
  );
}

/**
 * Horizontal bars of nets lost per topic, each in its subject's ink, value after the track,
 * then where the losses came from. Tapping a row opens the question history for that topic.
 * The value column has one fixed width, so every track is the same length; a wide sheet
 * (landscape) lays the rows in two columns.
 */
export function TopicLossBars({ items }: { items: TopicLoss[] }) {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  const { fontScale } = useWindowDimensions();
  const setSubject = useHistoryFilter((s) => s.setSubject);
  const setTopicId = useHistoryFilter((s) => s.setTopicId);
  const maxLost = Math.max(...items.map((t) => t.lostNet), 1);
  const valueWidth = Math.ceil((tablet ? VALUE_WIDTH.tablet : VALUE_WIDTH.compact) * Math.min(Math.max(fontScale, 1), NUMERIC_MAX_SCALE));

  return (
    <Grid columns={{ compact: 1, wide: 2 }} gap={theme.spacing.xs} columnGap={theme.spacing.xxl}>
      {items.map((t, index) => {
        const topic = getTopic(t.topicId);
        const subject = topic?.subject ?? t.subject ?? '';
        const share = Math.max(0.02, t.lostNet / maxLost);
        return (
          <PressableScale
            key={t.topicId}
            kind="row"
            accessibilityRole="button"
            accessibilityLabel={`${topic ? topicLabel(topic) : t.topicId}: ${formatNet(t.lostNet)} net kayıp`}
            onPress={() => {
              if (!topic) return;
              setSubject(topic.subject);
              setTopicId(topic.id);
              router.navigate({ pathname: '/review', params: { tab: 'history' } });
            }}
            style={{
              gap: theme.spacing.xs,
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.sm,
              marginHorizontal: -theme.spacing.sm,
              borderRadius: theme.radius.md,
              borderCurve: 'continuous',
            }}
          >
            <AppText variant="label" numberOfLines={2}>
              {topic ? topicLabel(topic) : t.topicId}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <GrowBar share={share} index={index} ink={subjectColor(theme, subject)} track={subjectSoftColor(theme, subject)} />
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xxs, width: valueWidth, justifyContent: 'flex-end' }}>
                <AppText variant="numeric">{formatNet(t.lostNet)}</AppText>
                <AppText variant="caption" color="textMuted">
                  net
                </AppText>
              </View>
            </View>
            <AppText variant="caption" color="textMuted">
              {breakdown(t, topic ? `${topic.exam} ${topic.subject}` : '')}
            </AppText>
          </PressableScale>
        );
      })}
    </Grid>
  );
}
