import { useHeaderHeight } from 'expo-router/react-navigation';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { OnDelta } from '../../api/client';
import type { ChatExchange, ChatMessage } from '../../api/types';
import { haptics } from '../../lib/haptics';
import { useWindowLayout } from '../../lib/layout';
import { chatRows, useStreamingChat } from '../../lib/useStreamingChat';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Card } from '../Card';
import { Chip } from '../Chip';
import type { MascotMood } from '../mascot/Mascot';
import { Appear } from '../motion/Appear';
import { Loader } from '../motion/Loader';
import { ChatBubble, ChatComposer } from './ChatParts';

interface Props {
  /** Shown above the conversation (e.g. the question photo). */
  header?: ReactNode;
  messages: ChatMessage[];
  loading: boolean;
  loadError?: string | null;
  /** Shown when there are no messages yet, above the suggestions. */
  intro?: ReactNode;
  suggestions: string[];
  send: (content: string, onDelta: OnDelta, signal: AbortSignal) => Promise<ChatExchange>;
  /** Stores a finished exchange (in the query cache). */
  onSent: (result: ChatExchange) => void;
  placeholder: string;
  /** Replaces the composer (e.g. the message limit was reached). */
  closedNote?: string | null;
  /** Small text under the composer. */
  footnote?: string;
  /** What the assistant is doing, for an avatar shown elsewhere (header). */
  onMood?: (mood: MascotMood) => void;
}

/**
 * A chat with the assistant: the thread, a reply that streams in and types itself out,
 * suggestion chips for the first message, and the composer.
 */
export function ChatView({ header, messages, loading, loadError, intro, suggestions, send, onSent, placeholder, closedNote, footnote, onMood }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const win = useWindowLayout();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  // The live reply whose typing animation has finished.
  const [typedKey, setTypedKey] = useState<string | null>(null);

  const done = useCallback(
    (result: ChatExchange) => {
      haptics.success();
      onSent(result);
    },
    [onSent],
  );
  const { live, submit } = useStreamingChat(send, done);
  // A reply still typing out doesn't block the next message (sending shows it in full).
  const busy = live?.status === 'waiting' || live?.status === 'streaming';
  const typing = live?.status === 'done' && typedKey !== live.key;
  const rows = chatRows(messages, live);
  const lastAssistant = [...rows].reverse().find((r) => r.role === 'assistant')?.key;

  // The newest reply's avatar: thinking while waiting, talking while words appear.
  const avatarMood: MascotMood =
    live?.status === 'waiting' ? 'thinking' : live?.status === 'streaming' || typing ? 'talking' : live?.status === 'error' ? 'confused' : 'idle';

  const go = async (text: string) => {
    const content = text.trim();
    if (!content || busy || closedNote) return;
    haptics.tap();
    setDraft('');
    onMood?.('thinking');
    const ok = await submit(content);
    if (!ok) {
      haptics.error();
      setDraft(content);
      onMood?.('confused');
    } else {
      onMood?.('talking');
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={headerHeight} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: win.padding,
          gap: theme.spacing.md,
          width: '100%',
          maxWidth: theme.layout.readableWidth + win.padding * 2,
          alignSelf: 'center',
        }}
        keyboardShouldPersistTaps="handled"
        ref={scrollRef}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {header}
        {loading ? <Loader /> : null}
        {loadError ? (
          <Card background={theme.colors.dangerSoft}>
            <AppText color="danger">{loadError}</AppText>
          </Card>
        ) : null}

        {!loading && !loadError && rows.length === 0 ? (
          <View style={{ gap: theme.spacing.md }}>
            {intro}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              {suggestions.map((s) => (
                <Chip key={s} label={s} onPress={() => go(s)} />
              ))}
            </View>
          </View>
        ) : null}

        {rows.map((row) =>
          row.role === 'assistant' ? (
            <Appear key={row.key}>
              <ChatBubble
                row={row}
                avatarMood={row.key === lastAssistant && live && row.key === live.key ? avatarMood : undefined}
                onTyped={
                  row.key === live?.key
                    ? () => {
                        setTypedKey(row.key);
                        onMood?.('happy');
                      }
                    : undefined
                }
              />
            </Appear>
          ) : (
            <Appear key={row.key}>
              <ChatBubble row={row} />
            </Appear>
          ),
        )}

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
          backgroundColor: theme.colors.surface,
          paddingHorizontal: win.padding,
          paddingTop: theme.spacing.sm,
          paddingBottom: insets.bottom + theme.spacing.sm,
        }}
      >
        <View style={{ width: '100%', maxWidth: theme.layout.readableWidth, alignSelf: 'center', gap: theme.spacing.xs }}>
          {closedNote ? (
            <AppText variant="label" color="textMuted" align="center">
              {closedNote}
            </AppText>
          ) : (
            <>
              <ChatComposer value={draft} onChange={setDraft} onSend={() => go(draft)} busy={busy} placeholder={placeholder} />
              {footnote ? (
                <AppText variant="caption" color="textMuted" align="right">
                  {footnote}
                </AppText>
              ) : null}
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
