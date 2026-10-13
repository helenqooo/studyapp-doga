import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Bubble, type BubbleTone } from '../components/Bubble';
import { Icon, type IconName } from '../components/Icon';
import { Kareli } from '../components/Kareli';
import { FocusPull } from '../components/motion/FocusPull';
import { Loader } from '../components/motion/Loader';
import { Odometer } from '../components/motion/Odometer';
import { PressableScale } from '../components/motion/PressableScale';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { Highlight } from '../components/Highlight';
import { Note } from '../components/Note';
import { ProgressBar } from '../components/ProgressBar';
import { SectionHeader } from '../components/SectionHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { TextField } from '../components/TextField';
import { Viewfinder } from '../components/Viewfinder';
import { useCompanionStore } from '../store/companionStore';
import { subjectSoftColor, useTheme } from '../theme';

// Dev-only gallery of the Fosfor primitives (P0). Not a tab; production builds redirect home.
// Three pages (one viewport each, so screenshots see a whole page): `/dev-kit` marks, numbers
// and icons; `?part=prim` buttons, selection, progress and fields; `?part=paper` highlights,
// headers, note, cards and viewfinder. A slow demo loop cycles states so transitions can be
// watched without touching anything.

/** Demo loop period. Dev-only route, not a design value. */
const DEMO_CYCLE_MS = 1600;

type KitPart = 'base' | 'prim' | 'paper';
const KIT_PAGES: { value: KitPart; label: string }[] = [
  { value: 'base', label: 'Temel' },
  { value: 'prim', label: 'Düğmeler' },
  { value: 'paper', label: 'Kağıt' },
];

/** Page switcher at the top of every dev-kit page. */
function KitNav({ current }: { current: KitPart }) {
  return (
    <SegmentedControl
      options={KIT_PAGES}
      value={current}
      onChange={(part) => router.setParams({ part: part === 'base' ? undefined : part })}
    />
  );
}

/** Ticks once per demo cycle. */
function useDemoTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), DEMO_CYCLE_MS);
    return () => clearInterval(id);
  }, []);
  return tick;
}

const NEW_ICONS: IconName[] = [
  'highlighter', 'sticky-note', 'notebook-pen', 'pen-line', 'shirt', 'glasses', 'headphones', 'party-popper',
  'calendar-days', 'list-checks', 'chart-spline', 'trending-up', 'trending-down', 'circle-dot', 'vibrate',
  'message-circle-more', 'image', 'hourglass', 'chevrons-up',
];
const TONES: BubbleTone[] = ['mark', 'success', 'danger', 'neutral', 'accent'];
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export default function DevKit() {
  const { part } = useLocalSearchParams<{ part?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  // `?part=prim` / `?part=paper` show one primitives page alone (screenshots see one viewport).
  if (part === 'prim') return <PrimitiveKit />;
  if (part === 'paper') return <PaperKit />;
  return <Gallery />;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.md }}>
      <AppText variant="heading">{title}</AppText>
      {children}
    </View>
  );
}

