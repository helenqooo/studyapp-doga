// In-memory stand-in for the server, used when no API address is configured (or with
// EXPO_PUBLIC_DEMO=1). Same shape as the HTTP client; data resets when the app reloads.

import { getTopic, SUBJECTS_BY_EXAM, topicLabel, type Exam, type Subject } from '../../data/topics';
import { ApiError } from '../errors';
import type {
  Attempt,
  AttemptInput,
  AttemptResponse,
  AttemptResult,
  ChatMessage,
  ChatThread,
  ExamInput,
  ExamResult,
  ExamSectionInput,
  Facets,
  KarneDraft,
  Overview,
  Profile,
  Question,
  QuestionFilter,
  QuestionPage,
  ReviewResultResponse,
  ReviewsToday,
  ReviewState,
  TopicLoss,
  WeeklySummary,
} from '../types';
import {
  addDays,
  ANALYSIS_WINDOW_DAYS,
  DAY_MS,
  initialSchedule,
  intervalDays,
  levelFromXp,
  localDate,
  lostNet,
  MAX_USER_MESSAGES,
  net,
  nextSchedule,
  PRACTICE_WEIGHT,
  questionCount,
  round2,
  XP,
} from './logic';
import { DEMO_QUESTIONS, type DemoQuestion } from './questions';
import { SAMPLE_KARNE, SEED_EXAMS, SEED_QUESTIONS, SEED_STREAK, SEED_XP } from './seed';

interface QuestionRow {
  id: string;
  createdAt: number;
  data: DemoQuestion;
}
interface AttemptRow extends Omit<Attempt, 'createdAt'> {
  questionId: string;
  createdAt: number;
}
interface ReviewRow {
  questionId: string;
  stage: number;
  dueDate: string;
  status: 'active' | 'graduated';
  correctCount: number;
  lastResult: AttemptResult | null;
  lastReviewedAt: number | null;
  createdAt: number;
}
interface MessageRow extends Omit<ChatMessage, 'createdAt'> {
  questionId: string;
  createdAt: number;
}
interface ExamRow {
  id: string;
  createdAt: number;
  date: string;
  exam: Exam;
  name: string | null;
  sections: ExamSectionInput[];
}

const iso = (ts: number) => new Date(ts).toISOString();
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
/** Typical round trip, so loading states are visible but brief. */
const QUICK_MS = 160;

let counter = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

/** A time `days` ago, at a plausible study hour. */
const daysAgo = (days: number, hour = 19) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 10 + ((days * 7) % 40), 0, 0);
  return d.getTime();
};

const byKey = new Map(DEMO_QUESTIONS.map((q) => [q.key, q]));

/** Students type plain text: drop the LaTeX delimiters from a seeded question. */
const plainQuestion = (text: string) => text.replace(/\$/g, '');

const db = {
  xp: SEED_XP,
  questions: [] as QuestionRow[],
  attempts: [] as AttemptRow[],
  reviews: [] as ReviewRow[],
  messages: [] as MessageRow[],
  exams: [] as ExamRow[],
  summaryGeneratedAt: daysAgo(1, 8),
  /** Sample chosen with "Örnek soruyu çöz"; the next solve returns it. */
  armedKey: null as string | null,
};

function seed() {
  const today = localDate(Date.now());
  for (const sq of SEED_QUESTIONS) {
    const data = byKey.get(sq.key);
    if (!data) continue;
    const createdAt = daysAgo(sq.daysAgo, 18);
    const id = `demo-${sq.key}`;
    db.questions.push({ id, createdAt, data });
    db.attempts.push({
      id: `${id}-a0`,
      questionId: id,
      createdAt: createdAt + 6 * 60_000,
      source: 'solve',
      result: sq.result,
      userAnswer: sq.userAnswer ?? null,
      hintsUsed: sq.hintsUsed ?? 0,
      viewedSolution: sq.viewedSolution ?? false,
    });
    if (sq.review) {
      const r = sq.review;
      const reviewedAt = r.lastReviewedDaysAgo !== undefined ? daysAgo(r.lastReviewedDaysAgo, 20) : null;
      // One review attempt per correct answer so far, spread before the last review.
      for (let i = 0; i < r.correctCount; i++) {
        const at = reviewedAt !== null ? reviewedAt - i * 3 * DAY_MS : createdAt + (i + 1) * DAY_MS;
        db.attempts.push({
          id: `${id}-r${i}`,
          questionId: id,
          createdAt: at,
          source: 'review',
          result: 'correct',
          userAnswer: null,
          hintsUsed: 0,
          viewedSolution: false,
        });
      }
      db.reviews.push({
        questionId: id,
        stage: r.stage,
        dueDate: addDays(today, r.dueInDays),
        status: r.status ?? 'active',
        correctCount: r.correctCount,
        lastResult: r.correctCount ? 'correct' : null,
        lastReviewedAt: reviewedAt,
        createdAt: createdAt + 6 * 60_000,
      });
    }
    if (sq.chat) {
      db.messages.push(
        { id: `${id}-m0`, questionId: id, role: 'user', content: plainQuestion(data.followUp.question), createdAt: createdAt + 9 * 60_000 },
        { id: `${id}-m1`, questionId: id, role: 'assistant', content: data.followUp.answer, createdAt: createdAt + 9 * 60_000 + 1 },
      );
    }
  }
  db.attempts.sort((a, b) => a.createdAt - b.createdAt);
  for (const e of SEED_EXAMS) {
    const createdAt = daysAgo(e.daysAgo, 21);
    db.exams.push({ id: newId('exam'), createdAt, date: localDate(createdAt), exam: e.exam, name: e.name, sections: e.sections });
  }
}
seed();

