import { Stack } from 'expo-router';
import { useCallback, useEffect, useId, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { api } from '../api/client';
import {
  useAddAssistantMessages,
  useAssistantThread,
  useClearAssistant,
  useExams,
  useOverview,
  useProfile,
  useReviewsToday,
} from '../api/hooks';
import type { ExamResult } from '../api/types';
import { AppText } from '../components/AppText';
import { ChatView, type ChatContextItem, type ChatPrompt } from '../components/chat/ChatView';
import { Kareli } from '../components/Kareli';
import { Mascot, type MascotMood } from '../components/mascot/Mascot';
import { ease, enter, exit } from '../components/motion/presets';
import { HeaderAction } from '../components/Screen';
import { ASSISTANT_NAME } from '../brand';
import { getTopic } from '../data/topics';
import { formatDelta, formatNet } from '../lib/format';
import { haptics } from '../lib/haptics';
import { useWindowLayout } from '../lib/layout';
import { useTheme, type Theme } from '../theme';

// TOKEN-PENDING: layout.chat.headerMascot = 32 (the live Lumi in the assistant's header, spec 7.6)
const HEADER_MASCOT = 32;
// TOKEN-PENDING: motion.duration.rmFade = 120 (the Reduce Motion cross-fade, spec 0.7 / 5.6)
const RM_FADE_MS = 120;
// TOKEN-PENDING: layout.chat.patchClear = 0.5 (share of the hero patch, from its center, where the graph paper is still unfaded)
const PATCH_CLEAR = 0.5;
// TOKEN-PENDING: layout.chat.heroShare = 0.18 (the intro Lumi is never taller than this share of the window, so a short landscape iPad keeps the starters above the composer)
const HERO_SHARE = 0.18;

/** The header caption: what Lumi is doing. */
function statusOf(mood: MascotMood): string {
  switch (mood) {
    case 'thinking':
      return 'Düşünüyor…';
    case 'talking':
      return 'Yazıyor…';
    case 'listening':
      return 'Dinliyor…';
    case 'confused':
      return 'Bir aksilik oldu';
    default:
      return 'Hazır';
  }
}

/** Starters for an empty thread (2×2 cards). */
const PROMPTS: ChatPrompt[] = [
  { text: 'Bugün ne çalışayım?', icon: 'calendar-days' },
  { text: 'Deneme netlerimi yorumla', icon: 'chart-spline' },
  { text: 'Türevi kısaca anlatır mısın?', icon: 'lightbulb' },
  { text: 'Motivasyonum düştü, ne yapayım?', icon: 'heart' },
];

/** The newest exam and the one before it of the same kind (for the change). */
function lastExam(items: ExamResult[] | undefined): { exam: ExamResult; prev: ExamResult | null } | null {
  if (!items?.length) return null;
  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const exam = sorted[0];
  return { exam, prev: sorted.slice(1).find((e) => e.exam === exam.exam) ?? null };
}

/** "Lumi'nin bildikleri": facts from the student's day, each one a question to ask. */
function contextItems(
  theme: Theme,
  streak: number | undefined,
  due: number,
  last: ReturnType<typeof lastExam>,
  lossTopicId: string | undefined,
): ChatContextItem[] {
  const out: ChatContextItem[] = [];
  if (streak !== undefined) {
    out.push(
      streak > 0
        ? {
            key: 'streak',
            icon: 'flame',
            tint: theme.colors.streak,
            label: `Serin ${streak} gün`,
            hint: 'Seriyi bugün nasıl korurum?',
            prompt: `Serim ${streak} gün. Bugün seriyi korumak için ne yapayım?`,
          }
        : {
            key: 'streak',
            icon: 'flame',
            tint: theme.colors.streak,
            label: 'Seri bugün başlayabilir',
            hint: 'Seriye nasıl başlarım?',
            prompt: 'Seriye bugün nasıl başlarım?',
          },
    );
  }
  if (due > 0) {
    out.push({
      key: 'reviews',
      icon: 'repeat',
      label: `${due} tekrar bekliyor`,
      hint: 'Tekrarları nasıl bitireyim?',
      prompt: `${due} tekrar sorum bekliyor. En verimli nasıl bitiririm?`,
    });
  }
  if (last) {
    const { exam, prev } = last;
    const delta = prev ? formatDelta(exam.totalNet - prev.totalNet) : null;
    out.push({
      key: 'exam',
      icon: 'chart-spline',
      label: `Son ${exam.exam} ${formatNet(exam.totalNet)}${delta ? ` (${delta})` : ''}`,
      hint: 'Bu denemeyi yorumla',
      prompt: `Son ${exam.exam} denememde ${formatNet(exam.totalNet)} net yaptım${delta ? ` (öncekine göre ${delta})` : ''}. Nasıl yorumlarsın?`,
    });
  }
  const topic = getTopic(lossTopicId);
  if (topic) {
    const name = topic.subtopic ?? topic.topic;
    out.push({
      key: 'loss',
      icon: 'trending-down',
      // The name's last two words stay together, so a wrapped label never leaves one word alone.
      label: `En çok net kaybı: ${name.replace(/ (\S+)$/, '\u00A0$1')}`,
      hint: 'Bu konuyu nasıl toparlarım?',
      prompt: `En çok net kaybım ${name} konusunda. Nasıl toparlarım?`,
    });
  }
  return out;
}

/** The assistant: a general study chat with Lumi that knows the student's numbers. */
export default function AssistantScreen() {
  const theme = useTheme();
  const win = useWindowLayout();
  const thread = useAssistantThread();
  const add = useAddAssistantMessages();
  const clear = useClearAssistant();
  const profile = useProfile();
  const reviews = useReviewsToday();
  const exams = useExams();
  const overview = useOverview();
  const [mood, setMood] = useState<MascotMood>('wave');
  const send = useCallback(
    (content: string, onDelta: (t: string) => void, signal: AbortSignal) => api.sendAssistantMessage(content, onDelta, signal),
    [],
  );

  const items = thread.data?.items ?? [];
  const remaining = thread.data?.remainingToday;

  const context = contextItems(theme, profile.data?.streak, reviews.data?.items.length ?? 0, lastExam(exams.data?.items), overview.data?.topicLosses[0]?.topicId);

  const hero = Math.min(theme.layout.mascot.hero, Math.round(win.height * HERO_SHARE));
  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => <AssistantTitle mood={mood} />,
          headerRight: () =>
            items.length ? (
              // Arrives with the first exchange and leaves with "Yeni sohbet": a fade, not a pop.
              <Animated.View entering={enter({ still: true, duration: theme.motion.duration.base })} exiting={exit()}>
                <HeaderAction
                  icon="square-pen"
                  label="Yeni sohbet"
                  onPress={() => {
                    haptics.tap();
                    clear.mutate();
                  }}
                />
              </Animated.View>
            ) : null,
        }}
      />
      <ChatView
        messages={items}
        loading={thread.isPending}
        loadError={thread.isError ? thread.error : null}
        onRetry={() => thread.refetch()}
        intro={
          <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
            {/* Lumi on a patch of graph paper. */}
            <View
              style={{
                width: hero + theme.spacing.xxxl * 2,
                height: hero + theme.spacing.xl,
                alignItems: 'center',
                justifyContent: 'flex-end',
                borderRadius: theme.radius.lg,
                borderCurve: 'continuous',
                overflow: 'hidden',
              }}
            >
              <Kareli height={hero + theme.spacing.xl} style={StyleSheet.absoluteFill} />
              <PatchVignette />
              <Mascot mood={mood} size={hero} />
            </View>
            <AppText variant="title" align="center">
              Selam, ben {ASSISTANT_NAME}!
            </AppText>
            <AppText align="center" color="textMuted">
              Plan yapalım, bir konuyu anlatayım ya da netlerine bakalım.
            </AppText>
          </View>
        }
        prompts={PROMPTS}
        context={context}
        send={send}
        onSent={add}
        onMood={setMood}
        placeholder={`${ASSISTANT_NAME}'ye yaz…`}
        closedNote={remaining === 0 ? 'Bugünlük mesaj hakkın doldu. Yarın yine konuşalım!' : null}
        footnote={remaining !== undefined ? `Bugün ${remaining} mesaj hakkın var` : undefined}
      />
    </>
  );
}