function Gallery() {
  const theme = useTheme();
  const [chosen, setChosen] = useState<number | null>(1);
  const [xp, setXp] = useState(1275);
  const [pull, setPull] = useState(true);
  const tick = useDemoTick();
  const cycle = tick % 4;

  const row = { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.md } as const;

  return (
    <>
      <Stack.Screen options={{ title: 'Dev kit: temel' }} />
      <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={[styles.content, { maxWidth: theme.layout.dashboardWidth, padding: theme.spacing.lg, gap: theme.spacing.xl }]}>
        <KitNav current="base" />
        <View style={{ height: theme.layout.kareli.bandHeight / 2 }}>
          <Kareli height={theme.layout.kareli.bandHeight / 2} style={StyleSheet.absoluteFill} />
          <View style={{ padding: theme.spacing.lg }}>
            <AppText variant="title">Kareli bant</AppText>
            <AppText variant="caption" color="textMuted">Tek path, dikey gradyan</AppText>
          </View>
        </View>

        <Section title="Kabarcıklar">
          <View style={row}>
            {LETTERS.map((l, i) => (
              <PressableScale key={l} kind="bubble" onPress={() => setChosen(chosen === i ? null : i)} style={[styles.hit, { minWidth: theme.layout.minTouch, minHeight: theme.layout.minTouch }]} accessibilityRole="button" accessibilityLabel={`Şık ${l}`}>
                <Bubble size="letter" filled={chosen === i}>
                  {l}
                </Bubble>
              </PressableScale>
            ))}
          </View>
          <View style={row}>
            {(['dot', 'row', 'tab', 'letter'] as const).map((s) => (
              <View key={s} style={{ alignItems: 'center', gap: theme.spacing.xs }}>
                <View style={row}>
                  <Bubble size={s} />
                  <Bubble size={s} filled />
                  <Bubble size={s} fill={0.4} />
                  <Bubble size={s} filled={cycle >= 2} />
                </View>
                <AppText variant="caption" color="textMuted">{s}</AppText>
              </View>
            ))}
          </View>
          <View style={row}>
            {TONES.map((t) => (
              <Bubble key={t} size="letter" filled tone={t}>
                {t[0].toUpperCase()}
              </Bubble>
            ))}
            <Bubble size="letter" filled tone={cycle % 2 ? 'success' : 'mark'}>
              B
            </Bubble>
          </View>
          <View style={row}>
            <Bubble size="letter" filled tone="success" verdict="check">
              A
            </Bubble>
            <Bubble size="letter" verdict="check">
              B
            </Bubble>
            <Bubble size="letter" filled tone="mark" verdict="pen">
              C
            </Bubble>
            <Bubble size="letter" verdict="pen">
              D
            </Bubble>
            <Bubble size="letter" verdict="dash">
              E
            </Bubble>
            <Bubble size="row" filled tone="success" verdict="check" />
            <Bubble size="dot" verdict="pen" />
            <Bubble size="letter" verdict={cycle === 1 ? 'check' : cycle === 2 ? 'pen' : cycle === 3 ? 'dash' : undefined} filled={cycle === 1} tone="success">
              A
            </Bubble>
          </View>
          <View style={row}>
            <Bubble size="tab" filled>
              {(c) => <Icon name="house" size={theme.layout.iconSize.sm} color={c} />}
            </Bubble>
            <Bubble size="tab">{(c) => <Icon name="highlighter" size={theme.layout.iconSize.sm} color={c} />}</Bubble>
            <Bubble size="row" fill={(tick % 5) / 4} />
          </View>
        </Section>

        <Section title="Sayaç ve netleşme">
          <View style={row}>
            <PressableScale kind="card" onPress={() => setXp((v) => v + 137)} style={[{ borderWidth: theme.layout.borderWidth, gap: theme.spacing.xs, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg, padding: theme.spacing.lg }]}>
              <Odometer value={xp} variant="stat" cacheKey="dev.xp" />
              <AppText variant="caption" color="textMuted">XP (dokun: +137)</AppText>
            </PressableScale>
            <Odometer value={xp % 100} variant="hero" />
            <Odometer value={42 + (tick % 7)} variant="numeric" format={(n) => `${n}/50 dk`} />
          </View>
          <PressableScale kind="row" onPress={() => { setPull(false); setTimeout(() => setPull(true), 50); }} style={{ alignSelf: 'flex-start', padding: theme.spacing.sm, borderRadius: theme.radius.md }}>
            <FocusPull text="82,25 net" variant="hero" play={pull} />
          </PressableScale>
        </Section>

        <Section title="Yükleniyor">
          <View style={row}>
            <Loader />
            <Loader size={theme.spacing.md} />
            <View style={{ backgroundColor: theme.colors.primary, borderRadius: theme.radius.button, paddingHorizontal: theme.spacing.lg }}>
              <Loader color={theme.colors.onPrimary} />
            </View>
          </View>
        </Section>

        <Section title="İkonlar">
          <View style={row}>
            {NEW_ICONS.map((n) => (
              <Icon key={n} name={n} size={theme.layout.iconSize.lg} />
            ))}
          </View>
          <View style={row}>
            {NEW_ICONS.slice(0, 8).map((n) => (
              <Icon key={n} name={n} size={theme.layout.iconSize.lg} duotone weight="bold" color={theme.colors.primaryText} />
            ))}
          </View>
        </Section>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', alignSelf: 'center' },
  hit: { alignItems: 'center', justifyContent: 'center' },
});

// ---- P0c content primitives -------------------------------------------------------------

function KitPage({ title, part, children }: { title: string; part: KitPart; children: ReactNode }) {
  const theme = useTheme();
  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={[styles.content, { maxWidth: theme.layout.dashboardWidth, padding: theme.spacing.lg, gap: theme.spacing.xl }]}
      >
        <KitNav current={part} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xl }}>{children}</View>
      </ScrollView>
    </>
  );
}