// ---------------------------------------------------------------- DTOs

function profileDto(): Profile {
  return {
    xp: db.xp,
    ...levelFromXp(db.xp),
    streak: SEED_STREAK.current,
    longestStreak: SEED_STREAK.longest,
    badges: [],
    settings: { focusMinutes: 25, breakMinutes: 5 },
  };
}

function attemptDto(a: AttemptRow): Attempt {
  return {
    id: a.id,
    createdAt: iso(a.createdAt),
    source: a.source,
    result: a.result,
    userAnswer: a.userAnswer,
    hintsUsed: a.hintsUsed,
    viewedSolution: a.viewedSolution,
  };
}

function reviewDto(r: ReviewRow): ReviewState {
  return {
    stage: r.stage,
    intervalDays: intervalDays(r.stage),
    dueDate: r.dueDate,
    status: r.status,
    correctCount: r.correctCount,
    lastResult: r.lastResult,
    lastReviewedAt: r.lastReviewedAt ? iso(r.lastReviewedAt) : null,
  };
}

function questionDto(q: QuestionRow): Question {
  const { data } = q;
  const review = db.reviews.find((r) => r.questionId === q.id);
  return {
    id: q.id,
    createdAt: iso(q.createdAt),
    exam: data.exam,
    subject: data.subject,
    topicId: data.topicId,
    difficulty: data.difficulty,
    questionText: data.questionText,
    hints: [...data.hints],
    solutionSteps: [...data.solutionSteps],
    finalAnswer: data.finalAnswer,
    confidence: data.confidence,
    attempts: db.attempts.filter((a) => a.questionId === q.id).map(attemptDto),
    review: review ? reviewDto(review) : null,
    messageCount: db.messages.filter((m) => m.questionId === q.id).length,
  };
}

function examDto(e: ExamRow): ExamResult {
  const sections = e.sections.map((s) => ({
    subject: s.subject,
    questions: questionCount(s.subject) || s.correct + s.wrong + s.blank,
    correct: s.correct,
    wrong: s.wrong,
    blank: s.blank,
    net: round2(net(s.correct, s.wrong)),
    topics: (s.topics ?? []).map((t) => ({ ...t, net: round2(net(t.correct, t.wrong)) })),
  }));
  return {
    id: e.id,
    createdAt: iso(e.createdAt),
    date: e.date,
    exam: e.exam,
    name: e.name,
    sections,
    totalNet: round2(sections.reduce((sum, s) => sum + s.net, 0)),
    totalQuestions: sections.reduce((sum, s) => sum + s.questions, 0),
  };
}

function findQuestion(id: string): QuestionRow {
  const q = db.questions.find((x) => x.id === id);
  if (!q) throw new ApiError('Soru bulunamadı.', 404);
  return q;
}

function findExam(id: string): ExamRow {
  const e = db.exams.find((x) => x.id === id);
  if (!e) throw new ApiError('Deneme bulunamadı.', 404);
  return e;
}

/** Orders sections like the exam and drops empty topic rows (as the server does). */
function normalizeSections(exam: Exam, sections: ExamSectionInput[]): ExamSectionInput[] {
  const order = SUBJECTS_BY_EXAM[exam];
  return [...sections]
    .sort((a, b) => order.indexOf(a.subject as Subject) - order.indexOf(b.subject as Subject))
    .map((s) => ({ ...s, topics: (s.topics ?? []).filter((t) => t.correct + t.wrong + t.blank > 0) }));
}

