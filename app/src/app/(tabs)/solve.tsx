import { View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Bubble } from '../../components/Bubble';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Col, Row } from '../../components/Grid';
import { useRecentQuestions } from '../../components/home/RecentThumbs';
import { Icon, type IconName } from '../../components/Icon';
import { QuestionRow } from '../../components/QuestionRow';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { Viewfinder } from '../../components/Viewfinder';
import { DEMO_MODE } from '../../config';
import { useWindowLayout } from '../../lib/layout';
import { usePickImage } from '../../lib/usePickImage';
import { useTheme } from '../../theme';

// TOKEN-PENDING: layout.solveSketch = { width: '62%', lines: ['100%', '88%', '56%'] } (the sample question drawn in the viewfinder)
const SKETCH = { width: '62%', lines: ['100%', '88%', '56%'] } as const;
// TOKEN-PENDING: solve.recentCount = 4
const RECENT_COUNT = 4;

const TIPS: { icon: IconName; text: string }[] = [
  { icon: 'scan', text: 'Tek soru, şıklar görünsün' },
  { icon: 'sun', text: 'Işık bol, gölge yok' },
  { icon: 'smartphone', text: 'Telefon sayfaya paralel' },
];
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

/** A question sheet sketched inside the viewfinder: three stem lines and the A–E bubbles. */
function QuestionSketch() {
  const theme = useTheme();
  return (
    <View style={{ width: SKETCH.width, alignItems: 'center', gap: theme.spacing.md }} aria-hidden>
      <View
        style={{
          width: '100%',
          gap: theme.spacing.sm,
          padding: theme.spacing.md,
          borderRadius: theme.radius.sm,
          borderCurve: 'continuous',
          backgroundColor: theme.colors.surface,
          borderWidth: theme.layout.system.borderWidth,
          borderColor: theme.colors.border,
        }}
      >
        {SKETCH.lines.map((w) => (
          <View key={w} style={{ width: w, height: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: theme.colors.optikSoft }} />
        ))}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: theme.spacing.xs }}>
          {LETTERS.map((l) => (
            <Bubble key={l} size="dot" animate={false}>
              {l}
            </Bubble>
          ))}
        </View>
      </View>
      <AppText variant="caption" color="textMuted" align="center">
        Soruyu çerçeveye al
      </AppText>
    </View>
  );
}

function CaptureCard({ wide }: { wide: boolean }) {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  const { openCamera, pickFromLibrary, trySample, busy } = usePickImage();
  return (
    <Card variant="hero">
      <Viewfinder aspect={wide ? '4:3' : '16:10'} label="Fotoğraf çek" onPress={openCamera}>
        <QuestionSketch />
      </Viewfinder>
      <View style={{ flexDirection: tablet ? 'row' : 'column', gap: theme.spacing.sm }}>
        <Button label="Fotoğraf çek" icon="camera" size="lg" onPress={openCamera} style={tablet ? { flex: 1 } : undefined} />
        <Button
          label="Galeriden seç"
          icon="images"
          variant="secondary"
          size={tablet ? 'lg' : 'md'}
          loading={busy}
          onPress={() => pickFromLibrary()}
          style={tablet ? { flex: 1 } : undefined}
        />
      </View>
      {DEMO_MODE ? <Button label="Örnek soruyu çöz" icon="sparkles" variant="ghost" loading={busy} onPress={trySample} /> : null}
    </Card>
  );
}

function Recents() {
  const theme = useTheme();
  const recent = useRecentQuestions(RECENT_COUNT);
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionHeader title="Son çözdüklerin" />
      {recent.length ? (
        recent.map((q) => <QuestionRow key={q.id} question={q} />)
      ) : (
        <AppText color="textMuted">Henüz soru çözmedin. İlk soruyu çek, burada görünsün.</AppText>
      )}
    </View>
  );
}

function Tips() {
  const theme = useTheme();
  const { minTouch, iconSize } = theme.layout.system;
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <SectionHeader title="İyi bir fotoğraf için" />
      {TIPS.map((tip) => (
        <View key={tip.text} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: minTouch }}>
          <Icon name={tip.icon} size={iconSize.md} color={theme.colors.primaryText} duotone />
          <AppText style={{ flex: 1 }}>{tip.text}</AppText>
        </View>
      ))}
    </View>
  );
}

export default function SolveScreen() {
  const { sizeClass } = useWindowLayout();
  return (
    <Screen title="Soru çöz" subtitle="Fotoğrafını çek; ipucu al ya da tam çözümü gör.">
      {sizeClass === 'wide' ? (
        <Row>
          <Col span={{ compact: 4, wide: 7 }}>
            <CaptureCard wide />
          </Col>
          <Col span={{ compact: 4, wide: 5 }}>
            <Recents />
            <Tips />
          </Col>
        </Row>
      ) : sizeClass === 'regular' ? (
        <>
          <CaptureCard wide={false} />
          <Row>
            <Col span={{ compact: 4, regular: 5 }}>
              <Recents />
            </Col>
            <Col span={{ compact: 4, regular: 3 }}>
              <Tips />
            </Col>
          </Row>
        </>
      ) : (
        <>
          <CaptureCard wide={false} />
          <Recents />
          <Tips />
        </>
      )}
    </Screen>
  );
}
