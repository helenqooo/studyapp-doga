import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { Switch, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { ExamInput, ExamResult, KarneDraft } from '../api/types';
import { getTopic, QUESTION_COUNTS, SUBJECTS_BY_EXAM, topicLabel, type Exam, type Subject } from '../data/topics';
import { formatNet, localToday, longDate, shiftDate } from '../lib/format';
import { haptics } from '../lib/haptics';
import { useContentSize, useWindowLayout } from '../lib/layout';
import { elevated, subjectColor, useTheme } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card, GroupDivider } from './Card';
import { Col, Row } from './Grid';
import { Icon, type IconName } from './Icon';
import { Odometer } from './motion/Odometer';
import { enter, exit } from './motion/presets';
import { PressableScale } from './motion/PressableScale';
import { NumberField } from './NumberField';
import { HeaderAction, Screen, useCompactHeader } from './Screen';
import { SegmentedControl } from './SegmentedControl';
import { TextField } from './TextField';

// Inputs are kept as strings so a field can be empty while typing.
interface TopicRow {
  topicId: string;
  correct: string;
  wrong: string;
  blank: string;
}

interface SectionRow {
  subject: Subject;
  included: boolean;
  correct: string;
  wrong: string;
  topics: TopicRow[];
}

export interface ExamFormState {
  exam: Exam;
  date: string;
  name: string;
  sections: SectionRow[];
}

const num = (s: string) => (s === '' ? 0 : Number(s));
const str = (n: number) => String(n);

function emptySections(exam: Exam): SectionRow[] {
  return SUBJECTS_BY_EXAM[exam].map((subject) => ({ subject, included: true, correct: '', wrong: '', topics: [] }));
}

export function emptyForm(exam: Exam = 'TYT'): ExamFormState {
  return { exam, date: localToday(), name: '', sections: emptySections(exam) };
}

/** Pre-fills the form from a karne draft or a saved exam. */
export function formFrom(source: KarneDraft | ExamResult): ExamFormState {
  return {
    exam: source.exam,
    date: source.date ?? localToday(),
    name: source.name ?? '',
    sections: SUBJECTS_BY_EXAM[source.exam].map((subject) => {
      const s = source.sections.find((x) => x.subject === subject);
      return {
        subject,
        included: !!s,
        correct: s ? str(s.correct) : '',
        wrong: s ? str(s.wrong) : '',
        topics: (s?.topics ?? []).map((t) => ({ topicId: t.topicId, correct: str(t.correct), wrong: str(t.wrong), blank: str(t.blank) })),
      };
    }),
  };
}

function sectionError(s: SectionRow): string | null {
  const total = QUESTION_COUNTS[s.subject];
  if (num(s.correct) + num(s.wrong) > total) return `Doğru + yanlış toplamı ${total} soruyu geçemez.`;
  return null;
}

function toInput(f: ExamFormState): ExamInput {
  return {
    exam: f.exam,
    date: f.date,
    name: f.name.trim() || null,
    sections: f.sections
      .filter((s) => s.included)
      .map((s) => {
        const correct = num(s.correct);
        const wrong = num(s.wrong);
        return {
          subject: s.subject,
          correct,
          wrong,
          blank: QUESTION_COUNTS[s.subject] - correct - wrong,
          topics: s.topics.map((t) => ({ topicId: t.topicId, correct: num(t.correct), wrong: num(t.wrong), blank: num(t.blank) })),
        };
      }),
  };
}

interface Props {
  initial: ExamFormState;
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: ExamInput) => void;
  /** The Screen's in-content title (stack screens share one title voice). */
  title?: string;
  /** Shown above the form, e.g. the karne-read notice. */
  intro?: ReactNode;
}

// TOKEN-PENDING: layout.examForm = { tableFrom: 560, switchCol: 56 } (the subject table's one-line rows, the Girdim column)
const FORM = { tableFrom: 560, switchCol: 56 };

