import { useHeaderHeight } from 'expo-router/react-navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { OnDelta } from '../../api/client';
import type { ChatExchange, ChatMessage } from '../../api/types';
import { haptics } from '../../lib/haptics';
import { useWindowLayout } from '../../lib/layout';
import { chatRows, useStreamingChat } from '../../lib/useStreamingChat';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Chip } from '../Chip';
import type { MascotMood } from '../mascot/Mascot';
import { Appear } from '../motion/Appear';
import { Loader } from '../motion/Loader';
import { ErrorState } from '../states/ErrorState';
import { useTimerPillBottom } from '../TimerPill';
import { ChatBubble, ChatComposer, ContextChips, ContextSheets, PromptGrid, type ChatContextItem, type ChatPrompt } from './ChatParts';

export type { ChatContextItem, ChatPrompt } from './ChatParts';

/** Landscape: the context column spans this many of the 12 grid columns (spec 7.6). */
const ASIDE_COLUMNS = 4;

interface Props {
  /** Shown above the conversation (e.g. the question photo). */
  header?: ReactNode;
  messages: ChatMessage[];
  loading: boolean;
  /** The thread failed to load (the error itself, explained by ErrorState). */
  loadError?: unknown;
  onRetry?: () => void;
  /** Shown when there are no messages yet, above the starters. */
  intro?: ReactNode;
  /** Starters as chips, centered (the question chat). */
  suggestions?: string[];
  /** Starters as a 2×2 grid of cards (the assistant). */
  prompts?: ChatPrompt[];
  /** What the assistant knows: a column of sheets in landscape, a chip row otherwise. Tapping one asks about it. */
  context?: ChatContextItem[];
  send: (content: string, onDelta: OnDelta, signal: AbortSignal) => Promise<ChatExchange>;
  /** Stores a finished exchange (in the query cache). */
  onSent: (result: ChatExchange) => void;
  placeholder: string;
  /** Replaces the composer (e.g. the message limit was reached). */
  closedNote?: string | null;
  /** Small text under the composer. */
  footnote?: string;
  /**
   * What Lumi is doing, for a Lumi shown elsewhere (the header): `wave` before the first
   * message, `listening` while the student types, `thinking`, `talking`, `happy` when a reply
   * has typed out, `confused` on an error, `idle` otherwise. When set, reply avatars stay still.
   */
  onMood?: (mood: MascotMood) => void;
}

/**
 * A chat with the assistant: the thread at reading width, a reply that streams in and types
 * itself out, starters for the first message, and the composer. In landscape the context
 * column sits to the left of the thread.
 */
