import { useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMessages, useSendMessage } from '../../../api/hooks';
import type { ChatMessage } from '../../../api/types';
import { AppText } from '../../../components/AppText';
import { Card } from '../../../components/Card';
import { Chip } from '../../../components/Chip';
import { Icon } from '../../../components/Icon';
import { MathView } from '../../../components/math/MathView';
import { QuestionImage } from '../../../components/QuestionImage';
import { haptics } from '../../../lib/haptics';
import { useTheme } from '../../../theme';

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
          backgroundColor: theme.colors.primary,
          borderRadius: theme.radius.lg,
          borderBottomRightRadius: theme.radius.sm,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        }}
      >
        <AppText tint={theme.colors.textOnAccent} selectable>
          {message.content}
        </AppText>
      </View>
    );
  }
  return (
    <View
      style={{
        alignSelf: 'stretch',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderBottomLeftRadius: theme.radius.sm,
        borderWidth: theme.layout.borderWidth,
        borderColor: theme.colors.border,
        padding: theme.spacing.md,
      }}
    >
      <MathView markdown={message.content} />
    </View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
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
        contentContainerStyle={{ padding: theme.layout.screenPadding, gap: theme.spacing.md }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        <QuestionImage questionId={id} size="compact" />

        {thread.isPending ? <ActivityIndicator color={theme.colors.primary} /> : null}
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

        {items.map((m) => (
          <Bubble key={m.id} message={m} />
        ))}

        {pending ? (
          <>
            <Bubble message={{ id: 'pending', role: 'user', content: pending, createdAt: '' }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <ActivityIndicator color={theme.colors.primary} />
              <AppText variant="label" color="textMuted">
                Düşünüyor…
              </AppText>
            </View>
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
          paddingHorizontal: theme.layout.screenPadding,
          paddingTop: theme.spacing.sm,
          paddingBottom: insets.bottom + theme.spacing.sm,
          gap: theme.spacing.xs,
        }}
      >
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
                <Icon name="arrow.up.circle.fill" size={theme.layout.iconSize.xl} color={theme.colors.primary} />
              </Pressable>
            </View>
            <AppText variant="caption" color="textMuted" align="right">
              {asked}/{limit} soru
            </AppText>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
