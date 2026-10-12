import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { useCreateExam, useParseKarne } from '../../api/hooks';
import type { KarneDraft } from '../../api/types';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { emptyForm, ExamForm, formFrom } from '../../components/ExamForm';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { ThinkingSpark } from '../../components/motion/ThinkingSpark';
import { LOW_CONFIDENCE_THRESHOLD } from '../../config';
import { haptics } from '../../lib/haptics';
import { prepareDocument } from '../../lib/image';
import { useTheme } from '../../theme';

type Stage = { kind: 'pick' } | { kind: 'reading'; uri: string } | { kind: 'failed'; uri: string; message: string } | { kind: 'form'; draft: KarneDraft | null };

export default function NewExamScreen() {
  const theme = useTheme();
  const { source } = useLocalSearchParams<{ source?: 'photo' }>();
  const [stage, setStage] = useState<Stage>(source === 'photo' ? { kind: 'pick' } : { kind: 'form', draft: null });
  const parse = useParseKarne();
  const create = useCreateExam();

  const read = (uri: string) => {
    setStage({ kind: 'reading', uri });
    parse.mutate(
      { uri },
      {
        onSuccess: (draft) => {
          haptics.success();
          setStage({ kind: 'form', draft });
        },
        onError: (e) => {
          haptics.error();
          setStage({ kind: 'failed', uri, message: e.message });
        },
      },
    );
  };

  const pick = async (from: 'camera' | 'library') => {
    try {
      if (from === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Kamera izni gerekli', 'Karnenin fotoğrafını çekmek için kameraya izin ver.', [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Ayarları aç', onPress: () => Linking.openSettings() },
          ]);
          return;
        }
      }
      const result =
        from === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      const asset = result.assets?.[0];
      if (result.canceled || !asset) return;
      const doc = await prepareDocument(asset.uri);
      read(doc.uri);
    } catch {
      Alert.alert('Görsel açılamadı', 'Başka bir görsel seçmeyi dene.');
    }
  };

  if (stage.kind === 'pick') {
    return (
      <Screen safeTop={false} width="readable">
        <Card>
          <View style={{ alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.md }}>
            <Icon name="scan-text" size={theme.layout.iconSize.xl} color={theme.colors.primaryText} />
            <AppText color="textMuted" align="center">
              Karnenin fotoğrafını çek ya da yayının sitesinden aldığın ekran görüntüsünü seç. Ders bazında doğru, yanlış ve boşları; varsa konu analizini okuyacağım.
            </AppText>
          </View>
          <Button label="Fotoğraf çek" icon="camera" size="lg" onPress={() => pick('camera')} />
          <Button label="Galeriden seç" icon="images" variant="secondary" onPress={() => pick('library')} />
        </Card>
        <Button label="Elle gireceğim" variant="ghost" onPress={() => setStage({ kind: 'form', draft: null })} />
      </Screen>
    );
  }

  if (stage.kind === 'reading') {
    return (
      <Screen safeTop={false} width="readable">
        <Card>
          <View style={{ alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.xl }}>
            <ThinkingSpark />
            <AppText variant="heading" align="center">
              Karne okunuyor…
            </AppText>
            <AppText color="textMuted" align="center">
              Bu biraz sürebilir.
            </AppText>
          </View>
        </Card>
      </Screen>
    );
  }

  if (stage.kind === 'failed') {
    return (
      <Screen safeTop={false} width="readable">
        <Card background={theme.colors.dangerSoft}>
          <AppText color="danger">{stage.message}</AppText>
        </Card>
        <Button label="Tekrar dene" icon="refresh-cw" onPress={() => read(stage.uri)} />
        <Button label="Başka fotoğraf seç" variant="secondary" onPress={() => setStage({ kind: 'pick' })} />
        <Button label="Elle gireceğim" variant="ghost" onPress={() => setStage({ kind: 'form', draft: null })} />
      </Screen>
    );
  }

  const draft = stage.draft;
  const lowConfidence = draft && draft.confidence < LOW_CONFIDENCE_THRESHOLD;

  return (
    <Screen safeTop={false} width="readable">
      {draft && (draft.warnings.length || lowConfidence) ? (
        <Card background={theme.colors.warningSoft}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <Icon name="triangle-alert" color={theme.colors.warning} />
            <View style={{ flex: 1, gap: theme.spacing.xs }}>
              <AppText weight="semibold" color="warning">
                Değerleri karneyle karşılaştır
              </AppText>
              {draft.warnings.map((w) => (
                <AppText key={w} variant="label" color="warning">
                  • {w}
                </AppText>
              ))}
            </View>
          </View>
        </Card>
      ) : draft ? (
        <Card background={theme.colors.successSoft}>
          <AppText variant="label" color="success">
            Karne okundu. Kaydetmeden önce bir göz at.
          </AppText>
        </Card>
      ) : null}

      <ExamForm
        initial={draft ? formFrom(draft) : emptyForm()}
        submitLabel="Kaydet"
        submitting={create.isPending}
        error={create.error?.message}
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: ({ exam, xpGained }) => {
              haptics.success();
              router.replace({ pathname: '/exam/[id]', params: { id: exam.id, xp: String(xpGained) } });
            },
            onError: () => haptics.error(),
          })
        }
      />
    </Screen>
  );
}