function validateExam(input: ExamInput) {
  if (!input.sections.length) throw new ApiError('En az bir ders girilmeli.', 400);
  for (const s of input.sections) {
    const total = questionCount(s.subject);
    if (s.correct + s.wrong + s.blank > total) {
      throw new ApiError(`${s.subject}: doğru + yanlış + boş toplamı ${total} soruyu geçemez.`, 400);
    }
  }
}

// ---------------------------------------------------------------- stats

function examSummary(exam: Exam) {
  const list = db.exams
    .filter((e) => e.exam === exam)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map(examDto);
  const subjects = SUBJECTS_BY_EXAM[exam];
  const trend = list.map((e) => ({
    id: e.id,
    date: e.date,
    name: e.name,
    totalNet: e.totalNet,
    totalQuestions: e.totalQuestions,
    complete: e.sections.length === subjects.length,
    sections: Object.fromEntries(e.sections.map((s) => [s.subject, s.net])) as Record<string, number>,
  }));
  return {
    count: list.length,
    maxNet: subjects.reduce((sum, s) => sum + questionCount(s), 0),
    trend,
    subjects: subjects.map((subject) => {
      const nets = list.flatMap((e) => e.sections.filter((s) => s.subject === subject).map((s) => s.net));
      const recent = nets.slice(-5);
      return {
        subject,
        questions: questionCount(subject),
        count: nets.length,
        latestNet: nets.at(-1) ?? null,
        previousNet: nets.at(-2) ?? null,
        averageNet: recent.length ? round2(recent.reduce((a, b) => a + b, 0) / recent.length) : null,
        bestNet: nets.length ? Math.max(...nets) : null,
      };
    }),
  };
}

function topicLosses(now: number): TopicLoss[] {
  const since = addDays(localDate(now), -ANALYSIS_WINDOW_DAYS);
  const tallies = new Map<string, Omit<TopicLoss, 'topicId' | 'subject' | 'lostNet' | 'examLost' | 'practiceLost'>>();
  const tally = (topicId: string) => {
    let x = tallies.get(topicId);
    if (!x) {
      x = { examCorrect: 0, examWrong: 0, examBlank: 0, practiceCorrect: 0, practiceWrong: 0, practiceBlank: 0 };
      tallies.set(topicId, x);
    }
    return x;
  };
  for (const e of db.exams.filter((x) => x.date >= since)) {
    for (const s of e.sections) {
      for (const t of s.topics ?? []) {
        const x = tally(t.topicId);
        x.examCorrect += t.correct;
        x.examWrong += t.wrong;
        x.examBlank += t.blank;
      }
    }
  }
  for (const a of db.attempts.filter((x) => x.createdAt >= now - ANALYSIS_WINDOW_DAYS * DAY_MS)) {
    const q = db.questions.find((x) => x.id === a.questionId);
    if (!q) continue;
    const x = tally(q.data.topicId);
    if (a.result === 'correct') x.practiceCorrect += 1;
    else if (a.result === 'wrong') x.practiceWrong += 1;
    else x.practiceBlank += 1;
  }
  return [...tallies.entries()]
    .map(([topicId, x]) => {
      const examLost = lostNet(x.examWrong, x.examBlank);
      const practiceLost = PRACTICE_WEIGHT * lostNet(x.practiceWrong, x.practiceBlank);
      return {
        topicId,
        subject: getTopic(topicId)?.subject ?? null,
        lostNet: round2(examLost + practiceLost),
        examLost: round2(examLost),
        practiceLost: round2(practiceLost),
        ...x,
      };
    })
    .filter((x) => x.lostNet > 0)
    .sort((a, b) => b.lostNet - a.lostNet);
}

