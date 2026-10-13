import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { api, ApiError } from '../../api/client';
import { useFacets, useLogout, useProfile } from '../../api/hooks';
import { AppText } from '../../components/AppText';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DemoBanner } from '../../components/DemoBanner';
import { Col, Row } from '../../components/Grid';
import { Icon, type IconName } from '../../components/Icon';
import { PressableScale } from '../../components/motion/PressableScale';
import { BadgeProgress } from '../../components/profile/BadgeProgress';
import { LumiSettings } from '../../components/profile/LumiSettings';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import { KarneRow } from '../../components/StatTile';
import { ASSISTANT_NAME } from '../../brand';
import { API_URL, DEMO_MODE } from '../../config';
import { haptics } from '../../lib/haptics';
import { useWindowLayout } from '../../lib/layout';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme';

// TOKEN-PENDING: layout.avatarProfile = 72 (the identity sheet's avatar, spec 7.5)
const AVATAR_SIZE = 72;
// TOKEN-PENDING: layout.listRow = 56 (a settings or navigation row, spec 7.5)
const LIST_ROW = 56;

type CheckState = { status: 'idle' } | { status: 'running' } | { status: 'ok' } | { status: 'error'; message: string };

/** Avatar, name, username, and the level with its groove. */
function Identity() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const p = useProfile().data;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
        {user ? <Avatar name={user.displayName} color={user.avatar} size={AVATAR_SIZE} /> : null}
        <View style={{ flex: 1, gap: theme.spacing.xxs }}>
          <AppText variant="title" numberOfLines={1}>
            {user?.displayName ?? '—'}
          </AppText>
          <AppText color="textMuted" numberOfLines={1}>
            @{user?.username ?? ''}
          </AppText>
        </View>
      </View>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <AppText variant="heading">Seviye {p?.level ?? 1}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs }}>
            <AppText variant="numeric" color="textMuted">
              {p ? `${p.levelXp}/${p.levelXpRequired}` : '—'}
            </AppText>
            <AppText variant="caption" color="textMuted">
              XP
            </AppText>
          </View>
        </View>
        <ProgressBar progress={p ? p.levelXp / p.levelXpRequired : 0} />
      </View>
    </Card>
  );
}

/** Toplam XP | Seri | En uzun | Çözülen soru. */
function Karne() {
  const p = useProfile().data;
  const facets = useFacets().data;
  return (
    <KarneRow
      cells={[
        { label: 'Toplam XP', value: p ? p.xp : null, cacheKey: 'profile.xp' },
        { label: 'Seri', value: p ? p.streak : null, unit: 'gün', cacheKey: 'profile.streak' },
        { label: 'En uzun', value: p ? p.longestStreak : null, unit: 'gün', cacheKey: 'profile.longest' },
        { label: 'Çözülen soru', value: facets ? facets.total : null, cacheKey: 'profile.solved' },
      ]}
    />
  );
}

/** A 56 pt navigation row: icon, label, chevron. */
function ListRow({ icon, label, onPress, last = false }: { icon: IconName; label: string; onPress: () => void; last?: boolean }) {
  const theme = useTheme();
  return (
    <PressableScale
      kind="row"
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        minHeight: LIST_ROW,
        paddingHorizontal: theme.spacing.lg,
        borderBottomWidth: last ? 0 : theme.layout.borderWidth,
        borderBottomColor: theme.colors.optikSoft,
      }}
    >
      <Icon name={icon} size={theme.layout.iconSize.md} color={theme.colors.primaryText} duotone />
      <AppText weight="medium" style={{ flex: 1 }}>
        {label}
      </AppText>
      <Icon name="chevron-right" size={theme.layout.iconSize.sm} color={theme.colors.textMuted} />
    </PressableScale>
  );
}

function Links() {
  const theme = useTheme();
  return (
    <Card style={{ padding: 0, paddingVertical: theme.spacing.xs, gap: 0, overflow: 'hidden' }}>
      <ListRow icon="trophy" label="Sıralama" onPress={() => router.push('/leaderboard')} />
      <ListRow icon="timer" label="Sayaç" onPress={() => router.push('/timer')} />
      <ListRow icon="message-circle" label={`${ASSISTANT_NAME}'ye sor`} onPress={() => router.push('/assistant')} last />
    </Card>
  );
}

/** Demo: the compact demo pill. Server: the address, a connection check and sign-out. */
function Connection() {
  const theme = useTheme();
  const logout = useLogout();
  const [check, setCheck] = useState<CheckState>({ status: 'idle' });
  if (DEMO_MODE) {
    return <DemoBanner compact detail="Örnek verilerle çalışıyor; yaptıkların uygulama kapanınca sıfırlanır. Kendi sunucunu bağlamak için README'deki kurulum adımlarına bak." />;
  }
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
  return (
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
}

export default function ProfileScreen() {
  const { sizeClass } = useWindowLayout();
  const p = useProfile().data;
  const level = p?.level ?? 1;
  const streak30 = !!p?.badges.some((b) => b.id === 'streak-30');
  const lumi = <LumiSettings level={level} streak30={streak30} />;

  let body: ReactNode;
  if (sizeClass === 'wide') {
    // Landscape: the student on the left (5 of 12), the badges on the right. The Lumi sheet
    // sits under the badges so the two columns end near each other (with it on the left,
    // the right column ended halfway down and left a tall empty gap).
    body = (
      <Row>
        <Col span={{ compact: 4, wide: 5 }}>
          <Identity />
          <Karne />
          <Links />
          <Connection />
        </Col>
        <Col span={{ compact: 4, wide: 7 }}>
          <BadgeProgress />
          {lumi}
        </Col>
      </Row>
    );
  } else if (sizeClass === 'regular') {
    // Portrait: identity and karne across, badges, then the list and Lumi side by side.
    body = (
      <Row>
        <Col span={{ compact: 4, regular: 8 }}>
          <Identity />
          <Karne />
          <BadgeProgress />
        </Col>
        <Col span={{ compact: 4, regular: 4 }}>
          <Links />
          <Connection />
        </Col>
        <Col span={{ compact: 4, regular: 4 }}>{lumi}</Col>
      </Row>
    );
  } else {
    body = (
      <>
        <Identity />
        <Karne />
        <BadgeProgress />
        <Links />
        {lumi}
        <Connection />
      </>
    );
  }

  return <Screen title="Profil">{body}</Screen>;
}