/** A round stepper, one touch target (44 / 48 pt), bubble press feedback, `select` haptic. */
function Stepper({ icon, label, disabled, onPress }: { icon: IconName; label: string; disabled?: boolean; onPress: () => void }) {
  const theme = useTheme();
  const { touch } = useWindowLayout();
  return (
    <PressableScale
      kind="bubble"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      dimmed={disabled}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={{
        width: touch,
        height: touch,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} color={theme.colors.primaryText} weight="bold" />
    </PressableScale>
  );
}

/** Blank or net as a numeric figure (live while typing), as tall as a well; the label above unless a header names it. */
function Figure({ label, value, muted = false, width, hideLabel = false }: { label: string; value: string; muted?: boolean; width: number; hideLabel?: boolean }) {
  const theme = useTheme();
  const { touch } = useWindowLayout();
  return (
    <View accessible accessibilityLabel={`${label} ${value}`} style={{ alignItems: 'center', gap: theme.spacing.xxs, width }}>
      {hideLabel ? null : (
        <AppText variant="caption" color="textMuted">
          {label}
        </AppText>
      )}
      <View style={{ height: touch + theme.spacing.sm, justifyContent: 'center' }}>
        <AppText variant="numeric" color={muted ? 'textMuted' : 'text'}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

/** A subject's ink dot. */
function Dot({ color }: { color: string }) {
  const theme = useTheme();
  return <View style={{ width: theme.spacing.sm, height: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: color }} />;
}

/**
 * The one editable form both entry paths (karne photo, manual) end up in. Renders its own
 * Screen. The subjects sit in one sheet: a table with a header row (Doğru, Yanlış, Boş, Net,
 * Girdim) once it is wide enough, stacked blocks on a phone. Landscape iPad: two columns,
 * the exam's details and the live total with Kaydet on the left, the subjects on the right.
 * Elsewhere the total and Kaydet float in a dock over the bottom of the page.
 */
export function ExamForm({ initial, submitLabel, submitting, error, onSubmit, title, intro }: Props) {
  const theme = useTheme();
  const { sizeClass } = useWindowLayout();
  const wide = sizeClass === 'wide';
  const [form, setForm] = useState(initial);
  const today = localToday();
  // Section bodies fade in when a switch or the exam type swaps them, never on mount (spec 5.3).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const swapIn = mounted ? enter({ still: true, duration: theme.motion.duration.base }) : undefined;

  const updateSection = (subject: Subject, patch: Partial<SectionRow>) =>
    setForm((f) => ({ ...f, sections: f.sections.map((s) => (s.subject === subject ? { ...s, ...patch } : s)) }));

  const updateTopic = (subject: Subject, topicId: string, patch: Partial<TopicRow> | null) =>
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s) =>
        s.subject !== subject
          ? s
          : {
              ...s,
              topics: patch === null ? s.topics.filter((t) => t.topicId !== topicId) : s.topics.map((t) => (t.topicId === topicId ? { ...t, ...patch } : t)),
            },
      ),
    }));

  // Undo of a topic's removal: back at the place it was taken from.
  const restoreTopic = (subject: Subject, topic: TopicRow, index: number) =>
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s) =>
        s.subject !== subject || s.topics.some((t) => t.topicId === topic.topicId)
          ? s
          : { ...s, topics: [...s.topics.slice(0, index), topic, ...s.topics.slice(index)] },
      ),
    }));

  const included = form.sections.filter((s) => s.included);
  const errors = included.map(sectionError).filter(Boolean);
  const totalNet = included.reduce((sum, s) => sum + num(s.correct) - num(s.wrong) / 4, 0);
  const totalQuestions = included.reduce((sum, s) => sum + QUESTION_COUNTS[s.subject], 0);
  const canSubmit = included.length > 0 && errors.length === 0 && !submitting;
  const submit = () => onSubmit(toInput(form));

  const errorText = error ? (
    <AppText variant="label" color="danger">
      {error}
    </AppText>
  ) : null;

  const total = (size: 'stat' | 'hero') => (
    <View
      accessible
      accessibilityLabel={`Toplam ${formatNet(totalNet)} net, ${totalQuestions} soru`}
      style={{ flexGrow: 1, flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: theme.spacing.xs, paddingLeft: size === 'stat' ? theme.spacing.xs : 0 }}
    >
      {size === 'stat' ? (
        <AppText variant="label" color="textMuted">
          Toplam
        </AppText>
      ) : null}
      <Odometer value={totalNet} format={formatNet} variant={size} />
      <AppText variant="label" color="textMuted">
        /{totalQuestions} net
      </AppText>
    </View>
  );

  // Phone and portrait: the total and Kaydet float over the bottom of the page.
  const dock = wide ? undefined : (
    <View style={{ ...elevated(theme, 'floating'), padding: theme.spacing.md, gap: theme.spacing.sm }}>
      {errorText}
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.md }}>
        {total('stat')}
        <Button label={submitLabel} icon="check" loading={submitting} disabled={!canSubmit} onPress={submit} style={{ flexGrow: 1 }} />
      </View>
    </View>
  );

  const examType = (
    <SegmentedControl
      options={[
        { value: 'TYT', label: 'TYT' },
        { value: 'AYT', label: 'AYT Sayısal' },
      ]}
      value={form.exam}
      onChange={(exam) => setForm((f) => ({ ...f, exam, sections: emptySections(exam) }))}
    />
  );

  const dateRow = (
    <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <Stepper icon="chevron-left" label="Önceki gün" onPress={() => setForm((f) => ({ ...f, date: shiftDate(f.date, -1) }))} />
      <View style={{ flex: 1, alignItems: 'center' }}>
        <AppText weight="semibold" numberOfLines={1}>
          {longDate(form.date)}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {form.date === today ? 'Bugün' : form.date === shiftDate(today, -1) ? 'Dün' : 'Deneme tarihi'}
        </AppText>
      </View>
      <Stepper icon="chevron-right" label="Sonraki gün" disabled={form.date >= today} onPress={() => setForm((f) => ({ ...f, date: shiftDate(f.date, 1) }))} />
    </View>
  );
  const nameField = (
    <TextField
      label="Deneme adı (isteğe bağlı)"
      value={form.name}
      onChangeText={(name) => setForm((f) => ({ ...f, name }))}
      placeholder="ör. Yayın TYT-3"
      maxLength={120}
    />
  );
  // Portrait: the date and the name side by side; otherwise one above the other.
  const details =
    sizeClass === 'regular' ? (
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.xl }}>
          <View style={{ flex: 1, paddingBottom: theme.spacing.xxs }}>{dateRow}</View>
          <View style={{ flex: 1 }}>{nameField}</View>
        </View>
      </Card>
    ) : (
      <Card>
        {dateRow}
        {nameField}
      </Card>
    );

  const subjects = <SubjectTable form={form} swapIn={swapIn} updateSection={updateSection} updateTopic={updateTopic} restoreTopic={restoreTopic} />;

  if (wide) {
    return (
      <Screen safeTop={false} width="dashboard" title={title} headerRight={<CompactSave label={submitLabel} enabled={canSubmit} onPress={submit} />}>
        <Row>
          <Col span={{ compact: 4, wide: 5 }}>
            {intro}
            {examType}
            {details}
            {/* The form's key number: the total, live, with the save action under it. */}
            <Card variant="hero">
              <AppText variant="label" color="textMuted">
                Toplam
              </AppText>
              {total('hero')}
              {errorText}
              <Button label={submitLabel} icon="check" size="lg" loading={submitting} disabled={!canSubmit} onPress={submit} />
            </Card>
          </Col>
          <Col span={{ compact: 4, wide: 7 }}>{subjects}</Col>
        </Row>
      </Screen>
    );
  }

  return (
    <Screen safeTop={false} width="readable" title={title} dock={dock}>
      {intro}
      {examType}
      {details}
      {subjects}
    </Screen>
  );
}

