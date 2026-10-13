import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Switch, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { ExamInput, ExamResult, KarneDraft } from '../api/types';
import { getTopic, QUESTION_COUNTS, SUBJECTS_BY_EXAM, topicLabel, type Exam, type Subject } from '../data/topics';
import { formatNet, localToday, longDate, shiftDate } from '../lib/format';
import { haptics } from '../lib/haptics';
import { elevated, subjectColor, useTheme } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { Grid } from './Grid';
import { Icon, type IconName } from './Icon';
import { Odometer } from './motion/Odometer';
import { enter } from './motion/presets';
import { PressableScale } from './motion/PressableScale';
import { NumberField } from './NumberField';
import { Screen } from './Screen';
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

/** A 44 pt round stepper (bubble press feedback, `select` haptic). */
function Stepper({ icon, label, disabled, onPress }: { icon: IconName; label: string; disabled?: boolean; onPress: () => void }) {
  const theme = useTheme();
  const { minTouch } = theme.layout.system;
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
        width: minTouch,
        height: minTouch,
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

/** Blank or net under its caption, as a numeric figure (live while typing). */
function Figure({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.xxs, minWidth: theme.layout.system.minTouch }}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <View style={{ height: theme.layout.system.minTouch, justifyContent: 'center' }}>
        <AppText variant="numeric" color={muted ? 'textMuted' : 'text'}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

/**
 * The one editable form both entry paths (karne photo, manual) end up in. Renders its own
 * Screen: section sheets in two columns with live nets, and a floating total sheet holding
 * the submit button docked over the bottom of the page.
 */
export function ExamForm({ initial, submitLabel, submitting, error, onSubmit, title, intro }: Props) {
  const theme = useTheme();
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

  const included = form.sections.filter((s) => s.included);
  const errors = included.map(sectionError).filter(Boolean);
  const totalNet = included.reduce((sum, s) => sum + num(s.correct) - num(s.wrong) / 4, 0);
  const totalQuestions = included.reduce((sum, s) => sum + QUESTION_COUNTS[s.subject], 0);
  const canSubmit = included.length > 0 && errors.length === 0 && !submitting;

  const dock = (
    <View style={{ ...elevated(theme, 'floating'), padding: theme.spacing.md, gap: theme.spacing.sm }}>
      {error ? (
        <AppText variant="label" color="danger">
          {error}
        </AppText>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.md }}>
        <View
          accessible
          accessibilityLabel={`Toplam ${formatNet(totalNet)} net, ${totalQuestions} soru`}
          style={{ flexGrow: 1, flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs, paddingLeft: theme.spacing.xs }}
        >
          <AppText variant="label" color="textMuted">
            Toplam
          </AppText>
          <Odometer value={totalNet} format={formatNet} variant="stat" />
          <AppText variant="label" color="textMuted">
            net
          </AppText>
          <AppText variant="caption" color="textMuted">
            /{totalQuestions}
          </AppText>
        </View>
        <Button label={submitLabel} icon="check" loading={submitting} disabled={!canSubmit} onPress={() => onSubmit(toInput(form))} style={{ flexGrow: 1 }} />
      </View>
    </View>
  );

  return (
    <Screen safeTop={false} width="readable" title={title} dock={dock}>
      {intro}
      <SegmentedControl
        options={[
          { value: 'TYT', label: 'TYT' },
          { value: 'AYT', label: 'AYT Sayısal' },
        ]}
        value={form.exam}
        onChange={(exam) => setForm((f) => ({ ...f, exam, sections: emptySections(exam) }))}
      />

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Stepper icon="chevron-left" label="Önceki gün" onPress={() => setForm((f) => ({ ...f, date: shiftDate(f.date, -1) }))} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <AppText weight="semibold">{longDate(form.date)}</AppText>
            <AppText variant="caption" color="textMuted">
              {form.date === today ? 'Bugün' : form.date === shiftDate(today, -1) ? 'Dün' : 'Deneme tarihi'}
            </AppText>
          </View>
          <Stepper
            icon="chevron-right"
            label="Sonraki gün"
            disabled={form.date >= today}
            onPress={() => setForm((f) => ({ ...f, date: shiftDate(f.date, 1) }))}
          />
        </View>
        <TextField
          label="Deneme adı (isteğe bağlı)"
          value={form.name}
          onChangeText={(name) => setForm((f) => ({ ...f, name }))}
          placeholder="ör. Yayın TYT-3"
          maxLength={120}
        />
      </Card>

      <Grid columns={{ compact: 1, regular: 2 }}>
        {form.sections.map((s) => {
          const total = QUESTION_COUNTS[s.subject];
          const err = s.included ? sectionError(s) : null;
          const blank = total - num(s.correct) - num(s.wrong);
          const ink = subjectColor(theme, s.subject);
          return (
            // The accent stays on either way: toggling it would cut the color and shift the padding.
            <Card key={s.subject} accent={ink} style={{ flexGrow: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="heading">{s.subject}</AppText>
                  <AppText variant="caption" color="textMuted">
                    {total} soru
                  </AppText>
                </View>
                <Switch
                  value={s.included}
                  onValueChange={(v) => updateSection(s.subject, { included: v })}
                  trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                  thumbColor={theme.colors.surface}
                  {...({ activeThumbColor: theme.colors.surface } as object)}
                  accessibilityLabel={`${s.subject} bölümüne girdim`}
                />
              </View>

              {s.included ? (
                <Animated.View key="in" entering={swapIn} style={{ gap: theme.spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <NumberField label="Doğru" value={s.correct} invalid={!!err} onChangeText={(t) => updateSection(s.subject, { correct: t })} />
                    <NumberField label="Yanlış" value={s.wrong} invalid={!!err} onChangeText={(t) => updateSection(s.subject, { wrong: t })} />
                    <Figure label="Boş" value={err ? '–' : String(blank)} muted />
                    <Figure label="Net" value={formatNet(num(s.correct) - num(s.wrong) / 4)} />
                  </View>
                  {err ? (
                    <Animated.View entering={swapIn}>
                      <AppText variant="label" color="danger">
                        {err}
                      </AppText>
                    </Animated.View>
                  ) : null}

                  {s.topics.length ? (
                    <View style={{ gap: theme.spacing.sm }}>
                      <AppText variant="label" color="textMuted">
                        Konu analizi
                      </AppText>
                      {s.topics.map((t) => {
                        const topic = getTopic(t.topicId);
                        return (
                          <View key={t.topicId} style={{ gap: theme.spacing.xs }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <AppText variant="label" style={{ flex: 1 }} numberOfLines={2}>
                                {topic ? topicLabel(topic) : t.topicId}
                              </AppText>
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Konuyu kaldır"
                                onPress={() => updateTopic(s.subject, t.topicId, null)}
                                style={{ width: theme.layout.minTouch, height: theme.layout.minTouch, alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Icon name="circle-x" size={theme.layout.iconSize.sm} color={theme.colors.textMuted} />
                              </Pressable>
                            </View>
                            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                              <NumberField compact label="D" value={t.correct} onChangeText={(v) => updateTopic(s.subject, t.topicId, { correct: v })} />
                              <NumberField compact label="Y" value={t.wrong} onChangeText={(v) => updateTopic(s.subject, t.topicId, { wrong: v })} />
                              <NumberField compact label="B" value={t.blank} onChangeText={(v) => updateTopic(s.subject, t.topicId, { blank: v })} />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </Animated.View>
              ) : (
                <Animated.View key="out" entering={swapIn}>
                  <AppText variant="label" color="textMuted">
                    Bu bölüme girmedin (branş denemesi için kapat).
                  </AppText>
                </Animated.View>
              )}
            </Card>
          );
        })}
      </Grid>
    </Screen>
  );
}
