import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { api, ApiError } from '../../api/client';
import { useFacets, useLogout, useProfile } from '../../api/hooks';
import { AppText } from '../../components/AppText';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Card, ListRow } from '../../components/Card';
import { DemoBanner } from '../../components/DemoBanner';
import { Col, Row } from '../../components/Grid';
import { Icon } from '../../components/Icon';
import { Odometer } from '../../components/motion/Odometer';
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

// TOKEN-PENDING: layout.avatarProfile = { compact: 56, tablet: 72 } (the identity sheet's avatar, spec 7.5)
const AVATAR_SIZE = { compact: 56, tablet: 72 };

type CheckState = { status: 'idle' } | { status: 'running' } | { status: 'ok' } | { status: 'error'; message: string };

/**
 * The profile's one primary sheet: avatar, name and username; the level as a big Lora
 * numeral with its XP groove; then the karne (Toplam XP | Seri | En uzun | Çözülen soru)
 * under a hairline, one row from a half-width landscape column up, two by two on a phone.
 */
function Hero() {
  const theme = useTheme();
  const { tablet, sheetPadding } = useWindowLayout();
  const user = useAuthStore((s) => s.user);
  const p = useProfile().data;
  const facets = useFacets().data;
  const k = theme.layout.karne;
  const cellPadX = tablet ? k.cellPadX.tablet : k.cellPadX.compact;
  const cellPadY = tablet ? k.cellPadY.tablet : k.cellPadY.compact;
  return (
    <Card variant="hero" style={{ paddingHorizontal: 0, paddingBottom: sheetPadding - cellPadY, gap: 0 }}>
      <View style={{ paddingHorizontal: sheetPadding, gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
          {user ? <Avatar name={user.displayName} color={user.avatar} size={tablet ? AVATAR_SIZE.tablet : AVATAR_SIZE.compact} /> : null}
          <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.xxs }}>
            <AppText variant="heading" numberOfLines={1}>
              {user?.displayName ?? '—'}
            </AppText>
            <AppText color="textMuted" numberOfLines={1}>
              @{user?.username ?? ''}
            </AppText>
          </View>
        </View>
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: theme.spacing.md }}>
            <View
              accessible
              accessibilityLabel={`Seviye ${p ? p.level : '—'}`}
              style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm }}
            >
              <AppText variant="heading" style={{ paddingBottom: theme.spacing.sm }}>
                Seviye
              </AppText>
              {/* A dash until the profile loads, so the numeral never rolls up from a placeholder. */}
              {p ? (
                <Odometer value={p.level} variant="hero" cacheKey="profile.level" />
              ) : (
                <AppText variant="hero" color="textMuted">
                  —
                </AppText>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs, paddingBottom: theme.spacing.sm }}>
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
      </View>
      <View
        style={{
          marginTop: sheetPadding,
          borderTopWidth: theme.layout.borderWidth,
          borderTopColor: theme.colors.optikSoft,
          // The first cell sits flush with the name above; the last keeps its own padding.
          paddingLeft: sheetPadding,
          paddingRight: sheetPadding - cellPadX,
        }}
      >
        <KarneRow
          variant="plain"
          cells={[
            { label: 'Toplam XP', value: p ? p.xp : null, cacheKey: 'profile.xp' },
            { label: 'Seri', value: p ? p.streak : null, unit: 'gün', cacheKey: 'profile.streak' },
            { label: 'En uzun', value: p ? p.longestStreak : null, unit: 'gün', cacheKey: 'profile.longest' },
            { label: 'Çözülen soru', value: facets ? facets.total : null, cacheKey: 'profile.solved' },
          ]}
        />
      </View>
    </Card>
  );
}

/** Sıralama, Sayaç and Lumi'ye sor: one group of rows. */
function Links() {
  return (
    <Card divided>
      <ListRow icon="trophy" title="Sıralama" onPress={() => router.push('/leaderboard')} />
      <ListRow icon="timer" title="Sayaç" onPress={() => router.push('/timer')} />
      <ListRow icon="message-circle" title={`${ASSISTANT_NAME}'ye sor`} onPress={() => router.push('/assistant')} />
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
  const theme = useTheme();
  const { sizeClass, tablet } = useWindowLayout();
  const p = useProfile().data;
  // Null until the profile loads: the wardrobe claims nothing is locked before the real level is known.
  const level = p ? p.level : null;
  const streak30 = p ? p.badges.some((b) => b.id === 'streak-30') : false;
  const lumi = <LumiSettings level={level} streak30={streak30} />;
  // Blocks inside a column keep the screen's own rhythm.
  const column = { gap: tablet ? theme.layout.screen.gap.tablet : theme.layout.screen.gap.compact };

  let body: ReactNode;
  if (sizeClass === 'wide') {
    // Landscape, 7/5: you (the sheet and the badges) on the wider left, so the karne keeps
    // its four cells on one line from a 1024 pt iPad up; the way out (links), Lumi and the
    // connection on the right, where the wardrobe folds two by two when it has to.
    body = (
      <Row>
        <Col span={{ compact: 4, wide: 7 }} style={column}>
          <Hero />
          <BadgeProgress />
        </Col>
        <Col span={{ compact: 4, wide: 5 }} style={column}>
          <Links />
          {lumi}
          <Connection />
        </Col>
      </Row>
    );
  } else if (sizeClass === 'regular') {
    // Portrait: one column at full width; every block gets the room to lay itself out flat
    // (the karne in one row, three badges across, the wardrobe in one row).
    body = (
      <>
        <Hero />
        <BadgeProgress />
        <Links />
        {lumi}
        <Connection />
      </>
    );
  } else {
    body = (
      <>
        <Hero />
        <BadgeProgress />
        <Links />
        {lumi}
        <Connection />
      </>
    );
  }

  return (
    <Screen title="Profil" subtitle="İlerlemen, rozetlerin ve ayarların.">
      {body}
    </Screen>
  );
}
