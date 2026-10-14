import { useState } from 'react';
import { View } from 'react-native';
import { useRefreshWeeklySummary, useWeeklySummary } from '../api/hooks';
import { getTopic, topicLabel } from '../data/topics';
import { shortDate } from '../lib/format';
import { subjectColor, useTheme } from '../theme';
import { AppText } from './AppText';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';
import { Appear } from './motion/Appear';
import { ThinkingSpark } from './motion/ThinkingSpark';

/** Lines of the summary shown before "Devamını oku". */
const COLLAPSED_LINES = 3;
/** Lumi's words are set in Lora, as on Home (proportional figures: Lora's tabular ones widen spaces). */
const VOICE = { family: 'serif', weight: 'regular', tabular: false } as const;

/**
 * "Lumi'nin haftalık notu": the AI's weekly read and its 3 priority topics with reasons, on
 * note paper (all text in `noteInk`, Lumi's words in Lora). Collapsed to the first three lines of the summary;
 * "Devamını oku" opens the whole note with the priorities.
 */
export function WeeklySummaryCard() {
  const theme = useTheme();
  const summary = useWeeklySummary();
  const refresh = useRefreshWeeklySummary();
  const [open, setOpen] = useState(false);
  const busy = summary.isPending || refresh.isPending;
  const ink = theme.colors.noteInk;

  return (
    <Card variant="note" title="Lumi'nin haftalık notu">
      {busy ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <ThinkingSpark size={theme.layout.iconSize.lg} />
          <AppText variant="note" {...VOICE} tint={ink} style={{ flexShrink: 1 }}>
            Haftalık notun hazırlanıyor, biraz sürebilir.
          </AppText>
        </View>
      ) : summary.isError || refresh.isError ? (
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="note" tint={ink}>
            {(refresh.error ?? summary.error)?.message}
          </AppText>
          <Button
            label="Tekrar dene"
            icon="refresh-cw"
            variant="secondary"
            size="sm"
            onPress={() => (summary.isError ? summary.refetch() : refresh.mutate())}
            style={{ alignSelf: 'flex-start' }}
          />
        </View>
      ) : summary.data?.status === 'insufficient' ? (
        <AppText variant="note" {...VOICE} tint={ink}>
          Not için en az bir deneme gir ya da birkaç soru çöz.
        </AppText>
      ) : summary.data?.status === 'ok' ? (
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="note" {...VOICE} tint={ink} numberOfLines={open ? undefined : COLLAPSED_LINES}>
            {summary.data.summary}
          </AppText>
          {open ? (
            <View style={{ gap: theme.spacing.md }}>
              <AppText variant="label" weight="semibold" tint={ink}>
                Bu hafta öncelik verilecek 3 konu
              </AppText>
              {summary.data.priorities.map((p, i) => {
                const topic = getTopic(p.topicId);
                return (
                  <Appear key={p.topicId} index={i} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                    <View
                      style={{
                        width: theme.layout.iconSize.lg,
                        height: theme.layout.iconSize.lg,
                        borderRadius: theme.radius.pill,
                        backgroundColor: theme.colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <AppText variant="numeric" tint={theme.colors.onPrimary}>
                        {i + 1}
                      </AppText>
                    </View>
                    <View style={{ flex: 1, gap: theme.spacing.xs }}>
                      <AppText variant="label" weight="semibold" tint={ink}>
                        {topic ? topicLabel(topic) : p.topicId}
                      </AppText>
                      {topic ? (
                        <Badge label={`${topic.exam} ${topic.subject}`} dot={subjectColor(theme, topic.subject)} background={theme.colors.surface} />
                      ) : null}
                      <AppText variant="caption" {...VOICE} tint={ink}>
                        {p.reason}
                      </AppText>
                    </View>
                  </Appear>
                );
              })}
              <AppText variant="caption" tint={ink}>
                {shortDate(summary.data.generatedAt)} tarihinde hazırlandı
              </AppText>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <Button
              label={open ? 'Daha az göster' : 'Devamını oku'}
              icon={open ? 'chevron-up' : 'chevron-down'}
              variant="ghost"
              size="sm"
              onPress={() => setOpen((o) => !o)}
              style={{ marginLeft: -theme.spacing.md }}
            />
            {open ? <Button label="Yenile" icon="refresh-cw" variant="ghost" size="sm" onPress={() => refresh.mutate()} style={{ marginRight: -theme.spacing.md }} /> : null}
          </View>
        </View>
      ) : null}
    </Card>
  );
}