function weeklySummaryDto(): WeeklySummary {
  const now = Date.now();
  const top = topicLosses(now).slice(0, 3);
  if (!top.length) return { status: 'insufficient' };
  const today = localDate(now);
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  const reason = (t: TopicLoss) => {
    const parts = [];
    if (t.examWrong || t.examBlank) parts.push(`denemelerde ${t.examWrong} yanlış, ${t.examBlank} boş`);
    if (t.practiceWrong || t.practiceBlank) parts.push(`çözdüğün sorularda ${t.practiceWrong + t.practiceBlank} hata`);
    return `Son 90 günde ${t.lostNet.toLocaleString('tr-TR')} net kaybettiğin konu (${parts.join('; ')}). Kısa bir konu tekrarından sonra 15–20 soruluk bir set çöz; yanlışlarını fotoğraflayıp tekrar listesine ekle.`;
  };
  const first = getTopic(top[0]!.topicId);
  return {
    status: 'ok',
    weekStart: addDays(today, -((dow + 6) % 7)),
    generatedAt: iso(db.summaryGeneratedAt),
    summary: `Netlerin son denemelerde istikrarlı biçimde artıyor. Bu hafta en çok net kazandıracak konu ${first ? topicLabel(first) : 'listenin başındaki'}; aşağıdaki üç konuya ağırlık ver.`,
    priorities: top.map((t) => ({ topicId: t.topicId, reason: reason(t) })),
  };
}

// ---------------------------------------------------------------- tutor

function tutorReply(q: DemoQuestion, message: string): string {
  const text = message.trim().toLocaleLowerCase('tr-TR');
  if (text === plainQuestion(q.followUp.question).trim().toLocaleLowerCase('tr-TR')) return q.followUp.answer;
  if (text.includes('basit')) {
    return `Tabii, daha sade anlatayım:\n\n${q.hints.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n\nBu adımları izleyince cevap **${q.finalAnswer}** çıkıyor.`;
  }
  if (text.includes('ilk adım')) {
    return `İlk adımda şunu yaptık:\n\n${q.solutionSteps[0] ?? ''}\n\nBundan sonraki her adım bunun üzerine kuruluyor. Hangi kısmı takıldığını yazarsan oradan devam edelim.`;
  }
  if (text.includes('benzer')) {
    const sameSubject = DEMO_QUESTIONS.find((d) => d.subject === q.subject && d.key !== q.key);
    const other =
      sameSubject ?? DEMO_QUESTIONS.find((d) => d.exam === q.exam && d.key !== q.key) ?? DEMO_QUESTIONS.find((d) => d.key !== q.key);
    const from = sameSubject ? 'aynı dersten' : 'başka bir dersten';
    return `Demo modunda yeni soru üretemiyorum; gerçek sürümde sana bu soruya benzeyen yeni bir soru yazarım. Şimdilik ${from} şunu dene:\n\n${other?.questionText ?? ''}`;
  }
  return `**Demo yanıtı.** Gerçek sürümde sorduğun şeye özel cevap verilir. Bu soruda en sık sorulan şuydu: *${q.followUp.question}*\n\n${q.followUp.answer}`;
}

// ---------------------------------------------------------------- API

/** Simulated upload: reports progress over ~0.6 s like a real upload would. */
async function fakeUpload(onUploadProgress?: (fraction: number) => void) {
  for (const f of [0.2, 0.55, 0.85, 1]) {
    await wait(150);
    onUploadProgress?.(f);
  }
}

/** The next sample that isn't in the history yet (cycles once all are used). */
function nextSampleKey(): string {
  const used = new Set(db.questions.map((q) => q.data.key));
  const fresh = DEMO_QUESTIONS.find((q) => !used.has(q.key));
  if (fresh) return fresh.key;
  const counts = new Map<string, number>();
  for (const q of db.questions) counts.set(q.data.key, (counts.get(q.data.key) ?? 0) + 1);
  return [...DEMO_QUESTIONS].sort((a, b) => (counts.get(a.key) ?? 0) - (counts.get(b.key) ?? 0))[0]!.key;
}

