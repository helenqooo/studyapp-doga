import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { api } from '../../../api/client';
import { useAddMessages, useMessages } from '../../../api/hooks';
import { AppText } from '../../../components/AppText';
import { ChatView } from '../../../components/chat/ChatView';
import { QuestionImage } from '../../../components/QuestionImage';
import { useTheme } from '../../../theme';

const SUGGESTIONS = [
  'Çözümün ilk adımını anlamadım',
  'Bu formül nereden geldi?',
  'Daha basit anlatır mısın?',
  'Bana benzer bir soru verir misin?',
];

/** "Soru sohbeti": a short chat about one solved question; replies stream and type out. */
export default function ChatScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const thread = useMessages(id);
  const add = useAddMessages(id);
  const send = useCallback(
    (content: string, onDelta: (t: string) => void, signal: AbortSignal) => api.sendMessage(id, content, onDelta, signal),
    [id],
  );

  const items = thread.data?.items ?? [];
  const limit = thread.data?.limit ?? 10;
  const asked = items.filter((m) => m.role === 'user').length;

  return (
    <ChatView
      header={<QuestionImage questionId={id} size="compact" cap={theme.layout.question.chatImageCap} pillPlacement="below" />}
      messages={items}
      loading={thread.isPending}
      loadError={thread.isError ? thread.error : null}
      onRetry={() => thread.refetch()}
      intro={<AppText align="center">Bu soruda neyi anlamadın? Kendi cümlelerinle sor ya da birini seç.</AppText>}
      suggestions={SUGGESTIONS}
      send={send}
      onSent={add}
      placeholder="Sorunu yaz…"
      closedNote={asked >= limit ? `Bu soru için soru hakkın doldu (${limit}/${limit}).` : null}
      footnote={`${asked}/${limit} soru`}
    />
  );
}
