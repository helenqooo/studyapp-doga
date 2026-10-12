import { ActivityIndicator, View } from 'react-native';
import { useRefreshWeeklySummary, useWeeklySummary } from '../api/hooks';
import { getTopic, topicLabel } from '../data/topics';
import { shortDate } from '../lib/format';
import { subjectColor, useTheme } from '../theme';
import { AppText } from './AppText';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';

/** "Bu hafta öncelik verilecek 3 konu": AI picks with reasons, generated once a week. */
export function WeeklySummaryCard() {
  const theme = useTheme();
  const summary = useWeeklySummary();
  const refresh = useRefreshWeeklySummary();
  const busy = summary.isPending || refresh.isPending;

  return (
    <Card title="Bu hafta öncelik verilecek 3 konu" background={theme.colors.primarySoft}>
      {busy ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <ActivityIndicator color={theme.colors.primary} />
          <AppText color="textMuted">Haftalık özet hazırlanıyor, biraz sürebilir…</AppText>
        </View>
      ) : summary.isError || refresh.isError ? (
        <View style={{ gap: theme.spacing.sm }}>
          <AppText color="danger">{(refresh.error ?? summary.error)?.message}</AppText>
          <Button label="Tekrar dene" variant="secondary" onPress={() => (summary.isError ? summary.refetch() : refresh.mutate())} />
        </View>
      ) : summary.data?.status === 'insufficient' ? (
        <AppText color="textMuted">Özet için en az bir deneme gir ya da birkaç soru çöz.</AppText>
      ) : summary.data?.status === 'ok' ? (
        <View style={{ gap: theme.spacing.md }}>
          <AppText>{summary.data.summary}</AppText>
          {summary.data.priorities.map((p, i) => {
            const topic = getTopic(p.topicId);
            return (
              <View key={p.topicId} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
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
                  <AppText variant="label" weight="bold" tint={theme.colors.textOnAccent}>
                    {i + 1}
                  </AppText>
                </View>
                <View style={{ flex: 1, gap: theme.spacing.xs }}>
                  <AppText weight="bold">{topic ? topicLabel(topic) : p.topicId}</AppText>
                  {topic ? (
                    <Badge label={`${topic.exam} ${topic.subject}`} color={subjectColor(theme, topic.subject)} background={theme.colors.surface} />
                  ) : null}
                  <AppText variant="label" color="textMuted">
                    {p.reason}
                  </AppText>
                </View>
              </View>
            );
          })}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="caption" color="textMuted">
              {shortDate(summary.data.generatedAt)} tarihinde hazırlandı
            </AppText>
            <Button label="Yenile" icon="arrow.clockwise" variant="ghost" onPress={() => refresh.mutate()} />
          </View>
        </View>
      ) : null}
    </Card>
  );
}