/** Softens the graph-paper patch into the page on every side (Kareli only fades downward). */
function PatchVignette() {
  const theme = useTheme();
  const id = `patch${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none" aria-hidden>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset={PATCH_CLEAR} stopColor={theme.colors.background} stopOpacity={0} />
          <Stop offset={1} stopColor={theme.colors.background} stopOpacity={1} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** The header: a live 32 pt Lumi that mirrors the chat, its name and what it is doing. */
function AssistantTitle({ mood }: { mood: MascotMood }) {
  const theme = useTheme();
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${ASSISTANT_NAME}, ${statusOf(mood)}`}
    >
      <View style={{ width: HEADER_MASCOT, height: HEADER_MASCOT }}>
        <Mascot size={HEADER_MASCOT} mood={mood} interactive={false} />
      </View>
      <View>
        <AppText variant="heading" numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {ASSISTANT_NAME}
        </AppText>
        <CrossFadeCaption text={statusOf(mood)} />
      </View>
    </View>
  );
}

/**
 * A caption whose text changes cross-fade: each text is its own layer that fades in from 0 on
 * mount (so it never flashes in at full strength), and the outgoing one fades out over it.
 */
function CrossFadeCaption({ text }: { text: string }) {
  const [state, setState] = useState({ cur: text, prev: null as string | null, n: 0 });
  if (state.cur !== text) setState({ cur: text, prev: state.cur, n: state.n + 1 });

  return (
    <View>
      <CaptionLayer key={`in${state.n}`} text={state.cur} from={state.n ? 0 : 1} to={1} />
      {state.prev !== null ? <CaptionLayer key={`out${state.n}`} text={state.prev} from={1} to={0} outgoing /> : null}
    </View>
  );
}

function CaptionLayer({ text, from, to, outgoing = false }: { text: string; from: number; to: number; outgoing?: boolean }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const o = useSharedValue(from);
  useEffect(() => {
    if (from === to) return;
    o.value = withTiming(to, {
      duration: reduceMotion ? RM_FADE_MS : theme.motion.duration.base,
      easing: ease('standard'),
      reduceMotion: ReduceMotion.Never,
    });
    // Plays once per layer (layers are keyed per text change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      pointerEvents="none"
      aria-hidden={outgoing || undefined}
      style={[outgoing ? { position: 'absolute', left: 0, top: 0 } : null, style]}
    >
      <AppText variant="caption" color="textMuted" numberOfLines={1} maxFontSizeMultiplier={1.2} accessible={!outgoing}>
        {text}
      </AppText>
    </Animated.View>
  );
}
