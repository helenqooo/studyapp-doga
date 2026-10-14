import { router } from 'expo-router';
import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { useContext, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Question } from '../../api/types';
import { AppText } from '../../components/AppText';
import { Bubble } from '../../components/Bubble';
import { Button } from '../../components/Button';
import { Card, ListRow } from '../../components/Card';
import { Col, Row } from '../../components/Grid';
import { useRecentQuestions } from '../../components/home/RecentThumbs';
import { Icon, type IconName } from '../../components/Icon';
import { ResultTag } from '../../components/question/ResultTag';
import { QuestionImage } from '../../components/QuestionImage';
import { lastAttempt, resultLook } from '../../components/review/OptikHistory';
import { Screen } from '../../components/Screen';
import { Section } from '../../components/SectionHeader';
import { Viewfinder } from '../../components/Viewfinder';
import { DEMO_MODE } from '../../config';
import { getTopic } from '../../data/topics';
import { reviewDueLabel, shortDate } from '../../lib/format';
import { useContentSize, useWindowLayout } from '../../lib/layout';
import { usePickImage } from '../../lib/usePickImage';
import { subjectColor, useTheme } from '../../theme';

// TOKEN-PENDING: layout.solveSketch = { compactMaxWidth: 240, lines: ['100%', '88%', '56%'], choices: ['58%', '44%', '64%', '50%', '38%'] }
//   (the sample question drawn in the viewfinder: stem lines, and in the upright frame one line per choice;
//   the phone's wide frame gives the slip the frame's inner width, up to compactMaxWidth, so the A–E row fits)
const SKETCH = { compactMaxWidth: 240, lines: ['100%', '88%', '56%'], choices: ['58%', '44%', '64%', '50%', '38%'] } as const;
// TOKEN-PENDING: layout.solveCapture.frameShare = { regular: 0.44, wide: 0.5 } (the upright viewfinder's share of the
//   capture sheet's inner width on a tablet: portrait, and at most this much in landscape, where its height sets it)
const FRAME_SHARE = { regular: 0.44, wide: 0.5 } as const;
// TOKEN-PENDING: layout.solveCapture.onTopGain = 1.15 (a landscape sheet puts the frame on top once that makes it this much wider)
const FRAME_ON_TOP_GAIN = 1.15;
// TOKEN-PENDING: layout.thumb.accentEdge = 4 (the subject-ink edge on a recent thumbnail; same as RecentThumbs)
const ACCENT_EDGE = 4;
// TOKEN-PENDING: solve.recentCount = { compact: 4, wideMin: 3, wideMax: 8 } (landscape fits as many rows as reach the strip)
const RECENT_COUNT = { compact: 4, wideMin: 3, wideMax: 8 } as const;

const TIPS: { icon: IconName; text: string }[] = [
  { icon: 'scan', text: 'Tek soru, şıklar görünsün' },
  { icon: 'sun', text: 'Işık bol, gölge yok' },
  { icon: 'smartphone', text: 'Telefon sayfaya paralel' },
];
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

/** A paper slip for the sketch: surface, a hairline and small corners. */
function useSlip() {
  const theme = useTheme();
  return {
    width: '100%' as const,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.layout.system.borderWidth,
    borderColor: theme.colors.border,
  };
}

/**
 * A question sheet sketched inside the viewfinder. Wide frame: three stem lines and the A–E
 * bubbles spread along a row. Upright frame: the stem, then one bubble and line per choice,
 * like a printed test question.
 */
function QuestionSketch({ upright }: { upright: boolean }) {
  const theme = useTheme();
  const slip = useSlip();
  const line = (w: string) => <View key={w} style={{ width: w as `${number}%`, height: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: theme.colors.optikSoft }} />;
  return (
    <View style={{ width: '100%', maxWidth: upright ? undefined : SKETCH.compactMaxWidth, alignItems: 'center', gap: theme.spacing.md }} aria-hidden>
      <View style={[slip, { gap: theme.spacing.sm }]}>
        {SKETCH.lines.map(line)}
        {upright ? (
          <View style={{ gap: theme.spacing.sm, paddingTop: theme.spacing.sm }}>
            {LETTERS.map((l, i) => (
              <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Bubble size="dot" animate={false}>
                  {l}
                </Bubble>
                {line(SKETCH.choices[i]!)}
              </View>
            ))}
          </View>
        ) : (
          // Spread across the slip: the space between the bubbles shrinks before they touch.
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: theme.spacing.xs }}>
            {LETTERS.map((l) => (
              <Bubble key={l} size="dot" animate={false}>
                {l}
              </Bubble>
            ))}
          </View>
        )}
      </View>
      <AppText variant="caption" color="textMuted" align="center">
        Soruyu çerçeveye al
      </AppText>
    </View>
  );
}

