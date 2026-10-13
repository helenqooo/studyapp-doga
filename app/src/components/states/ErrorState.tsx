import Animated from 'react-native-reanimated';
import { ApiError } from '../../api/errors';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Button } from '../Button';
import { Card } from '../Card';
import { MascotNote } from '../mascot/MascotNote';
import type { MascotMood } from '../mascot/Mascot';
import { useStateFade } from './EmptyState';

/** What went wrong, in the student's words, with Lumi's face to match. */
function describe(error: unknown): { mood: MascotMood; title: string; detail: string } {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const status = error instanceof ApiError ? error.status : undefined;
  if (status === 401) return { mood: 'confused', title: 'Oturumun kapanmış.', detail: 'Yeniden giriş yapınca kaldığın yerden devam edersin.' };
  if (status === 404) return { mood: 'confused', title: 'Bunu bulamadım.', detail: 'Silinmiş ya da taşınmış olabilir.' };
  if (status === 429) return { mood: 'sleepy', title: 'Biraz hızlı gittik.', detail: 'Kısa bir mola ver, sonra tekrar dene.' };
  if (status !== undefined && status >= 500) return { mood: 'sad', title: 'Sunucuda bir sorun var.', detail: message };
  if (status === undefined && /ulaşılamadı|ağ|network|fetch/i.test(message)) {
    return { mood: 'confused', title: 'Sunucuya ulaşamadım.', detail: 'İnterneti ve Profil › Ayarlar\'daki sunucu adresini kontrol et.' };
  }
  return { mood: 'confused', title: 'Bir şeyler ters gitti.', detail: message || 'Tekrar dener misin?' };
}

interface Props {
  error: unknown;
  onRetry?: () => void;
  /** `compact`: a single line with a small retry button (inside a list). */
  compact?: boolean;
}

/** A failed request, explained kindly, with the way out: retry. */
export function ErrorState({ error, onRetry, compact = false }: Props) {
  const theme = useTheme();
  const fade = useStateFade();
  const { mood, title, detail } = describe(error);
  if (compact) {
    return (
      <Animated.View entering={fade}>
        <Card variant="sheet" background={theme.colors.dangerSoft}>
          <AppText weight="semibold" color="danger">
            {title}
          </AppText>
          <AppText variant="label" color="textMuted">
            {detail}
          </AppText>
          {onRetry ? <Button label="Tekrar dene" icon="refresh-cw" variant="secondary" size="sm" onPress={onRetry} style={{ alignSelf: 'flex-start' }} /> : null}
        </Card>
      </Animated.View>
    );
  }
  return (
    <Animated.View entering={fade}>
      <Card variant="sheet">
        <MascotNote mood={mood} title={title} action={onRetry ? <Button label="Tekrar dene" icon="refresh-cw" variant="secondary" onPress={onRetry} /> : undefined}>
          {detail}
        </MascotNote>
      </Card>
    </Animated.View>
  );
}