/** Kaydet in the native header once the title has scrolled away (landscape, where there is no dock). */
function CompactSave({ label, enabled, onPress }: { label: string; enabled: boolean; onPress: () => void }) {
  const compact = useCompactHeader();
  if (!compact || !enabled) return null;
  return <HeaderAction icon="check" label={label} onPress={onPress} />;
}

interface TableProps {
  form: ExamFormState;
  swapIn: ReturnType<typeof enter> | undefined;
  updateSection: (subject: Subject, patch: Partial<SectionRow>) => void;
  updateTopic: (subject: Subject, topicId: string, patch: Partial<TopicRow> | null) => void;
  restoreTopic: (subject: Subject, topic: TopicRow, index: number) => void;
}

/** The last removed topic, kept for "Geri al" until the next removal or an exam type change. */
interface Removed {
  exam: Exam;
  subject: Subject;
  topic: TopicRow;
  index: number;
  name: string;
}

/**
 * The subjects in one sheet, split by optik hairlines. Wide enough, each subject is one row
 * under a header (name, Doğru, Yanlış, Boş, Net, Girdim); its karne topics each take a line
 * for the name, then their D / Y / B and net in the same columns, the remove button in the
 * Girdim column. On a phone each subject is a block with its labels above the wells.
 */
function SubjectTable({ form, swapIn, updateSection, updateTopic, restoreTopic }: TableProps) {
  const theme = useTheme();
  const { touch, sheetPadding, tablet } = useWindowLayout();
  const { width } = useContentSize();
  const table = width >= FORM.tableFrom;
  const col = touch + theme.spacing.xl;
  const gap = theme.spacing.md;
  const padY = tablet ? theme.layout.group.rowPadY.tablet : theme.layout.group.rowPadY.compact;
  // The Girdim column: the switch and a topic's remove button, each one full touch target.
  const controlCol = Math.max(touch, FORM.switchCol);
  const [removed, setRemoved] = useState<Removed | null>(null);
  const undo = removed && removed.exam === form.exam ? removed : null;

  const header = table ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap, paddingHorizontal: sheetPadding, paddingTop: sheetPadding - theme.spacing.xs, paddingBottom: theme.spacing.sm }} aria-hidden>
      <AppText variant="label" color="textMuted" style={{ flex: 1 }}>
        Ders
      </AppText>
      {['Doğru', 'Yanlış', 'Boş', 'Net'].map((h) => (
        <AppText key={h} variant="label" color="textMuted" align="center" style={{ width: col }}>
          {h}
        </AppText>
      ))}
      <AppText variant="label" color="textMuted" align="right" style={{ width: controlCol }}>
        Girdim
      </AppText>
    </View>
  ) : null;

  return (
    <Card style={{ padding: 0, gap: 0 }}>
      {header}
      {form.sections.map((s, i) => {
        const total = QUESTION_COUNTS[s.subject];
        const err = s.included ? sectionError(s) : null;
        const blank = total - num(s.correct) - num(s.wrong);
        const net = formatNet(num(s.correct) - num(s.wrong) / 4);
        const ink = subjectColor(theme, s.subject);
        // The whole cell (at least one touch target) toggles; the switch inside only draws the
        // state, so a tap on it can't toggle twice. The knob is white in both themes.
        const toggle = (
          <PressableScale
            kind="bubble"
            accessibilityRole="switch"
            accessibilityLabel={`${s.subject} bölümüne girdim`}
            accessibilityState={{ checked: s.included }}
            onPress={() => {
              haptics.select();
              updateSection(s.subject, { included: !s.included });
            }}
            style={{ width: controlCol, height: touch, alignItems: 'flex-end', justifyContent: 'center' }}
          >
            <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
              <Switch
                value={s.included}
                trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                thumbColor={theme.colors.onPrimary}
                ios_backgroundColor={theme.colors.border}
                {...({ activeThumbColor: theme.colors.onPrimary } as object)}
              />
            </View>
          </PressableScale>
        );
        const name = (
          <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Dot color={ink} />
            <View style={{ flexShrink: 1 }}>
              <AppText weight="semibold" numberOfLines={2}>
                {s.subject}
              </AppText>
              <AppText variant="caption" color="textMuted">
                {total} soru
              </AppText>
            </View>
          </View>
        );
        const wells = (
          <>
            <NumberField label="Doğru" accessibilityLabel={`${s.subject} doğru`} hideLabel={table} width={col} value={s.correct} invalid={!!err} onChangeText={(t) => updateSection(s.subject, { correct: t })} />
            <NumberField label="Yanlış" accessibilityLabel={`${s.subject} yanlış`} hideLabel={table} width={col} value={s.wrong} invalid={!!err} onChangeText={(t) => updateSection(s.subject, { wrong: t })} />
            <Figure label="Boş" hideLabel={table} width={col} value={err ? '–' : String(blank)} muted />
            <Figure label="Net" hideLabel={table} width={col} value={net} />
          </>
        );
        const off = (
          <AppText variant="label" color="textMuted">
            Girmedin. Branş denemesinde girmediğin dersleri kapat.
          </AppText>
        );

        // Topics sit under the subject's name (past its dot), so they read as its children.
        const undoHere = undo && undo.subject === s.subject ? undo : null;
        const topics = s.included && (s.topics.length || undoHere) ? (
          <View style={{ gap: theme.spacing.sm, paddingLeft: theme.spacing.sm * 2 }}>
            <AppText variant="label" color="textMuted">
              Konu analizi
            </AppText>
            {/* More air between topics than inside one, so each name reads with its own numbers. */}
            <View style={{ gap: theme.spacing.lg }}>
              {s.topics.map((t, index) => {
                const topic = getTopic(t.topicId);
                const topicName = topic ? topicLabel(topic) : t.topicId;
                const topicNet = formatNet(num(t.correct) - num(t.wrong) / 4);
                const remove = (
                  <PressableScale
                    kind="bubble"
                    accessibilityRole="button"
                    accessibilityLabel={`${topicName} konusunu kaldır`}
                    onPress={() => {
                      haptics.select();
                      setRemoved({ exam: form.exam, subject: s.subject, topic: t, index, name: topicName });
                      updateTopic(s.subject, t.topicId, null);
                    }}
                    style={{ width: table ? controlCol : touch, height: touch, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon name="circle-x" size={theme.layout.iconSize.sm} color={theme.colors.textMuted} />
                  </PressableScale>
                );
                const topicWells = (['correct', 'wrong', 'blank'] as const).map((k) => (
                  <NumberField
                    key={k}
                    compact
                    hideLabel={table}
                    width={table ? col : undefined}
                    label={k === 'correct' ? 'D' : k === 'wrong' ? 'Y' : 'B'}
                    accessibilityLabel={`${topicName} ${k === 'correct' ? 'doğru' : k === 'wrong' ? 'yanlış' : 'boş'}`}
                    value={t[k]}
                    onChangeText={(v) => updateTopic(s.subject, t.topicId, { [k]: v })}
                  />
                ));
                return table ? (
                  // The name gets the full line; under it the D / Y / B sit under Doğru, Yanlış and
                  // Boş, the topic's net under Net and its remove button in the Girdim column.
                  <View key={t.topicId} style={{ gap: theme.spacing.xs }}>
                    <AppText variant="label">{topicName}</AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
                      <View style={{ flex: 1 }} />
                      {topicWells}
                      <View accessible accessibilityLabel={`${topicName} net ${topicNet}`} style={{ width: col, alignItems: 'center' }}>
                        <AppText variant="numeric" color="textMuted">
                          {topicNet}
                        </AppText>
                      </View>
                      {remove}
                    </View>
                  </View>
                ) : (
                  <View key={t.topicId} style={{ gap: theme.spacing.xs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <AppText variant="label" style={{ flex: 1 }}>
                        {topicName}
                      </AppText>
                      {remove}
                    </View>
                    <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>{topicWells}</View>
                  </View>
                );
              })}
              {undoHere ? (
                // One tap removed the topic's numbers; this brings them back.
                <Animated.View
                  key={`undo-${undoHere.topic.topicId}`}
                  entering={enter({ still: true, duration: theme.motion.duration.base })}
                  exiting={exit()}
                  style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: theme.spacing.md }}
                >
                  <AppText variant="label" color="textMuted" style={{ flexShrink: 1 }}>
                    {undoHere.name} kaldırıldı.
                  </AppText>
                  <Button
                    label="Geri al"
                    icon="rotate-ccw"
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      restoreTopic(undoHere.subject, undoHere.topic, undoHere.index);
                      setRemoved(null);
                    }}
                  />
                </Animated.View>
              ) : null}
            </View>
          </View>
        ) : null;

        return (
          <Fragment key={s.subject}>
            {i > 0 || table ? <GroupDivider /> : null}
            <View style={{ paddingHorizontal: sheetPadding, paddingVertical: padY + theme.spacing.xs, gap: theme.spacing.md }}>
              {table ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
                  {name}
                  {s.included ? (
                    <Animated.View key="in" entering={swapIn} style={{ flexDirection: 'row', alignItems: 'center', gap }}>
                      {wells}
                    </Animated.View>
                  ) : (
                    <Animated.View key="out" entering={swapIn} style={{ width: col * 4 + gap * 3 }}>
                      {off}
                    </Animated.View>
                  )}
                  {toggle}
                </View>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                    {name}
                    {toggle}
                  </View>
                  {s.included ? (
                    <Animated.View key="in" entering={swapIn} style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                      {wells}
                    </Animated.View>
                  ) : (
                    <Animated.View key="out" entering={swapIn}>
                      {off}
                    </Animated.View>
                  )}
                </>
              )}
              {err ? (
                <Animated.View entering={swapIn}>
                  <AppText variant="label" color="danger">
                    {err}
                  </AppText>
                </Animated.View>
              ) : null}
              {topics}
            </View>
          </Fragment>
        );
      })}
    </Card>
  );
}
