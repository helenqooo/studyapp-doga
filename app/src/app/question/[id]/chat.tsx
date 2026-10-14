import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { api } from '../../../api/client';
import { useAddMessages, useMessages } from '../../../api/hooks';
import { AppText } from '../../../components/AppText';
import { Card } from '../../../components/Card';
import { ChatView } from '../../../components/chat/ChatView';
import { QuestionImage } from '../../../components/QuestionImage';
import { useWindowLayout } from '../../../lib/layout';
import { useTheme } from '../../../theme';

// TOKEN-PENDING: layout.chat.photoColumns = 5 (landscape: the question photo's share of the 12-column grid)
const PHOTO_COLUMNS = 5;

const SUGGESTIONS = [
  'Çözümün ilk adımını anlamadım',
  'Bu formül nereden geldi?',
  'Daha basit anlatır mısın?',
  'Bana benzer bir soru verir misin?',
];

/**
 * "Soru sohbeti": a short chat about one solved question; replies stream and type out.
 * Landscape: the question sheet stays in view on the left while the thread runs on the right;
 * otherwise the photo sits at the top of the thread.
 */
export default function ChatScreen() {
  const theme = useTheme();
  const win = useWindowLayout();
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
  const wide = win.sizeClass === 'wide';

  const chat = (
    <ChatView
      header={wide ? undefined : <QuestionImage questionId={id} size="compact" cap={theme.layout.question.chatImageCap} pillPlacement="below" />}
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
  if (!wide) return chat;

  const grid = theme.layout.grid.wide;
  const contentWidth = Math.min(win.width - win.margin * 2, theme.layout.dashboardWidth);
  const photoWidth = ((contentWidth + grid.gutter) * PHOTO_COLUMNS) / grid.columns - grid.gutter;
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.colors.background, paddingLeft: win.margin }}>
      <ScrollView style={{ width: photoWidth, flexGrow: 0 }} contentContainerStyle={{ paddingVertical: win.margin }}>
        <Card>
          <QuestionImage questionId={id} cap={theme.layout.question.imageCap.split} pillPlacement="below" />
        </Card>
      </ScrollView>
      <View style={{ flex: 1 }}>{chat}</View>
    </View>
  );
}