/** The three photo tips as compact icon lines. */
function TipLines() {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      {TIPS.map((tip) => (
        <View key={tip.text} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <Icon name={tip.icon} size={theme.layout.iconSize.md} color={theme.colors.primaryText} duotone />
          <AppText variant="label" style={{ flex: 1 }}>
            {tip.text}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/**
 * The room from a block's top down to the strip, mirroring Screen's tab padding: the safe
 * area and `spacing.lg` on top, the strip's reported height and `spacing.xxl` at the bottom.
 * `onLayout` goes on the block (its y is measured in the screen's content). Undefined until
 * measured.
 */
function useRoomToStrip() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowLayout();
  const strip = useContext(BottomTabBarHeightContext) ?? 0;
  const [top, setTop] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const y = Math.round(e.nativeEvent.layout.y);
    if (y !== top) setTop(y);
  };
  const room = top === null ? undefined : Math.max(0, height - insets.top - theme.spacing.lg - top - theme.spacing.xxl - strip);
  return { onLayout, room };
}

/**
 * The screen's one primary surface. Tablet: an upright 3:4 viewfinder beside the tips and
 * the actions, stacked by weight (Fotoğraf çek, then Galeriden seç, then the sample). Phone:
 * the wide viewfinder over the same three actions; the tips go to the bottom of the page.
 * `minHeight` (landscape) makes the sheet reach the strip: the frame then grows with the
 * sheet's height, up to its share of the width, and both columns sit centered. A sheet much
 * taller than that (a 13" iPad) puts the frame on top, larger, over the tips and the actions.
 */
function CaptureCard({ minHeight }: { minHeight?: number }) {
  const theme = useTheme();
  const { tablet, sheetPadding } = useWindowLayout();
  const { width } = useContentSize();
  const { openCamera, pickFromLibrary, trySample, busy } = usePickImage();
  // Landscape: the sheet's inner height and the two text blocks' heights size the frame.
  const [innerMeasured, setInnerMeasured] = useState(0);
  const [blocks, setBlocks] = useState({ tips: 0, actions: 0 });
  const measureBlock = (key: 'tips' | 'actions') => (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    setBlocks((b) => (b[key] === h ? b : { ...b, [key]: h }));
  };

  const actions = (
    <View onLayout={measureBlock('actions')} style={{ gap: theme.spacing.sm }}>
      <Button label="Fotoğraf çek" icon="camera" size="lg" onPress={openCamera} />
      <Button label="Galeriden seç" icon="images" variant="secondary" loading={busy} onPress={() => pickFromLibrary()} />
      {DEMO_MODE ? (
        <Button label="Örnek soruyu çöz" icon="sparkles" variant="ghost" size="sm" loading={busy} onPress={trySample} style={{ alignSelf: 'center' }} />
      ) : null}
    </View>
  );

  if (!tablet) {
    return (
      <Card variant="hero">
        <Viewfinder aspect="16:10" label="Fotoğraf çek" onPress={openCamera}>
          <QuestionSketch upright={false} />
        </Viewfinder>
        {actions}
      </Card>
    );
  }

  const tips = (
    <View onLayout={measureBlock('tips')} style={{ gap: theme.spacing.md }}>
      <AppText variant="heading" accessibilityRole="header">
        İyi bir fotoğraf için
      </AppText>
      <TipLines />
    </View>
  );

  // The frame stays 3:4, like the camera's guide. Portrait: a fixed share of the width.
  // Landscape: as tall as the sheet allows, at most its share of the width; or, when the
  // tips and the actions side by side under it leave it clearly larger, on top.
  const fill = minHeight !== undefined;
  const gap = theme.spacing.xl;
  const innerWidth = Math.max(0, width - sheetPadding * 2);
  const innerHeight = innerMeasured || (fill ? Math.max(0, minHeight - sheetPadding * 2) : 0);
  const besideWidth = Math.min(innerWidth * FRAME_SHARE.wide, (innerHeight * 3) / 4);
  const under = Math.max(blocks.tips, blocks.actions);
  const onTopWidth = Math.min(innerWidth, ((innerHeight - gap - under) * 3) / 4);
  const onTop = fill && under > 0 && onTopWidth > besideWidth * FRAME_ON_TOP_GAIN;
  const frameWidth = Math.round(onTop ? onTopWidth : fill ? besideWidth : innerWidth * FRAME_SHARE.regular);
  const onInnerLayout = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h !== innerMeasured) setInnerMeasured(h);
  };
  const frame = (
    <Viewfinder aspect="3:4" label="Fotoğraf çek" onPress={openCamera} style={{ width: frameWidth, alignSelf: onTop ? 'center' : undefined }}>
      <QuestionSketch upright />
    </Viewfinder>
  );
  return (
    <Card variant="hero" style={fill ? { flex: 1, minHeight } : undefined}>
      {onTop ? (
        <View onLayout={onInnerLayout} style={{ flexGrow: 1, justifyContent: 'center', gap }}>
          {frame}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
            <View style={{ flex: 1, minWidth: 0 }}>{tips}</View>
            <View style={{ flex: 1, minWidth: 0 }}>{actions}</View>
          </View>
        </View>
      ) : (
        <View onLayout={fill ? onInnerLayout : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap, flexGrow: fill ? 1 : 0 }}>
          {frame}
          <View style={{ flex: 1, minWidth: 0, justifyContent: 'center', gap: theme.spacing.xxl }}>
            {tips}
            {actions}
          </View>
        </View>
      )}
    </Card>
  );
}

