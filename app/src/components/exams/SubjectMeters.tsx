import { View } from 'react-native';
import type { ExamResult, ExamSection } from '../../api/types';
import { formatDelta, formatNet } from '../../lib/format';
import { subjectColor, useTheme } from '../../theme';
import { AppText } from '../AppText';
import { ProgressBar } from '../ProgressBar';

interface Props {
  sections: ExamSection[];
  /** The previous full exam of the same type: its nets show as ghost bars. */
  previous?: ExamResult | null;
}

/**
 * Per-subject meters for one exam: subject ink over a soft track, scaled from the left
 * (ProgressBar's translate sandwich), with the previous exam's net as a ghost bar behind,
 * and D Y B Net in numeric columns, right-aligned.
 */
export function SubjectMeters({ sections, previous }: Props) {
  const theme = useTheme();
  const { minTouch } = theme.layout.system;
  // Read-only figures (two digits at most), so the columns stay narrow and the subject keeps its room.
  const cell = { width: theme.spacing.xxl, textAlign: 'right' as const };
  const netCell = { ...cell, width: minTouch + theme.spacing.md };
  const h = theme.layout.progressHeight;

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.xs }} aria-hidden>
        <View style={{ flex: 1 }} />
        {['D', 'Y', 'B'].map((k) => (
          <AppText key={k} variant="caption" color="textMuted" style={cell}>
            {k}
          </AppText>
        ))}
        <AppText variant="caption" color="textMuted" style={netCell}>
          Net
        </AppText>
      </View>

      {sections.map((s) => {
        const ink = subjectColor(theme, s.subject);
        const prev = previous?.sections.find((p) => p.subject === s.subject);
        const share = (n: number) => Math.min(1, Math.max(0, n / Math.max(1, s.questions)));
        const label =
          `${s.subject}: ${s.correct} doğru, ${s.wrong} yanlış, ${s.blank} boş, ${formatNet(s.net)} net` +
          (prev ? `, önceki denemeye göre ${formatDelta(s.net - prev.net)}` : '');
        return (
          <View key={s.subject} accessible accessibilityLabel={label} style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <View style={{ width: theme.spacing.sm, height: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: ink }} />
                <AppText variant="label" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {s.subject}
                </AppText>
              </View>
              <AppText variant="numeric" color="textMuted" style={cell}>
                {s.correct}
              </AppText>
              <AppText variant="numeric" color="textMuted" style={cell}>
                {s.wrong}
              </AppText>
              <AppText variant="numeric" color="textMuted" style={cell}>
                {s.blank}
              </AppText>
              <AppText variant="numeric" style={netCell}>
                {formatNet(s.net)}
              </AppText>
            </View>
            <View style={{ height: h, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden' }}>
              {prev ? (
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${share(prev.net) * 100}%`,
                    borderRadius: theme.radius.pill,
                    backgroundColor: ink,
                    opacity: theme.opacity.ghost,
                  }}
                />
              ) : null}
              <ProgressBar variant="plain" progress={share(s.net)} color={ink} trackColor={theme.colors.transparent} height={h} />
            </View>
          </View>
        );
      })}

      {previous ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <View style={{ width: theme.spacing.lg, height: theme.spacing.xs, borderRadius: theme.radius.pill, backgroundColor: theme.colors.textMuted, opacity: theme.opacity.ghost }} />
          <AppText variant="caption" color="textMuted" style={{ flexShrink: 1 }}>
            Soluk çizgi: bir önceki {previous.exam} denemen
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
