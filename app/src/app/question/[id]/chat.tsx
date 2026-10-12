import { useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMessages, useSendMessage } from '../../../api/hooks';
import type { ChatMessage } from '../../../api/types';
import { AppText } from '../../../components/AppText';
import { Card } from '../../../components/Card';
import { Chip } from '../../../components/Chip';
import { Icon } from '../../../components/Icon';
import { MathView } from '../../../components/math/MathView';
import { QuestionImage } from '../../../components/QuestionImage';
import { Appear } from '../../../components/motion/Appear';
import { Loader } from '../../../components/motion/Loader';
import { ThinkingSpark } from '../../../components/motion/ThinkingSpark';
import { haptics } from '../../../lib/haptics';
import { useWindowLayout } from '../../../lib/layout';
import { font, useTheme } from '../../../theme';

const SUGGESTIONS = [
  'Çözümün ilk adımını anlamadım',
  'Bu formül nereden geldi?',
  'Daha basit anlatır mısın?',
  'Bana benzer bir soru verir misin?',
];

function Bubble({ message }: { message: ChatMessage }) {
  const theme = useTheme();
  if (message.role === 'user') {
    return (
      <View
        style={{
          alignSelf: 'flex-end',
          maxWidth: '85%',
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.radius.lg,
          borderBottomRightRadius: theme.radius.sm,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        }}
      >
        <AppText selectable>
          {message.content}
        </AppText>
      </View>
    );
  }
  // Claude's answers read like a page, without a bubble, marked by the accent asterisk.
  return (
    <View style={{ alignSelf: 'stretch', flexDirection: 'row', gap: theme.spacing.sm }}>
      <Icon name="asterisk" size={theme.layout.iconSize.sm} color={theme.colors.accent} style={{ marginTop: theme.spacing.xs }} />
      <View style={{ flex: 1 }}>
        <MathView markdown={message.content} />
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const win = useWindowLayout();
  const thread = useMessages(id);
  const send = useSendMessage(id);
  const scrollRef = useRef<ScrollView>(null);

  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = thread.data?.items ?? [];
  const limit = thread.data?.limit ?? 10;
  const asked = items.filter((m) => m.role === 'user').length;
  const limitReached = asked >= limit;
  const busy = pending !== null;

  const submit = (text: string) => {
    const content = text.trim();
    if (!content || busy || limitReached) return;
    haptics.tap();
    setError(null);
    setPending(content);
    setDraft('');
    send.mutate(content, {
      onSuccess: () => haptics.success(),
      onError: (e) => {
        haptics.error();
        setError(e.message);
        setDraft(content);
      },
      onSettled: () => setPending(null),
    });
  };

  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={headerHeight} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: win.padding,
          gap: theme.spacing.md,
          width: '100%',
          maxWidth: theme.layout.readableWidth + win.padding * 2,
          alignSelf: 'center',
        }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        <QuestionImage questionId={id} size="compact" />

        {thread.isPending ? <Loader /> : null}
        {thread.isError ? (
          <Card background={theme.colors.dangerSoft}>
            <AppText color="danger">{thread.error.message}</AppText>
          </Card>
        ) : null}

        {thread.isSuccess && items.length === 0 && !busy ? (
          <View style={{ gap: theme.spacing.md }}>
            <AppText color="textMuted">Bu soruda neyi anlamadın? Kendi cümlelerinle sor ya da birini seç:</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              {SUGGESTIONS.map((s) => (
                <Chip key={s} label={s} onPress={() => submit(s)} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Only replies animate in: the user's message already did, as the pending bubble. */}
        {items.map((m) =>
          m.role === 'assistant' ? (
            <Appear key={m.id}>
              <Bubble message={m} />
            </Appear>
          ) : (
            <Bubble key={m.id} message={m} />
          ),
        )}

        {pending ? (
          <>
            <Appear>
              <Bubble message={{ id: 'pending', role: 'user', content: pending, createdAt: '' }} />
            </Appear>
            <Appear index={2} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <ThinkingSpark size={theme.layout.iconSize.lg} />
              <AppText variant="label" color="textMuted">
                Düşünüyor…
              </AppText>
            </Appear>
          </>
        ) : null}

        {error ? (
          <AppText variant="label" color="danger">
            {error}
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
          {limitReached ? (
            <AppText variant="label" color="textMuted" align="center">
              Bu soru için soru hakkın doldu ({limit}/{limit}).
            </AppText>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm }}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Sorunu yaz…"
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  maxLength={2000}
                  editable={!busy}
                  style={{
                    flex: 1,
                    minHeight: theme.layout.minTouch,
                    maxHeight: theme.layout.minTouch * 3,
                    paddingHorizontal: theme.spacing.md,
                    paddingTop: theme.spacing.md,
                    paddingBottom: theme.spacing.md,
                    borderRadius: theme.radius.lg,
                    backgroundColor: theme.colors.surfaceAlt,
                    color: theme.colors.text,
                    fontSize: theme.fontSize.md,
                    ...font('sans'),
                  }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Gönder"
                  disabled={busy || !draft.trim()}
                  onPress={() => submit(draft)}
                  style={{
                    width: theme.layout.minTouch,
                    height: theme.layout.minTouch,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: busy || !draft.trim() ? 0.4 : 1,
                  }}
                >
                  <Icon name="arrow-up" size={theme.layout.iconSize.xl} color={theme.colors.primaryText} />
                </Pressable>
              </View>
              <AppText variant="caption" color="textMuted" align="right">
                {asked}/{limit} soru
              </AppText>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