export function ChatView({
  header,
  messages,
  loading,
  loadError,
  onRetry,
  intro,
  suggestions,
  prompts,
  context,
  send,
  onSent,
  placeholder,
  closedNote,
  footnote,
  onMood,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const win = useWindowLayout();
  const pillBottom = useTimerPillBottom();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  // The live reply whose typing animation has finished, and whether Lumi is still pleased about it.
  const [typedKey, setTypedKey] = useState<string | null>(null);
  const [pleased, setPleased] = useState(false);

  // Bumped when the thread is cleared; a reply sent before that must not refill the new chat.
  const epoch = useRef(0);
  const sentIn = useRef(0);
  const done = useCallback(
    (result: ChatExchange) => {
      if (sentIn.current !== epoch.current) return;
      haptics.success();
      onSent(result);
    },
    [onSent],
  );
  const { live, submit, dismiss } = useStreamingChat(send, done);
  // The thread was cleared ("Yeni sohbet"): the last exchange goes with it.
  const hadMessages = useRef(messages.length > 0);
  useEffect(() => {
    if (messages.length === 0 && hadMessages.current) {
      epoch.current += 1;
      dismiss();
      setPleased(false);
    }
    hadMessages.current = messages.length > 0;
  }, [messages.length, dismiss]);
  // A reply still typing out doesn't block the next message (sending shows it in full).
  const busy = live?.status === 'waiting' || live?.status === 'streaming';
  const typing = live?.status === 'done' && typedKey !== live.key;
  const rows = chatRows(messages, live);
  const empty = !loading && !loadError && rows.length === 0;

  // What Lumi is doing right now; the newest reply's avatar (or the header Lumi) shows it.
  const mood: MascotMood =
    live?.status === 'waiting'
      ? 'thinking'
      : live?.status === 'streaming' || typing
        ? 'talking'
        : live?.status === 'error'
          ? 'confused'
          : pleased
            ? 'happy'
            : draft.trim() && !closedNote
              ? 'listening'
              : rows.length === 0
                ? 'wave'
                : 'idle';
  useEffect(() => {
    onMood?.(mood);
  }, [mood, onMood]);

  // "Happy" after a reply lasts one reaction, then Lumi settles.
  useEffect(() => {
    if (!pleased) return;
    const t = setTimeout(() => setPleased(false), theme.motion.mascot.reactionMs);
    return () => clearTimeout(t);
  }, [pleased, theme.motion.mascot.reactionMs]);

  const go = async (text: string) => {
    const content = text.trim();
    if (!content || busy || closedNote) return;
    haptics.tap();
    setDraft('');
    setPleased(false);
    sentIn.current = epoch.current;
    const ok = await submit(content);
    if (!ok) {
      haptics.error();
      setDraft(content);
    }
  };

  // Landscape (12 columns): the context column on the left, the thread in the rest.
  const aside = win.sizeClass === 'wide' && !!context?.length;
  const { gutter } = theme.layout.grid.wide;
  const contentWidth = Math.min(win.width - win.margin * 2, theme.layout.dashboardWidth);
  const asideWidth = ((contentWidth + gutter) * ASIDE_COLUMNS) / theme.layout.grid.wide.columns - gutter;
  const threadPad = aside ? 0 : win.margin;
  // Out of messages: starters and context stop being buttons (a tap would do nothing).
  const canAsk = !closedNote;
  const liveAvatar = !onMood;
  // Portrait and phone: the facts as chips, under the starters while the chat is empty, then over the thread.
  const chips = !aside && canAsk && !!context?.length;
  const blockGap = win.tablet ? theme.layout.screen.gap.tablet : theme.layout.screen.gap.compact;
  const barPad = win.tablet ? theme.spacing.md : theme.spacing.sm;
  // While a pomodoro runs, the TimerPill floats at the top right: the thread (and the aside,
  // so the two columns keep one top line) starts below it. The empty assistant's intro is
  // centered, clear of the pill, and keeps its room.
  const clearPill = pillBottom > 0 && (!empty || !!header);
  const topPad = clearPill ? Math.max(win.margin, pillBottom + theme.spacing.sm - headerHeight) : win.margin;

  const thread = (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: threadPad,
          paddingTop: topPad,
          paddingBottom: win.margin,
          gap: theme.spacing.md,
          width: '100%',
          maxWidth: theme.layout.readableWidth + threadPad * 2,
          alignSelf: 'center',
        }}
        keyboardShouldPersistTaps="handled"
        ref={scrollRef}
        onContentSizeChange={() => {
          if (!empty) scrollRef.current?.scrollToEnd({ animated: true });
        }}
      >
        {chips && rows.length > 0 ? <ContextChips items={context!} onPick={go} /> : null}
        {header}
        {loading ? <Loader /> : null}
        {loadError ? <ErrorState error={loadError} onRetry={onRetry} compact /> : null}

        {empty ? (
          <View style={{ flexGrow: 1, justifyContent: header ? 'flex-start' : 'center', gap: blockGap }}>
            {intro}
            {canAsk && prompts?.length ? <PromptGrid prompts={prompts} onPick={go} /> : null}
            {canAsk && suggestions?.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: theme.spacing.sm }}>
                {suggestions.map((s) => (
                  <Chip key={s} label={s} onPress={() => go(s)} />
                ))}
              </View>
            ) : null}
            {/* The empty chat keeps its facts under the starters, as one composition. */}
            {chips ? <ContextChips items={context!} onPick={go} heading /> : null}
          </View>
        ) : null}

        {rows.map((row, i) => {
          const prev = rows[i - 1];
          // Lumi shows once per group of replies; follow-ups keep the indent.
          const first = !prev || prev.role !== 'assistant';
          const isLive = !!live && row.key === live.key;
          const bubble =
            row.role === 'assistant' ? (
              <ChatBubble
                row={row}
                avatar={!first ? 'none' : liveAvatar && isLive ? 'live' : 'still'}
                avatarMood={isLive ? mood : undefined}
                onTyped={
                  isLive
                    ? () => {
                        setTypedKey(row.key);
                        setPleased(true);
                      }
                    : undefined
                }
              />
            ) : (
              <ChatBubble row={row} />
            );
          // Only the exchange the student just sent arrives with motion; the stored thread is simply there.
          return live && row.key.startsWith(live.key) ? (
            <Appear key={row.key}>{bubble}</Appear>
          ) : (
            <View key={row.key}>{bubble}</View>
          );
        })}

        {live?.status === 'error' ? (
          <AppText variant="label" color="danger">
            {live.error}
          </AppText>
        ) : null}
      </ScrollView>

      <View
        style={{
          borderTopWidth: theme.layout.borderWidth,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.background,
          paddingHorizontal: threadPad,
          paddingTop: barPad,
          paddingBottom: insets.bottom + barPad,
        }}
      >
        <View style={{ width: '100%', maxWidth: theme.layout.readableWidth, alignSelf: 'center', gap: theme.spacing.sm }}>
          {closedNote ? (
            <AppText variant="label" color="textMuted" align="center" style={{ paddingVertical: theme.spacing.md }}>
              {closedNote}
            </AppText>
          ) : (
            <>
              <ChatComposer value={draft} onChange={setDraft} onSend={() => go(draft)} busy={busy} placeholder={placeholder} />
              {footnote ? (
                <AppText variant="caption" color="textMuted" align="center">
                  {footnote}
                </AppText>
              ) : null}
            </>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={headerHeight} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {aside ? (
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            gap: gutter,
            width: '100%',
            maxWidth: theme.layout.dashboardWidth + win.margin * 2,
            alignSelf: 'center',
            paddingHorizontal: win.margin,
          }}
        >
          <ScrollView style={{ width: asideWidth, flexGrow: 0 }} contentContainerStyle={{ paddingTop: topPad, paddingBottom: win.margin }}>
            <ContextSheets items={context!} onPick={canAsk ? go : undefined} />
          </ScrollView>
          {thread}
        </View>
      ) : (
        thread
      )}
    </KeyboardAvoidingView>
  );
}
