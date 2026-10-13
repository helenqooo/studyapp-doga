import { Redirect, router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { CompanionPerch } from '../components/companion/Perch';
import { Highlight } from '../components/Highlight';
import { Mascot, type Held, type MascotMood } from '../components/mascot/Mascot';
import { POSES } from '../components/mascot/poses';
import { Note } from '../components/Note';
import { Screen } from '../components/Screen';
import { SegmentedControl } from '../components/SegmentedControl';
import { emptyMemory, highlightKey, saveMemory } from '../lib/companionPersist';
import { LINE_BANK, lineDef, resolveLine, type LineContext, type LineDef } from '../lib/lumiLines';
import { useCompanionContext } from '../lib/useCompanionContext';
import { useAuthStore } from '../store/authStore';
import { useCompanionStore, type CompanionEvent } from '../store/companionStore';
import { usePrefsStore, type TalkLevel } from '../store/prefsStore';
import { useTheme } from '../theme';

// Dev-only Lumi lab (design spec P1): every line in the bank on a button, every event the
// companion listens to, the day's highlight flight on a local target, the talk levels,
// snooze and ember, and a pose bench for the Mascot props. Production builds go home.

const DAY_MS = 86_400_000;
const FLIGHT_TARGET = 'dev.tekrar';
const FLIGHT_PERCH = 'dev-perch';

const TALK: { value: TalkLevel; label: string }[] = [
  { value: 'often', label: 'Sık' },
  { value: 'sometimes', label: 'Ara sıra' },
  { value: 'quiet', label: 'Sessiz' },
];

/** Stand-ins for context the demo data may not have, so every line can be read. */
function withSamples(c: LineContext): LineContext {
  return {
    ...c,
    due: c.due || 5,
    oldest: c.oldest ?? { topic: 'Türev', days: 4 },
    rival: c.rival ?? { name: 'Elif', xp: 35 },
    badgeNear: c.badgeNear ?? { id: 'streak-7', name: '7 günlük seri', left: '1 gün' },
    exams: c.exams ?? { count: 3, lastDaysAgo: 9, thisWeek: false },
    timer: { ...c.timer, pausedMin: c.timer.pausedMin ?? 12 },
    daysToYks: c.daysToYks ?? 100,
    xpToNext: c.xpToNext ?? 15,
    awayDays: c.awayDays || 3,
    streak: c.streak || 4,
    longest: c.longest || 6,
  };
}

const EVENTS: { label: string; e: CompanionEvent }[] = [
  { label: 'Pomodoro bitti', e: { type: 'pomodoro.focusDone', minutes: 25, breakMinutes: 5, xp: 20, pomodorosToday: 1 } },
  { label: 'İkinci pomodoro', e: { type: 'pomodoro.focusDone', minutes: 25, breakMinutes: 5, xp: 20, pomodorosToday: 2 } },
  { label: 'Mola bitti', e: { type: 'pomodoro.breakDone' } },
  { label: 'Doğru', e: { type: 'answer.verdict', result: 'correct', hintsUsed: 0, source: 'solve' } },
  { label: 'İpucuyla doğru', e: { type: 'answer.verdict', result: 'correct', hintsUsed: 1, source: 'solve' } },
  { label: 'Yanlış', e: { type: 'answer.verdict', result: 'wrong', hintsUsed: 0, source: 'solve' } },
  { label: 'Tekrarlar bitti', e: { type: 'review.sessionDone', correct: 4, wrong: 1, remaining: 0 } },
  { label: 'Deneme yükseldi', e: { type: 'exam.saved', exam: 'TYT', net: 82.5, prevNet: 78.25, topSubject: 'Matematik', weakTopic: null } },
  { label: 'Deneme düştü', e: { type: 'exam.saved', exam: 'TYT', net: 74, prevNet: 78.25, topSubject: null, weakTopic: 'Problemler' } },
  { label: 'Hedefler tamam', e: { type: 'goals.allDone' } },
];

const MOODS = Object.keys(POSES) as MascotMood[];

export default function DevLumi() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Lab />;
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

function Wrap({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>{children}</View>;
}

/** The companion's live state on one line (its own component: phase changes re-render only this). */
function Status() {
  const phase = useCompanionStore((s) => s.phase);
  const current = useCompanionStore((s) => s.current?.id ?? null);
  const queued = useCompanionStore((s) => s.queue.length);
  const perch = useCompanionStore((s) => s.occupiedPerch);
  const yieldCount = useCompanionStore((s) => s.yieldCount);
  const snoozed = useCompanionStore((s) => s.snoozedUntil > Date.now());
  const draggedAway = useCompanionStore((s) => s.draggedAway);
  const status = [
    `Evre: ${phase}`,
    `Tünek: ${perch ?? 'yok'}`,
    `Satır: ${current ?? 'yok'}`,
    `Sırada: ${queued}`,
    `Yer açan: ${yieldCount}`,
    snoozed ? 'Sessiz' : null,
    draggedAway ? 'Uzaklaştırıldı' : null,
  ].filter(Boolean);
  return (
    <AppText variant="caption" color="textMuted">
      {status.join(', ')}
    </AppText>
  );
}

function Lab() {
  const theme = useTheme();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const talk = usePrefsStore((s) => s.talk);
  const setTalk = usePrefsStore((s) => s.setTalk);
  const readCtx = useCompanionContext();
  const snoozedUntil = useCompanionStore((s) => s.snoozedUntil);
  const draggedAway = useCompanionStore((s) => s.draggedAway);
  const marked = useCompanionStore((s) => s.marked.includes(highlightKey(FLIGHT_TARGET)));
  const [done, setDone] = useState(false);

  const context = () => {
    const now = Date.now();
    return withSamples(readCtx(now, { firstOpenToday: true, lastActiveAt: now - 3 * DAY_MS, firstRun: true }));
  };

  const sayDef = (def: LineDef, over: { target?: string; perch?: string } = {}) => {
    const ctx = context();
    const unsolicited = def.kind === 'time' || def.kind === 'route';
    const line = resolveLine(def, ctx, unsolicited ? 'system' : 'user', () => undefined);
    // exam.* and timer.focusDone carry their text in the event; read them through it instead.
    if (!line.text) line.text = 'Bu satır bir olayla gelir: aşağıdaki olay düğmelerini dene.';
    useCompanionStore.getState().say({ ...line, ...over });
  };

  /** The day's highlight flight, here: fly to the local line, glide with the marker, land on the perch. */
  const playFlight = () => {
    setDone(false);
    useCompanionStore.getState().markDone(highlightKey(FLIGHT_TARGET));
    const def = lineDef('due.morning');
    if (def) sayDef(def, { target: FLIGHT_TARGET, perch: FLIGHT_PERCH });
  };

  /** Forgets today: lines may show again and the next Home open counts as the first of the day. */
  const resetDay = async (firstRun = false) => {
    if (!userId) return;
    const now = Date.now();
    await saveMemory(userId, { ...emptyMemory(now), lastActiveAt: now - DAY_MS, firstRunDone: !firstRun });
    useCompanionStore.setState((s) => ({ memoryNonce: s.memoryNonce + 1 }));
  };

  const snoozed = snoozedUntil > Date.now();

  return (
    <Screen title="Lumi laboratuvarı" subtitle="Satırlar, olaylar ve uçuş. Yalnızca geliştirmede." width="readable">
      <View style={{ gap: theme.spacing.xl }}>
        <Status />

        <Section title="İşaretleme uçuşu">
          <Card>
            <View style={{ gap: theme.spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.md }}>
                <CompanionPerch id={FLIGHT_PERCH} fallbackMood="wave" />
                <View style={{ flex: 1 }}>
                  <Note tilt>Lumi buraya konar. Sayfayı kaydırınca yuvaya döner, perch görünür olunca geri gelir.</Note>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <Highlight id={FLIGHT_TARGET} persistKey={highlightKey(FLIGHT_TARGET)} done={done}>
                  <AppText variant="title">Tekrar 0/5</AppText>
                </Highlight>
              </View>
              <Wrap>
                <Button label="Uçuşu oynat" size="sm" icon="highlighter" onPress={playFlight} />
                <Button label="Görev bitti" size="sm" variant="secondary" disabled={!marked} onPress={() => setDone(true)} />
              </Wrap>
            </View>
          </Card>
          <Wrap>
            <Button label="Günü sıfırla" size="sm" variant="secondary" onPress={() => resetDay()} />
            <Button
              label="Ana sayfada ilk açılış"
              size="sm"
              variant="secondary"
              onPress={async () => {
                await resetDay();
                router.navigate('/');
              }}
            />
            <Button label="İlk tanışmayı sıfırla" size="sm" variant="secondary" onPress={() => resetDay(true)} />
          </Wrap>
        </Section>

        <Section title="Konuşkanlık">
          <SegmentedControl options={TALK} value={talk} onChange={setTalk} />
          <Wrap>
            <Button
              label={snoozed ? 'Uyandır' : 'Bugün sessiz ol'}
              size="sm"
              variant="secondary"
              onPress={() => {
                const st = useCompanionStore.getState();
                if (snoozed) st.snooze(0);
                else {
                  const d = new Date();
                  d.setHours(24, 0, 0, 0);
                  st.snooze(d.getTime());
                }
              }}
            />
            <Button
              label={draggedAway ? 'Lumi geri gelsin' : 'Uzaklaştır (kor kalsın)'}
              size="sm"
              variant="secondary"
              onPress={() => useCompanionStore.setState({ draggedAway: !draggedAway })}
            />
            <Button label="Notu kapat" size="sm" variant="ghost" onPress={() => useCompanionStore.getState().dismiss()} />
          </Wrap>
        </Section>

        <Section title="Olaylar">
          <Wrap>
            {EVENTS.map(({ label, e }) => (
              <Chip key={label} label={label} onPress={() => useCompanionStore.getState().emit(e)} />
            ))}
          </Wrap>
        </Section>

        <Section title="Satır bankası">
          <AppText variant="caption" color="textMuted">
            Her satır olduğu gibi söylenir, kurallar atlanır. Hedefi bu sayfada olmayan satırlar yuvadan konuşur.
          </AppText>
          <Wrap>
            {LINE_BANK.map((def) => (
              <Chip key={def.id} label={def.id} onPress={() => sayDef(def)} />
            ))}
          </Wrap>
        </Section>

        <PoseBench />
      </View>
    </Screen>
  );
}

/** The Mascot's props side by side: every mood (fly included), the marker, facing and the wardrobe. */
function PoseBench() {
  const theme = useTheme();
  const [mood, setMood] = useState<MascotMood>('fly');
  const [held, setHeld] = useState<Held | null | undefined>('marker');
  const [left, setLeft] = useState(false);
  const [glasses, setGlasses] = useState(false);
  const [hat, setHat] = useState<'party' | 'crown' | 'headphones' | null>(null);
  const [look, setLook] = useState<-1 | 0 | 1>(0);
  return (
    <Section title="Poz tezgâhı">
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xl, flexWrap: 'wrap' }}>
          <Mascot
            mood={mood}
            size={theme.layout.mascot.hero}
            held={held}
            facing={left ? 'left' : 'right'}
            lookAt={look}
            outfit={{ head: hat, face: glasses ? 'glasses' : null }}
            onPress={() => {}}
          />
          <Mascot mood={mood} size={theme.layout.mascot.note} still held={held} facing={left ? 'left' : 'right'} lookAt={look} />
        </View>
      </Card>
      <Wrap>
        <Chip label="Kalem" selected={held === 'marker'} onPress={() => setHeld(held === 'marker' ? undefined : 'marker')} />
        <Chip label="Sola dön" selected={left} onPress={() => setLeft(!left)} />
        <Chip label="Sola bak" selected={look === -1} onPress={() => setLook(look === -1 ? 0 : -1)} />
        <Chip label="Sağa bak" selected={look === 1} onPress={() => setLook(look === 1 ? 0 : 1)} />
        <Chip label="Gözlük" selected={glasses} onPress={() => setGlasses(!glasses)} />
        <Chip label="Parti şapkası" selected={hat === 'party'} onPress={() => setHat(hat === 'party' ? null : 'party')} />
        <Chip label="Taç" selected={hat === 'crown'} onPress={() => setHat(hat === 'crown' ? null : 'crown')} />
        <Chip label="Kulaklık" selected={hat === 'headphones'} onPress={() => setHat(hat === 'headphones' ? null : 'headphones')} />
      </Wrap>
      <Wrap>
        {MOODS.map((m) => (
          <Chip key={m} label={m} selected={m === mood} onPress={() => setMood(m)} />
        ))}
      </Wrap>
    </Section>
  );
}