export const demoApi = {
  health: async () => {
    await wait(QUICK_MS);
    return { ok: true };
  },
  profile: async (): Promise<Profile> => {
    await wait(QUICK_MS);
    return profileDto();
  },
  question: async (id: string): Promise<Question> => {
    await wait(QUICK_MS);
    return questionDto(findQuestion(id));
  },
  attempt: async (id: string, input: AttemptInput): Promise<AttemptResponse> => {
    await wait(QUICK_MS * 2);
    const q = findQuestion(id);
    if (db.attempts.some((a) => a.questionId === id && a.source === 'solve')) {
      throw new ApiError('Bu soru zaten işaretlendi.', 409);
    }
    const now = Date.now();
    const attempt: AttemptRow = {
      id: newId('att'),
      questionId: q.id,
      createdAt: now,
      source: 'solve',
      result: input.result,
      userAnswer: input.userAnswer || null,
      hintsUsed: input.hintsUsed,
      viewedSolution: input.viewedSolution,
    };
    db.attempts.push(attempt);
    if (input.result !== 'correct' && !db.reviews.some((r) => r.questionId === q.id)) {
      const schedule = initialSchedule(localDate(now));
      db.reviews.push({ questionId: q.id, ...schedule, correctCount: 0, lastResult: null, lastReviewedAt: null, createdAt: now });
    }
    db.xp += XP.solveQuestion;
    return { attempt: attemptDto(attempt), xpGained: XP.solveQuestion, profile: profileDto() };
  },
  questions: async (filter: QuestionFilter, offset: number): Promise<QuestionPage> => {
    await wait(QUICK_MS);
    const all = db.questions
      .filter((q) => (!filter.subject || q.data.subject === filter.subject) && (!filter.topicId || q.data.topicId === filter.topicId))
      .sort((a, b) => b.createdAt - a.createdAt);
    const items = all.slice(offset, offset + 30);
    return {
      items: items.map(questionDto),
      total: all.length,
      nextOffset: offset + items.length < all.length ? offset + items.length : null,
    };
  },
  facets: async (): Promise<Facets> => {
    await wait(QUICK_MS);
    const subjects = new Map<string, number>();
    const topics = new Map<string, number>();
    for (const q of db.questions) {
      subjects.set(q.data.subject, (subjects.get(q.data.subject) ?? 0) + 1);
      topics.set(q.data.topicId, (topics.get(q.data.topicId) ?? 0) + 1);
    }
    return {
      total: db.questions.length,
      subjects: [...subjects].map(([subject, count]) => ({ subject, count })),
      topics: [...topics].map(([topicId, count]) => ({ topicId, count })),
    };
  },
  reviewsToday: async (): Promise<ReviewsToday> => {
    await wait(QUICK_MS);
    const today = localDate(Date.now());
    const due = db.reviews
      .filter((r) => r.status === 'active' && r.dueDate <= today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.createdAt - b.createdAt);
    return {
      today,
      items: due.map((r) => questionDto(findQuestion(r.questionId))),
      completedToday: db.reviews.filter((r) => r.lastReviewedAt !== null && localDate(r.lastReviewedAt) === today).length,
    };
  },
  reviewResult: async (id: string, input: { result: 'correct' | 'wrong'; viewedSolution: boolean }): Promise<ReviewResultResponse> => {
    await wait(QUICK_MS * 2);
    const now = Date.now();
    const today = localDate(now);
    const review = db.reviews.find((r) => r.questionId === id);
    if (!review) throw new ApiError('Bu soru tekrar listende değil.', 404);
    if (review.status !== 'active' || review.dueDate > today) throw new ApiError('Bu sorunun tekrar zamanı henüz gelmedi.', 409);
    const correct = input.result === 'correct';
    Object.assign(review, nextSchedule(review.stage, correct, today), {
      correctCount: correct ? review.correctCount + 1 : review.correctCount,
      lastResult: input.result,
      lastReviewedAt: now,
    });
    const attempt: AttemptRow = {
      id: newId('att'),
      questionId: id,
      createdAt: now,
      source: 'review',
      result: input.result,
      userAnswer: null,
      hintsUsed: 0,
      viewedSolution: input.viewedSolution,
    };
    db.attempts.push(attempt);
    const xpGained = correct ? XP.reviewCorrect : 0;
    db.xp += xpGained;
    return { review: reviewDto(review), attempt: attemptDto(attempt), xpGained, profile: profileDto() };
  },
  messages: async (id: string): Promise<ChatThread> => {
    await wait(QUICK_MS);
    findQuestion(id);
    return {
      items: db.messages
        .filter((m) => m.questionId === id)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((m) => ({ id: m.id, role: m.role, content: m.content, createdAt: iso(m.createdAt) })),
      limit: MAX_USER_MESSAGES,
    };
  },
  sendMessage: async (id: string, content: string): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> => {
    const q = findQuestion(id);
    const sent = db.messages.filter((m) => m.questionId === id && m.role === 'user').length;
    if (sent >= MAX_USER_MESSAGES) throw new ApiError(`Bu soru için en fazla ${MAX_USER_MESSAGES} soru sorabilirsin.`, 409);
    await wait(1800);
    const now = Date.now();
    const user: MessageRow = { id: newId('msg'), questionId: id, role: 'user', content: content.trim(), createdAt: now };
    const assistant: MessageRow = { id: newId('msg'), questionId: id, role: 'assistant', content: tutorReply(q.data, content), createdAt: now + 1 };
    db.messages.push(user, assistant);
    const dto = (m: MessageRow): ChatMessage => ({ id: m.id, role: m.role, content: m.content, createdAt: iso(m.createdAt) });
    return { userMessage: dto(user), assistantMessage: dto(assistant) };
  },

  /** Returns a sample question (the one picked with "Örnek soruyu çöz", or the next unused one). */
  solve: async (_imageUri: string, onUploadProgress?: (fraction: number) => void): Promise<Question> => {
    await fakeUpload(onUploadProgress);
    await wait(2600);
    const key = db.armedKey ?? nextSampleKey();
    db.armedKey = null;
    const row: QuestionRow = { id: newId('q'), createdAt: Date.now(), data: byKey.get(key)! };
    db.questions.push(row);
    return questionDto(row);
  },

  exams: async (): Promise<{ items: ExamResult[] }> => {
    await wait(QUICK_MS);
    return {
      items: [...db.exams].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).map(examDto),
    };
  },
  exam: async (id: string): Promise<ExamResult> => {
    await wait(QUICK_MS);
    return examDto(findExam(id));
  },
  parseKarne: async (_imageUri: string, onUploadProgress?: (fraction: number) => void): Promise<KarneDraft> => {
    await fakeUpload(onUploadProgress);
    await wait(2200);
    return {
      exam: SAMPLE_KARNE.exam,
      name: SAMPLE_KARNE.name,
      date: localDate(Date.now()),
      sections: SAMPLE_KARNE.sections.map((s) => ({ ...s, topics: s.topics?.map((t) => ({ ...t })) })),
      confidence: 0.93,
      warnings: ['Demo modu: değerler örnek bir karneden geliyor, fotoğrafın okunmadı.'],
    };
  },
  createExam: async (input: ExamInput): Promise<{ exam: ExamResult; xpGained: number; profile: Profile }> => {
    await wait(QUICK_MS * 2);
    validateExam(input);
    const row: ExamRow = {
      id: newId('exam'),
      createdAt: Date.now(),
      date: input.date,
      exam: input.exam,
      name: input.name?.trim() || null,
      sections: normalizeSections(input.exam, input.sections),
    };
    db.exams.push(row);
    db.xp += XP.examEntry;
    return { exam: examDto(row), xpGained: XP.examEntry, profile: profileDto() };
  },
  updateExam: async (id: string, input: ExamInput): Promise<ExamResult> => {
    await wait(QUICK_MS * 2);
    validateExam(input);
    const row = findExam(id);
    Object.assign(row, {
      date: input.date,
      exam: input.exam,
      name: input.name?.trim() || null,
      sections: normalizeSections(input.exam, input.sections),
    });
    return examDto(row);
  },
  deleteExam: async (id: string): Promise<null> => {
    await wait(QUICK_MS);
    findExam(id);
    db.exams = db.exams.filter((e) => e.id !== id);
    return null;
  },
  overview: async (): Promise<Overview> => {
    await wait(QUICK_MS * 2);
    const now = Date.now();
    const today = localDate(now);
    const recent = db.attempts.filter((a) => a.createdAt >= now - ANALYSIS_WINDOW_DAYS * DAY_MS);
    return {
      today,
      windowDays: ANALYSIS_WINDOW_DAYS,
      byExam: { TYT: examSummary('TYT'), AYT: examSummary('AYT') },
      topicLosses: topicLosses(now).slice(0, 10),
      practice: {
        attempts: recent.length,
        correct: recent.filter((a) => a.result === 'correct').length,
        wrong: recent.filter((a) => a.result === 'wrong').length,
        blank: recent.filter((a) => a.result === 'blank').length,
        activeReviews: db.reviews.filter((r) => r.status === 'active').length,
        dueToday: db.reviews.filter((r) => r.status === 'active' && r.dueDate <= today).length,
      },
    };
  },
  weeklySummary: async (refresh = false): Promise<WeeklySummary> => {
    if (refresh) {
      await wait(2400);
      db.summaryGeneratedAt = Date.now();
    } else {
      await wait(QUICK_MS * 3);
    }
    return weeklySummaryDto();
  },
};

/** Image of a question in demo mode (bundled asset). */
export function demoQuestionImage(id: string): DemoQuestion['image'] | null {
  return db.questions.find((q) => q.id === id)?.data.image ?? null;
}

/** Picks the next sample for "Örnek soruyu çöz" and makes the next solve return it. */
export function armNextSample(): DemoQuestion {
  const key = nextSampleKey();
  db.armedKey = key;
  return byKey.get(key)!;
}
