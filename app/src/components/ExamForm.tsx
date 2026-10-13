import { useState } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';
import type { ExamInput, ExamResult, KarneDraft } from '../api/types';
import { getTopic, QUESTION_COUNTS, SUBJECTS_BY_EXAM, topicLabel, type Exam, type Subject } from '../data/topics';
import { formatNet, localToday, longDate, shiftDate } from '../lib/format';
import { haptics } from '../lib/haptics';
import { font, useTheme } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { Grid } from './Grid';
import { Icon } from './Icon';
import { NumberField } from './NumberField';
import { SegmentedControl } from './SegmentedControl';

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
}

/** The one editable form both entry paths (karne photo, manual) end up in. */
export function ExamForm({ initial, submitLabel, submitting, error, onSubmit }: Props) {
  const theme = useTheme();
  const [form, setForm] = useState(initial);
  const today = localToday();

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

  return (
    <View style={{ gap: theme.spacing.lg }}>
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Önceki gün"
            onPress={() => {
              haptics.select();
              setForm((f) => ({ ...f, date: shiftDate(f.date, -1) }));
            }}
            style={{ width: theme.layout.minTouch, height: theme.layout.minTouch, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="chevron-left" color={theme.colors.primaryText} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <AppText weight="semibold">{longDate(form.date)}</AppText>
            <AppText variant="caption" color="textMuted">
              {form.date === today ? 'bugün' : form.date === shiftDate(today, -1) ? 'dün' : 'deneme tarihi'}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sonraki gün"
            disabled={form.date >= today}
            onPress={() => {
              haptics.select();
              setForm((f) => ({ ...f, date: shiftDate(f.date, 1) }));
            }}
            style={{
              width: theme.layout.minTouch,
              height: theme.layout.minTouch,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: form.date >= today ? 0.3 : 1,
            }}
          >
            <Icon name="chevron-right" color={theme.colors.primaryText} />
          </Pressable>
        </View>
        <TextInput
          value={form.name}
          onChangeText={(name) => setForm((f) => ({ ...f, name }))}
          placeholder="Deneme adı (isteğe bağlı), ör. Yayın TYT-3"
          placeholderTextColor={theme.colors.textMuted}
          maxLength={120}
          style={{
            minHeight: theme.layout.minTouch,
            paddingHorizontal: theme.spacing.md,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surfaceAlt,
            color: theme.colors.text,
            fontSize: theme.fontSize.md,
            ...font('sans'),
          }}
        />
      </Card>

      <Grid columns={{ compact: 1, regular: 2 }}>
        {form.sections.map((s) => {
          const total = QUESTION_COUNTS[s.subject];
          const err = s.included ? sectionError(s) : null;
          const blank = total - num(s.correct) - num(s.wrong);
          return (
            <Card key={s.subject}>
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
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <NumberField label="Doğru" value={s.correct} invalid={!!err} onChangeText={(t) => updateSection(s.subject, { correct: t })} />
                    <NumberField label="Yanlış" value={s.wrong} invalid={!!err} onChangeText={(t) => updateSection(s.subject, { wrong: t })} />
                    <View style={{ alignItems: 'center', gap: theme.spacing.xxs, minWidth: theme.layout.minTouch }}>
                      <AppText variant="caption" color="textMuted">
                        Boş
                      </AppText>
                      <AppText variant="heading" color="textMuted" style={{ lineHeight: theme.layout.minTouch, fontVariant: ['tabular-nums'] }}>
                        {err ? '—' : blank}
                      </AppText>
                    </View>
                    <View style={{ alignItems: 'center', gap: theme.spacing.xxs, minWidth: theme.layout.minTouch }}>
                      <AppText variant="caption" color="textMuted">
                        Net
                      </AppText>
                      <AppText variant="heading" style={{ lineHeight: theme.layout.minTouch, fontVariant: ['tabular-nums'] }}>
                        {formatNet(num(s.correct) - num(s.wrong) / 4)}
                      </AppText>
                    </View>
                  </View>
                  {err ? (
                    <AppText variant="label" color="danger">
                      {err}
                    </AppText>
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
                </>
              ) : (
                <AppText variant="label" color="textMuted">
                  Bu bölüme girmedin (branş denemesi için kapat).
                </AppText>
              )}
            </Card>
          );
        })}
      </Grid>

      <Card background={theme.colors.primarySoft}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm }}>
          <AppText variant="label" color="textMuted" style={{ flex: 1 }}>
            Toplam net
          </AppText>
          <AppText variant="title" tint={theme.colors.primaryText}>
            {formatNet(totalNet)}
          </AppText>
          <AppText variant="label" color="textMuted">
            / {totalQuestions}
          </AppText>
        </View>
      </Card>

      {error ? <AppText color="danger">{error}</AppText> : null}
      <Button label={submitLabel} icon="check" size="lg" loading={submitting} disabled={!canSubmit} onPress={() => onSubmit(toInput(form))} />
    </View>
  );
}
