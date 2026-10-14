import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { useCreateExam, useExams, useParseKarne } from '../../api/hooks';
import type { ExamResult, KarneDraft } from '../../api/types';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useCompanionYield } from '../../components/companion/Perch';
import { emptyForm, ExamForm, formFrom } from '../../components/ExamForm';
import { Col, Row } from '../../components/Grid';
import { lostNet, previousOf } from '../../components/exams/examMath';
import { Icon } from '../../components/Icon';
import { Mascot } from '../../components/mascot/Mascot';
import { Screen } from '../../components/Screen';
import { Viewfinder } from '../../components/Viewfinder';
import { LOW_CONFIDENCE_THRESHOLD } from '../../config';
import { getTopic, topicLabel } from '../../data/topics';
import { useRewardCelebration } from '../../lib/celebrate';
import { haptics } from '../../lib/haptics';
import { useWindowLayout } from '../../lib/layout';
import { prepareDocument } from '../../lib/image';
import { useCompanionStore } from '../../store/companionStore';
import { useTheme } from '../../theme';

type Stage = { kind: 'pick' } | { kind: 'reading'; uri: string } | { kind: 'failed'; uri: string; message: string } | { kind: 'form'; draft: KarneDraft | null };

/** Tells the companion about a saved exam: its net against the previous full one, the biggest gain and the costliest topic. */
function emitSaved(exam: ExamResult, earlier: readonly ExamResult[]) {
  const prev = previousOf(exam, earlier);
  let topSubject: string | null = null;
  if (prev) {
    let best = 0;
    for (const s of exam.sections) {
      const p = prev.sections.find((x) => x.subject === s.subject);
      if (p && s.net - p.net > best) {
        best = s.net - p.net;
        topSubject = s.subject;
      }
    }
  }
  const weakest = exam.sections
    .flatMap((s) => s.topics)
    .filter((t) => t.wrong + t.blank > 0)
    .sort((a, b) => lostNet(b) - lostNet(a))[0];
  const weak = weakest ? getTopic(weakest.topicId) : undefined;
  useCompanionStore.getState().emit({
    type: 'exam.saved',
    exam: exam.exam,
    net: exam.totalNet,
    prevNet: prev ? prev.totalNet : null,
    topSubject,
    weakTopic: weak ? topicLabel(weak) : null,
  });
}

export default function NewExamScreen() {
  const theme = useTheme();
  const { source } = useLocalSearchParams<{ source?: 'photo' }>();
  const [stage, setStage] = useState<Stage>(source === 'photo' ? { kind: 'pick' } : { kind: 'form', draft: null });
  const parse = useParseKarne();
  const celebrateRewards = useRewardCelebration();
  const create = useCreateExam();
  const exams = useExams();
  const wide = useWindowLayout().sizeClass === 'wide';
  // The reading stage keeps its own reading Lumi; the companion steps aside meanwhile.
  useCompanionYield(stage.kind === 'reading');

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
    // Landscape iPad: the actions sit beside the viewfinder, so they are never below the fold.
    return (
      <Screen safeTop={false} width={wide ? 'dashboard' : 'readable'} title="Karne fotoğrafı">
        <Row>
          <Col span={{ compact: 4, regular: 8, wide: 7 }}>
            <Viewfinder aspect="4:3" icon="scan-text" label="Karneyi çerçeveye al" onPress={() => pick('camera')} />
          </Col>
          <Col span={{ compact: 4, regular: 8, wide: 5 }} style={wide ? { justifyContent: 'center' } : undefined}>
            <AppText color="textMuted">
              Karnenin fotoğrafını çek ya da yayının sitesinden aldığın ekran görüntüsünü seç. Ders bazında doğru, yanlış ve boşları; varsa konu analizini okuyacağım.
            </AppText>
            <View style={{ gap: theme.spacing.sm }}>
              <Button label="Fotoğraf çek" icon="camera" size="lg" onPress={() => pick('camera')} />
              <Button label="Galeriden seç" icon="images" variant="secondary" onPress={() => pick('library')} />
              <Button label="Elle gireceğim" icon="square-pen" variant="ghost" onPress={() => setStage({ kind: 'form', draft: null })} style={{ alignSelf: 'center' }} />
            </View>
          </Col>
        </Row>
      </Screen>
    );
  }

  if (stage.kind === 'reading') {
    return (
      <Screen safeTop={false} width="readable" title="Karne okunuyor">
        <Card variant="hero">
          <View style={{ alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.xl }}>
            <Mascot mood="reading" size={theme.layout.mascot.note} />
            <AppText variant="heading" align="center">
              Netlerini çıkarıyorum
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
      <Screen safeTop={false} width="readable" title="Karne okunamadı">
        <Card background={theme.colors.dangerSoft}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <Icon name="triangle-alert" color={theme.colors.danger} />
            <AppText color="danger" style={{ flex: 1 }}>
              {stage.message}
            </AppText>
          </View>
        </Card>
        <View style={{ gap: theme.spacing.sm }}>
          <Button label="Tekrar dene" icon="refresh-cw" onPress={() => read(stage.uri)} />
          <Button label="Başka fotoğraf seç" icon="images" variant="secondary" onPress={() => setStage({ kind: 'pick' })} />
          <Button label="Elle gireceğim" icon="square-pen" variant="ghost" onPress={() => setStage({ kind: 'form', draft: null })} style={{ alignSelf: 'center' }} />
        </View>
      </Screen>
    );
  }

  const draft = stage.draft;
  const lowConfidence = draft && draft.confidence < LOW_CONFIDENCE_THRESHOLD;

  const intro =
    draft && (draft.warnings.length || lowConfidence) ? (
      <Card background={theme.colors.warningSoft}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Icon name="triangle-alert" color={theme.colors.warning} />
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <AppText weight="semibold" color="warning">
              Değerleri karneyle karşılaştır
            </AppText>
            {draft.warnings.map((w) => (
              <AppText key={w} variant="label" color="warning">
                {w}
              </AppText>
            ))}
          </View>
        </View>
      </Card>
    ) : draft ? (
      <Card background={theme.colors.successSoft}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <Icon name="circle-check" color={theme.colors.success} />
          <AppText variant="label" color="success" style={{ flex: 1 }}>
            Karne okundu. Kaydetmeden önce bir göz at.
          </AppText>
        </View>
      </Card>
    ) : null;

  return (
    <ExamForm
      title="Deneme ekle"
      subtitle="Doğru ve yanlışlarını gir; neti Lumi hesaplar."
      intro={intro}
      initial={draft ? formFrom(draft) : emptyForm()}
      submitLabel="Kaydet"
      submitting={create.isPending}
      error={create.error?.message}
      onSubmit={(input) => {
        // The list as it was before this save, for the companion's comparison.
        const earlier = exams.data?.items ?? [];
        create.mutate(input, {
          onSuccess: ({ exam, xpGained, rewards }) => {
            celebrateRewards(rewards);
            haptics.success();
            emitSaved(exam, earlier);
            router.replace({ pathname: '/exam/[id]', params: { id: exam.id, xp: String(xpGained) } });
          },
          onError: () => haptics.error(),
        });
      }}
    />
  );
}
