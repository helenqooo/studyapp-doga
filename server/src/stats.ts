import { and, asc, count, eq, gte, lte } from 'drizzle-orm';
import type { Db } from './db/client';
import { attempts, exams, questions, reviews } from './db/schema';
import { examDto, lostNet } from './exams';
import { getTopic, QUESTION_COUNTS, SUBJECTS_BY_EXAM, type Exam } from './topics';
import { addDays, localDate } from './time';

/** Topic losses and practice stats look back this far. Net trends use every exam. */
export const ANALYSIS_WINDOW_DAYS = 90;

/**
 * Practice questions are photographed because they were hard, and aren't under exam
 * conditions, so a practice miss counts half as much as an exam miss.
 */
export const PRACTICE_WEIGHT = 0.5;

const DAY_MS = 24 * 60 * 60 * 1000;
const round2 = (n: number) => Math.round(n * 100) / 100;

function examSummary(db: Db, exam: Exam) {
  const list = db
    .select()
    .from(exams)
    .where(eq(exams.exam, exam))
    .orderBy(asc(exams.date), asc(exams.createdAt))
    .all()
    .map(examDto);

  const trend = list.map((e) => ({
    id: e.id,
    date: e.date,
    name: e.name,
    totalNet: e.totalNet,
    totalQuestions: e.totalQuestions,
    /** All sections entered; partial (branş) exams are left out of the total-net trend. */
    complete: e.sections.length === SUBJECTS_BY_EXAM[exam].length,
    sections: Object.fromEntries(e.sections.map((s) => [s.subject, s.net])) as Record<string, number>,
  }));

  const subjects = SUBJECTS_BY_EXAM[exam].map((subject) => {
    const nets = list.flatMap((e) => e.sections.filter((s) => s.subject === subject).map((s) => s.net));
    const recent = nets.slice(-5);
    return {
      subject,
      questions: QUESTION_COUNTS[subject],
      count: nets.length,
      latestNet: nets.at(-1) ?? null,
      previousNet: nets.at(-2) ?? null,
      averageNet: recent.length ? round2(recent.reduce((a, b) => a + b, 0) / recent.length) : null,
      bestNet: nets.length ? Math.max(...nets) : null,
    };
  });

  return {
    count: list.length,
    maxNet: SUBJECTS_BY_EXAM[exam].reduce((sum, s) => sum + QUESTION_COUNTS[s], 0),
    trend,
    subjects,
  };
}

interface TopicTally {
  examCorrect: number;
  examWrong: number;
  examBlank: number;
  practiceCorrect: number;
  practiceWrong: number;
  practiceBlank: number;
}

/** "En çok net kaybedilen konular": exam topic analyses + practice history, last 90 days. */
function topicLosses(db: Db, ts: number, today: string) {
  const since = addDays(today, -ANALYSIS_WINDOW_DAYS);
  const tallies = new Map<string, TopicTally>();
  const tally = (topicId: string) => {
    let t = tallies.get(topicId);
    if (!t) {
      t = { examCorrect: 0, examWrong: 0, examBlank: 0, practiceCorrect: 0, practiceWrong: 0, practiceBlank: 0 };
      tallies.set(topicId, t);
    }
    return t;
  };

  for (const e of db.select().from(exams).where(gte(exams.date, since)).all()) {
    for (const s of e.sections) {
      for (const t of s.topics ?? []) {
        const x = tally(t.topicId);
        x.examCorrect += t.correct;
        x.examWrong += t.wrong;
        x.examBlank += t.blank;
      }
    }
  }

  const practice = db
    .select({ topicId: questions.topicId, result: attempts.result })
    .from(attempts)
    .innerJoin(questions, eq(attempts.questionId, questions.id))
    .where(gte(attempts.createdAt, ts - ANALYSIS_WINDOW_DAYS * DAY_MS))
    .all();
  for (const p of practice) {
    const x = tally(p.topicId);
    if (p.result === 'correct') x.practiceCorrect += 1;
    else if (p.result === 'wrong') x.practiceWrong += 1;
    else x.practiceBlank += 1;
  }

  return [...tallies.entries()]
    .map(([topicId, t]) => {
      const examLost = lostNet(t.examWrong, t.examBlank);
      const practiceLost = PRACTICE_WEIGHT * lostNet(t.practiceWrong, t.practiceBlank);
      return {
        topicId,
        subject: getTopic(topicId)?.subject ?? null,
        lostNet: round2(examLost + practiceLost),
        examLost: round2(examLost),
        practiceLost: round2(practiceLost),
        ...t,
      };
    })
    .filter((t) => t.lostNet > 0)
    .sort((a, b) => b.lostNet - a.lostNet);
}

export function computeOverview(db: Db, ts: number, timeZone: string) {
  const today = localDate(ts, timeZone);
  const since = ts - ANALYSIS_WINDOW_DAYS * DAY_MS;

  const recentAttempts = db.select({ result: attempts.result }).from(attempts).where(gte(attempts.createdAt, since)).all();
  const activeReviews = db.select({ n: count() }).from(reviews).where(eq(reviews.status, 'active')).get()?.n ?? 0;
  const dueToday =
    db
      .select({ n: count() })
      .from(reviews)
      .where(and(eq(reviews.status, 'active'), lte(reviews.dueDate, today)))
      .get()?.n ?? 0;

  return {
    today,
    windowDays: ANALYSIS_WINDOW_DAYS,
    byExam: { TYT: examSummary(db, 'TYT'), AYT: examSummary(db, 'AYT') },
    topicLosses: topicLosses(db, ts, today).slice(0, 10),
    practice: {
      attempts: recentAttempts.length,
      correct: recentAttempts.filter((a) => a.result === 'correct').length,
      wrong: recentAttempts.filter((a) => a.result === 'wrong').length,
      blank: recentAttempts.filter((a) => a.result === 'blank').length,
      activeReviews,
      dueToday,
    },
  };
}

export type Overview = ReturnType<typeof computeOverview>;

/** Monday of the week containing `date` ("YYYY-MM-DD"). */
export function weekStart(date: string): string {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(date, -((dow + 6) % 7));
}
