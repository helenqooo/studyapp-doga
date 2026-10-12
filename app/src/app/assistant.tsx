import { Stack } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '../api/client';
import { useAddAssistantMessages, useAssistantThread, useClearAssistant, useProfile, useReviewsToday } from '../api/hooks';
import { AppText } from '../components/AppText';
import { ChatView } from '../components/chat/ChatView';
import { Icon } from '../components/Icon';
import { Mascot, type MascotMood } from '../components/mascot/Mascot';
import { ASSISTANT_NAME } from '../brand';
import { haptics } from '../lib/haptics';
import { useTheme } from '../theme';

/** Openers that fit the student's day. */
function suggestions(due: number, streak: number): string[] {
  return [
    'Bugün ne çalışayım?',
    due ? `${due} tekrar sorusunu nasıl bitireyim?` : 'Bu hafta için kısa bir plan yapar mısın?',
    'Deneme netlerimi yorumla',
    'Türevi kısaca anlatır mısın?',
    streak ? 'Motivasyonum düştü' : 'Seriye nasıl başlarım?',
  ];
}

/** The assistant: a general study chat with Lumi that knows the student's numbers. */
export default function AssistantScreen() {
  const theme = useTheme();
  const thread = useAssistantThread();
  const add = useAddAssistantMessages();
  const clear = useClearAssistant();
  const profile = useProfile();
  const reviews = useReviewsToday();
  const [mood, setMood] = useState<MascotMood>('wave');
  const send = useCallback(
    (content: string, onDelta: (t: string) => void, signal: AbortSignal) => api.sendAssistantMessage(content, onDelta, signal),
    [],
  );

  const items = thread.data?.items ?? [];
  const remaining = thread.data?.remainingToday;

  return (
    <>
      <Stack.Screen
        options={{
          title: ASSISTANT_NAME,
          headerRight: () =>
            items.length ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Yeni sohbet"
                hitSlop={theme.spacing.sm}
                onPress={() => {
                  haptics.tap();
                  clear.mutate();
                  setMood('wave');
                }}
                style={{ minWidth: theme.layout.minTouch, minHeight: theme.layout.minTouch, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="square-pen" color={theme.colors.primaryText} />
              </Pressable>
            ) : null,
        }}
      />
      <ChatView
        messages={items}
        loading={thread.isPending}
        loadError={thread.isError ? thread.error.message : null}
        intro={
          <View style={{ alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.md }}>
            <Mascot mood={mood} size={theme.layout.mascot.hero} />
            <AppText variant="title" align="center">
              Selam, ben {ASSISTANT_NAME}!
            </AppText>
            <AppText color="textMuted" align="center">
              Plan yapalım, bir konuyu anlatayım ya da netlerine bakalım. Serini, tekrarlarını ve denemelerini biliyorum.
            </AppText>
          </View>
        }
        suggestions={suggestions(reviews.data?.items.length ?? 0, profile.data?.streak ?? 0)}
        send={send}
        onSent={add}
        onMood={setMood}
        placeholder={`${ASSISTANT_NAME}'ye yaz…`}
        closedNote={remaining === 0 ? 'Bugünlük mesaj hakkın doldu. Yarın yine konuşalım!' : null}
        footnote={remaining !== undefined ? `Bugün ${remaining} mesaj hakkın kaldı` : undefined}
      />
    </>
  );
}