/** A column that sits beside its sibling on wide windows and stacks on phones. */
function KitCol({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <View style={{ flexGrow: 1, flexBasis: theme.layout.readableWidth / 2, gap: theme.spacing.lg }}>{children}</View>;
}

function PrimitiveKit() {
  const theme = useTheme();
  const tick = useDemoTick();
  const [seg, setSeg] = useState<'tyt' | 'ayt' | 'all'>('tyt');
  const [chips, setChips] = useState<string[]>(['Matematik']);
  const [xp, setXp] = useState(0.62);
  const row = { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm } as const;
  const toggle = (c: string) => setChips((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));
  return (
    <KitPage title="Dev kit: düğmeler" part="prim">
      <KitCol>
        <Section title="Düğmeler">
          <View style={row}>
            <Button label="Fotoğraf çek" icon="camera" size="lg" onPress={() => {}} />
            <Button label="Galeriden seç" variant="secondary" icon="image" onPress={() => {}} />
          </View>
          <View style={row}>
            <Button label="Kodla" size="sm" onPress={() => {}} />
            <Button label="Örnek soruyu çöz" variant="ghost" icon="sparkles" onPress={() => {}} />
            <Button label="Sil" variant="danger" size="sm" onPress={() => {}} />
          </View>
          <View style={row}>
            <Button label="Doğru" variant="success" selected={tick % 2 === 0} size="sm" onPress={() => {}} />
            <Button label="Yanlış" variant="danger" selected={tick % 2 === 1} size="sm" onPress={() => {}} />
            <Button label="Boş" variant="neutral" size="sm" onPress={() => {}} />
          </View>
          <View style={row}>
            <Button label="Yükleniyor" loading onPress={() => {}} />
            <Button label="Henüz değil" disabled={tick % 2 === 0} onPress={() => {}} />
          </View>
        </Section>
        <Section title="Seçim">
          <SegmentedControl
            options={[{ value: 'tyt', label: 'TYT' }, { value: 'ayt', label: 'AYT' }, { value: 'all', label: 'Hepsi' }]}
            value={seg}
            onChange={setSeg}
          />
          <View style={row}>
            <Chip label="Bugün" selected={tick % 2 === 0} onPress={() => {}} />
            {(['Matematik', 'Fizik', 'Kimya'] as const).map((s) => (
              <Chip key={s} label={s} color={theme.colors.subject[s]} selected={chips.includes(s)} onPress={() => toggle(s)} />
            ))}
            <Chip label="Filtre" icon="list-filter" onPress={() => {}} />
          </View>
          <View style={row}>
            <Badge label="TYT" />
            <Badge label="Fizik" dot={theme.colors.subject.Fizik} />
            <Badge label="Yeni" icon="sparkles" color={theme.colors.success} background={theme.colors.successSoft} />
          </View>
        </Section>
      </KitCol>
      <KitCol>
        <Section title="İlerleme">
          <PressableScale kind="card" onPress={() => setXp((v) => (v + 0.25 > 1 ? v + 0.25 - 1 : v + 0.25))} style={{ gap: theme.spacing.sm }}>
            <AppText variant="caption" color="textMuted">Oluk (dokun: +%25, taşınca parlama)</AppText>
            <ProgressBar progress={xp} />
          </PressableScale>
          <ProgressBar variant="plain" progress={(tick % 5) / 4} color={theme.colors.primary} trackColor={theme.colors.primarySoft} />
        </Section>
        <Section title="Alanlar">
          <TextField label="Kullanıcı adı" placeholder="doga" />
          <TextField label="Şifre" secret hint="En az 8 karakter" error={tick % 4 === 3} />
        </Section>
      </KitCol>
    </KitPage>
  );
}

function PaperKit() {
  const theme = useTheme();
  const tick = useDemoTick();
  const [drawn, setDrawn] = useState(true);
  const [done, setDone] = useState(false);
  useEffect(() => {
    // Seed one persisted mark so the "already drawn" path shows on first paint.
    useCompanionStore.setState((s) => (s.marked.includes('dev.persist') ? s : { marked: [...s.marked, 'dev.persist'] }));
  }, []);
  return (
    <KitPage title="Dev kit: kağıt" part="paper">
      <KitCol>
        <Section title="Fosforlu kalem">
          <PressableScale kind="row" onPress={() => setDrawn((d) => !d)} style={{ padding: theme.spacing.sm, borderRadius: theme.radius.md }}>
            <Highlight id="dev.hl" drawn={drawn}>
              <AppText variant="heading">5 soru tekrar bekliyor</AppText>
            </Highlight>
          </PressableScale>
          <Highlight drawn={tick % 2 === 0}>
            <AppText variant="hero">249</AppText>
          </Highlight>
          <PressableScale kind="row" onPress={() => setDone((d) => !d)} style={{ padding: theme.spacing.sm, borderRadius: theme.radius.md }}>
            <Highlight persistKey="dev.persist" done={done}>
              <AppText variant="body">25 dakika odaklan (dokun: bitti)</AppText>
            </Highlight>
          </PressableScale>
        </Section>
        <SectionHeader title="Sıradakiler" count={5} action={{ label: 'Tümü', icon: 'chevron-right', onPress: () => {} }} />
        <SectionHeader title="Fizik" count={3} swipe={subjectSoftColor(theme, 'Fizik')} />
        <Note title="Lumi" action={{ label: 'Tekrara başla', onPress: () => {} }} onClose={() => {}}>
          Bugün 5 soru seni bekliyor. Hepsi yaklaşık 6 dakika.
        </Note>
      </KitCol>
      <KitCol>
        <Card title="Bugünün optiği" action={{ label: 'Düzenle', icon: 'square-pen', onPress: () => {} }}>
          <AppText>Sheet: kenarı olan kağıt.</AppText>
        </Card>
        <Card variant="hero" title="YKS'ye 249 gün">
          <AppText color="textMuted">Hero: üstte kareli.</AppText>
        </Card>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Card variant="flat" style={{ flex: 1 }}>
            <AppText>Flat</AppText>
          </Card>
          <Card accent={theme.colors.subject.Matematik} onPress={() => {}} style={{ flex: 1 }}>
            <AppText>Kenarlı, dokunulur</AppText>
          </Card>
        </View>
        <Viewfinder aspect="16:10" label="Soruyu çerçeveye al" onPress={() => {}} />
      </KitCol>
    </KitPage>
  );
}
