import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { api, ApiError } from '../../api/client';
import { useLogout, useProfile } from '../../api/hooks';
import { AppText } from '../../components/AppText';
import { Avatar } from '../../components/Avatar';
import { BadgeSeal } from '../../components/BadgeSeal';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DemoBanner } from '../../components/DemoBanner';
import { Columns, Grid } from '../../components/Grid';
import { Icon } from '../../components/Icon';
import { Appear } from '../../components/motion/Appear';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import { ASSISTANT_NAME } from '../../brand';
import { API_URL, DEMO_MODE } from '../../config';
import { BADGES, badgeInfo } from '../../data/badges';
import { shortDate } from '../../lib/format';
import { haptics } from '../../lib/haptics';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme';

type CheckState = { status: 'idle' } | { status: 'running' } | { status: 'ok' } | { status: 'error'; message: string };

function Stat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, gap: theme.spacing.xxs }}>
      <AppText variant="title">{value}</AppText>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
    </View>
  );
}

/** Every badge: earned ones in color with their date, the rest locked with the goal. */
function Badges() {
  const theme = useTheme();
  const profile = useProfile();
  const earned = profile.data?.badges ?? [];
  const earnedIds = new Set(earned.map((b) => (b.id.startsWith('topic-master:') ? 'topic-master' : b.id)));
  const masters = earned.filter((b) => b.id.startsWith('topic-master:'));
  const cells = [
    ...BADGES.map((b) => {
      const own = earned.find((e) => e.id === b.id || (b.id === 'topic-master' && e.id.startsWith('topic-master:')));
      return { key: b.id, info: own ? badgeInfo(own.id) : b, earnedAt: own?.earnedAt ?? null };
    }),
    // A second, third… topic master shows as its own medal.
    ...masters.slice(1).map((m) => ({ key: m.id, info: badgeInfo(m.id), earnedAt: m.earnedAt })),
  ];
  return (
    <Card title={`Rozetler · ${earnedIds.size}/${BADGES.length}`}>
      <Grid columns={{ compact: 3, regular: 3, wide: 3 }}>
        {cells.map((c, i) => (
          <Appear key={c.key} index={i} style={{ alignItems: 'center', gap: theme.spacing.xs, paddingVertical: theme.spacing.sm }}>
            <BadgeSeal icon={c.info.icon} tier={c.info.tier} locked={!c.earnedAt} />
            <AppText variant="label" weight="semibold" align="center" color={c.earnedAt ? 'text' : 'textMuted'}>
              {c.info.title}
            </AppText>
            <AppText variant="caption" color="textMuted" align="center" numberOfLines={3}>
              {c.earnedAt ? shortDate(new Date(c.earnedAt).toISOString()) : c.info.description}
            </AppText>
          </Appear>
        ))}
      </Grid>
    </Card>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const profile = useProfile();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const [check, setCheck] = useState<CheckState>({ status: 'idle' });

  const runCheck = async () => {
    setCheck({ status: 'running' });
    try {
      await api.health();
      await api.profile();
      haptics.success();
      setCheck({ status: 'ok' });
    } catch (e) {
      haptics.error();
      setCheck({ status: 'error', message: e instanceof ApiError ? e.message : 'Bilinmeyen hata.' });
    }
  };

  const p = profile.data;

  const account = (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        {user ? <Avatar name={user.displayName} color={user.avatar} size={theme.layout.avatar * 1.5} /> : null}
        <View style={{ flex: 1, gap: theme.spacing.xxs }}>
          <AppText variant="title" numberOfLines={1}>
            {user?.displayName ?? '—'}
          </AppText>
          <AppText color="textMuted">@{user?.username ?? ''}</AppText>
        </View>
      </View>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <AppText variant="heading">Seviye {p?.level ?? 1}</AppText>
          <AppText variant="label" color="textMuted">
            {p ? `${p.levelXp} / ${p.levelXpRequired} XP` : '—'}
          </AppText>
        </View>
        <ProgressBar progress={p ? p.levelXp / p.levelXpRequired : 0} />
      </View>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <Stat label="Toplam XP" value={p ? String(p.xp) : '—'} />
        <Stat label="Seri" value={p ? `${p.streak} gün` : '—'} />
        <Stat label="En uzun seri" value={p ? `${p.longestStreak} gün` : '—'} />
      </View>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Button label="Sıralama" icon="trophy" variant="secondary" onPress={() => router.push('/leaderboard')} style={{ flex: 1 }} />
        <Button label="Sayaç" icon="timer" variant="secondary" onPress={() => router.push('/timer')} style={{ flex: 1 }} />
      </View>
      <Button label={`${ASSISTANT_NAME}'ye sor`} icon="message-circle" variant="ghost" onPress={() => router.push('/assistant')} />
    </Card>
  );

  const connection = DEMO_MODE ? (
    <DemoBanner
      detail={
        API_URL
          ? "EXPO_PUBLIC_DEMO=1 olduğu için uygulama örnek verilerle çalışıyor. Sunucuya bağlanmak için bu değişkeni kaldır ve Expo'yu yeniden başlat."
          : "Sunucu adresi tanımlı değil, uygulama örnek verilerle çalışıyor. Gerçek kullanım için app/.env içine EXPO_PUBLIC_API_URL yaz ve Expo'yu yeniden başlat."
      }
    />
  ) : (
    <Card title="Hesap ve sunucu">
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="caption" color="textMuted">
          Sunucu
        </AppText>
        <AppText selectable>{API_URL}</AppText>
      </View>
      {check.status === 'ok' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Icon name="circle-check" color={theme.colors.success} />
          <AppText color="success" weight="semibold">
            Bağlantı ve oturum çalışıyor.
          </AppText>
        </View>
      ) : null}
      {check.status === 'error' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Icon name="triangle-alert" color={theme.colors.danger} />
          <AppText color="danger" style={{ flex: 1 }}>
            {check.message}
          </AppText>
        </View>
      ) : null}
      <Button label="Bağlantıyı test et" icon="wifi" variant="secondary" loading={check.status === 'running'} onPress={runCheck} />
      <Button label="Çıkış yap" icon="log-out" variant="ghost" loading={logout.isPending} onPress={() => logout.mutate()} />
    </Card>
  );

  return (
    <Screen title="Profil">
      <Columns
        left={
          <>
            <Appear>{account}</Appear>
            <Appear index={1}>{connection}</Appear>
          </>
        }
        right={<Badges />}
      />
    </Screen>
  );
}