/** A recent question's photo with its subject's ink down the left edge. */
function RecentThumb({ question }: { question: Question }) {
  const theme = useTheme();
  const side = useThumbSide();
  return (
    <View
      style={{
        width: side,
        height: side,
        borderRadius: theme.radius.sm,
        borderCurve: 'continuous',
        overflow: 'hidden',
        // A hairline frame: white question photos would otherwise melt into the white sheet.
        borderWidth: theme.layout.system.borderWidth,
        borderColor: theme.colors.border,
      }}
    >
      <QuestionImage questionId={question.id} size="thumb" style={{ width: '100%', height: '100%', borderRadius: 0 }} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { right: undefined, width: ACCENT_EDGE, backgroundColor: subjectColor(theme, question.subject) }]} />
    </View>
  );
}

function useThumbSide() {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  return tablet ? theme.layout.thumb.recent - theme.spacing.sm : theme.layout.thumb.compact;
}

/**
 * The row's two lines: the most specific name as the title (the subtopic, else the topic),
 * then where it belongs, when it was solved and, if it is in the review list, when it comes back.
 */
function recentLines(q: Question): { title: string; detail: string } {
  const topic = getTopic(q.topicId);
  const title = topic ? (topic.subtopic ?? topic.topic) : q.subject;
  const parent = topic?.subtopic ? topic.topic : q.subject;
  const parts = [parent, shortDate(q.createdAt)];
  const review = q.review;
  if (review?.status === 'graduated') parts.push('öğrenildi');
  else if (review?.status === 'active') parts.push(`tekrar ${reviewDueLabel(review.dueDate)}`);
  return { title, detail: parts.join(', ') };
}

/**
 * "Son çözdüklerin": one sheet of rows (photo, topic, its place and date, result). `count`
 * is how many fit (landscape fits the column to the strip).
 */
function Recents({ count }: { count: number }) {
  const theme = useTheme();
  const { tablet, sizeClass } = useWindowLayout();
  const recent = useRecentQuestions(count);
  // In the landscape column the whole row is the target and the result sits at its right
  // edge: no chevron, so the title keeps the width.
  const wide = sizeClass === 'wide';
  return (
    <Section title="Son çözdüklerin">
      {recent.length ? (
        <Card divided>
          {recent.map((q) => {
            const { title, detail } = recentLines(q);
            const result = lastAttempt(q)?.result;
            return (
              <ListRow
                key={q.id}
                leading={<RecentThumb question={q} />}
                title={title}
                detail={detail}
                // A phone row keeps its width for the topic: the icon alone (the label says the word).
                trailing={<ResultTag result={result} iconOnly={!tablet} />}
                chevron={!wide}
                onPress={() => router.push(`/question/${q.id}`)}
                accessibilityLabel={`${title}, ${resultLook(theme, result).label}, ${detail}`}
              />
            );
          })}
        </Card>
      ) : (
        <AppText color="textMuted">Henüz soru çözmedin. İlk soruyu çek, burada görünsün.</AppText>
      )}
    </Section>
  );
}

/** Landscape: the capture sheet beside as many recent rows as reach the strip. */
function WideSolve() {
  const theme = useTheme();
  const { onLayout, room } = useRoomToStrip();
  const thumb = useThumbSide();
  const g = theme.layout.group;
  // A row is its thumbnail and padding plus the hairline; above them the section's header.
  const rowHeight = thumb + g.rowPadY.tablet * 2 + theme.layout.system.borderWidth;
  const header = theme.layout.system.touch.tablet + theme.spacing.md;
  const fits = room === undefined ? RECENT_COUNT.wideMin + 2 : Math.floor((room - header) / rowHeight);
  const count = Math.min(RECENT_COUNT.wideMax, Math.max(RECENT_COUNT.wideMin, fits));
  return (
    <View onLayout={onLayout}>
      <Row>
        <Col span={{ compact: 4, wide: 7 }}>
          <CaptureCard minHeight={room} />
        </Col>
        <Col span={{ compact: 4, wide: 5 }}>
          <Recents count={count} />
        </Col>
      </Row>
    </View>
  );
}

export default function SolveScreen() {
  const { sizeClass } = useWindowLayout();
  return (
    <Screen title="Soru çöz" subtitle="Fotoğrafını çek; ipucu al ya da çözümü gör.">
      {sizeClass === 'wide' ? (
        <WideSolve />
      ) : sizeClass === 'regular' ? (
        <>
          <CaptureCard />
          <Recents count={RECENT_COUNT.compact} />
        </>
      ) : (
        <>
          <CaptureCard />
          <Recents count={RECENT_COUNT.compact} />
          <Section title="İyi bir fotoğraf için">
            <TipLines />
          </Section>
        </>
      )}
    </Screen>
  );
}
