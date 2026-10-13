// Placeholder history for demo mode: a few weeks of solved questions, reviews and
// denemeler with a steady upward trend, all dated relative to today.

import type { AttemptResult, ExamSectionInput } from '../types';
import type { Exam } from '../../data/topics';

export interface SeedQuestion {
  /** Key into DEMO_QUESTIONS. */
  key: string;
  daysAgo: number;
  result: AttemptResult;
  userAnswer?: string;
  hintsUsed?: number;
  viewedSolution?: boolean;
  /** Review state now, for wrong/blank questions. Due offset is relative to today. */
  review?: { stage: number; dueInDays: number; correctCount: number; status?: 'active' | 'graduated'; lastReviewedDaysAgo?: number };
  /** Seed the "Anlamadım" chat with the question's follow-up. */
  chat?: boolean;
}

/**
 * Seven questions in the history; due today: olasılık, üslü sayılar, üçgende alan,
 * çember and türev. The rest stay unsolved so "Soru Çöz" has fresh samples.
 */
export const SEED_QUESTIONS: SeedQuestion[] = [
  { key: 'tyt-fen-hareket-kuvvet-1', daysAgo: 58, result: 'wrong', userAnswer: 'C', hintsUsed: 1, viewedSolution: true,
    review: { stage: 4, dueInDays: 0, correctCount: 5, status: 'graduated', lastReviewedDaysAgo: 2 } },
  { key: 'tyt-tr-paragraf-ana-dusunce-1', daysAgo: 15, result: 'correct', userAnswer: 'E' },
  { key: 'tyt-mat-yas-1', daysAgo: 12, result: 'correct', userAnswer: 'D', hintsUsed: 1 },
  { key: 'tyt-mat-olasilik-1', daysAgo: 9, result: 'wrong', userAnswer: 'A', hintsUsed: 2, viewedSolution: true,
    review: { stage: 1, dueInDays: 0, correctCount: 1, lastReviewedDaysAgo: 3 } },
  { key: 'ayt-integral-1', daysAgo: 6, result: 'wrong', userAnswer: 'A', viewedSolution: true,
    review: { stage: 1, dueInDays: 1, correctCount: 1, lastReviewedDaysAgo: 2 } },
  { key: 'tyt-mat-uslu-1', daysAgo: 5, result: 'blank', viewedSolution: true, review: { stage: 0, dueInDays: -4, correctCount: 0 } },
  { key: 'tyt-fen-mol-1', daysAgo: 4, result: 'correct', userAnswer: 'C' },
  { key: 'tyt-geo-ucgende-alan-1', daysAgo: 3, result: 'wrong', userAnswer: 'A', hintsUsed: 3, viewedSolution: true,
    review: { stage: 0, dueInDays: -2, correctCount: 0 }, chat: true },
  { key: 'ayt-turev-1', daysAgo: 2, result: 'wrong', userAnswer: 'C', hintsUsed: 2, review: { stage: 0, dueInDays: -1, correctCount: 0 } },
  { key: 'tyt-geo-cember-daire-1', daysAgo: 1, result: 'blank', viewedSolution: true, review: { stage: 0, dueInDays: 0, correctCount: 0 } },
  // Today: one question solved, so Home's rings show the day under way.
  { key: 'tyt-fen-hucre-1', daysAgo: 0, result: 'correct', userAnswer: 'D' },
];

export interface SeedExam {
  exam: Exam;
  name: string;
  daysAgo: number;
  sections: ExamSectionInput[];
}

const s = (subject: string, correct: number, wrong: number, blank: number, topics?: ExamSectionInput['topics']) => ({
  subject,
  correct,
  wrong,
  blank,
  topics: topics ?? [],
});
const t = (topicId: string, correct: number, wrong: number, blank: number) => ({ topicId, correct, wrong, blank });

export const SEED_EXAMS: SeedExam[] = [
  { exam: 'TYT', name: 'Genel Deneme 1', daysAgo: 84, sections: [s('Türkçe', 26, 8, 6), s('Sosyal', 11, 5, 4), s('Temel Matematik', 18, 9, 13), s('Fen', 7, 6, 7)] },
  { exam: 'TYT', name: 'Genel Deneme 2', daysAgo: 70, sections: [s('Türkçe', 27, 7, 6), s('Sosyal', 12, 4, 4), s('Temel Matematik', 20, 8, 12), s('Fen', 8, 5, 7)] },
  { exam: 'AYT', name: 'AYT Deneme 1', daysAgo: 63, sections: [s('Matematik', 14, 8, 18), s('Fizik', 4, 4, 6), s('Kimya', 5, 3, 5), s('Biyoloji', 6, 3, 4)] },
  { exam: 'TYT', name: 'Okul Denemesi', daysAgo: 56, sections: [s('Türkçe', 29, 6, 5), s('Sosyal', 12, 5, 3), s('Temel Matematik', 21, 9, 10), s('Fen', 9, 6, 5)] },
  { exam: 'TYT', name: 'Genel Deneme 3', daysAgo: 42, sections: [s('Türkçe', 28, 7, 5), s('Sosyal', 13, 4, 3), s('Temel Matematik', 24, 7, 9), s('Fen', 10, 5, 5)] },
  { exam: 'AYT', name: 'AYT Deneme 2', daysAgo: 35, sections: [s('Matematik', 17, 7, 16), s('Fizik', 5, 3, 6), s('Kimya', 6, 3, 4), s('Biyoloji', 7, 2, 4)] },
  {
    exam: 'TYT',
    name: 'Türkiye Geneli 1',
    daysAgo: 28,
    sections: [
      s('Türkçe', 31, 5, 4, [t('tyt-tr-paragraf-ana-dusunce', 8, 2, 0), t('tyt-tr-anlatim-bozukluklari', 1, 1, 1)]),
      s('Sosyal', 13, 4, 3),
      s('Temel Matematik', 25, 7, 8, [t('tyt-mat-problem-yas', 1, 1, 0), t('tyt-mat-olasilik', 0, 1, 1), t('tyt-geo-ucgende-alan', 1, 1, 1), t('tyt-geo-cember-daire', 0, 1, 1)]),
      s('Fen', 11, 5, 4, [t('tyt-fiz-hareket-kuvvet', 1, 1, 1), t('tyt-kim-mol', 1, 1, 0)]),
    ],
  },
  { exam: 'TYT', name: 'Branş: Temel Matematik', daysAgo: 21, sections: [s('Temel Matematik', 27, 6, 7, [t('tyt-geo-ucgende-alan', 1, 2, 0), t('tyt-mat-uslu-sayilar', 2, 1, 0)])] },
  {
    exam: 'TYT',
    name: 'Genel Deneme 4',
    daysAgo: 14,
    sections: [
      s('Türkçe', 30, 6, 4, [t('tyt-tr-paragraf-ana-dusunce', 9, 1, 0)]),
      s('Sosyal', 14, 3, 3),
      s('Temel Matematik', 27, 6, 7, [t('tyt-mat-olasilik', 1, 1, 0), t('tyt-geo-ucgende-alan', 0, 1, 1), t('tyt-geo-cember-daire', 0, 1, 1)]),
      s('Fen', 12, 4, 4, [t('tyt-fiz-hareket-kuvvet', 1, 1, 0), t('tyt-bio-hucre', 1, 1, 0)]),
    ],
  },
  {
    exam: 'AYT',
    name: 'AYT Deneme 3',
    daysAgo: 9,
    sections: [
      s('Matematik', 19, 7, 14, [t('ayt-mat-turev-uygulamalar', 1, 3, 2), t('ayt-mat-integral-belirli', 1, 2, 3), t('ayt-mat-limit', 2, 1, 2)]),
      s('Fizik', 6, 3, 5, [t('ayt-fiz-newton', 1, 1, 1)]),
      s('Kimya', 6, 2, 5, [t('ayt-kim-gazlar', 1, 1, 2)]),
      s('Biyoloji', 8, 2, 3),
    ],
  },
  {
    exam: 'TYT',
    name: 'Türkiye Geneli 2',
    daysAgo: 4,
    sections: [
      s('Türkçe', 32, 5, 3, [t('tyt-tr-paragraf-ana-dusunce', 9, 1, 0), t('tyt-tr-anlatim-bozukluklari', 1, 1, 0)]),
      s('Sosyal', 15, 3, 2),
      s('Temel Matematik', 28, 6, 6, [t('tyt-mat-olasilik', 1, 1, 1), t('tyt-geo-ucgende-alan', 1, 1, 0), t('tyt-geo-cember-daire', 0, 1, 1)]),
      s('Fen', 12, 5, 3, [t('tyt-fiz-hareket-kuvvet', 1, 1, 1), t('tyt-kim-mol', 1, 0, 1)]),
    ],
  },
];

/** What "Karne fotoğrafı" reads in demo mode, whatever the photo. */
export const SAMPLE_KARNE: { exam: Exam; name: string; sections: ExamSectionInput[] } = {
  exam: 'TYT',
  name: 'Türkiye Geneli 3',
  sections: [
    s('Türkçe', 33, 4, 3, [t('tyt-tr-paragraf-ana-dusunce', 10, 1, 0), t('tyt-tr-cumlede-anlam', 4, 1, 0)]),
    s('Sosyal', 15, 3, 2),
    s('Temel Matematik', 29, 5, 6, [t('tyt-mat-olasilik', 2, 1, 0), t('tyt-geo-ucgende-alan', 1, 1, 1)]),
    s('Fen', 13, 4, 3, [t('tyt-kim-mol', 1, 1, 0)]),
  ],
};

/** Total XP at the start: level 7, 17 XP short of level 8 (two good actions level up). */
export const SEED_XP = 1275;
/** Six days in a row up to yesterday: one pomodoro (or a cleared review queue) today makes seven and earns the badge. */
export const SEED_STREAK = { current: 6, longest: 12, lastDaysAgo: 1 };
export const SEED_BADGES = [{ id: 'first-exam', daysAgo: 84 }];

/**
 * Pomodoros of the past six days: [days ago, subject, minutes]. Today's is a short one,
 * stopped early (under 25 minutes), so it adds focus minutes without counting for the streak.
 */
export const SEED_SESSIONS: [number, string, number][] = [
  [0, 'Temel Matematik', 12],
  [6, 'Temel Matematik', 25], [6, 'Temel Matematik', 25],
  [5, 'Fizik', 25], [5, 'Türkçe', 25], [5, 'Temel Matematik', 25],
  [4, 'Kimya', 25],
  [3, 'Matematik', 25], [3, 'Matematik', 25], [3, 'Biyoloji', 25], [3, 'Türkçe', 25],
  [2, 'Fen', 25], [2, 'Sosyal', 25],
  [1, 'Matematik', 25], [1, 'Fizik', 25], [1, 'Temel Matematik', 25],
];

/** Sample classmates for the leaderboard: weekly XP is set relative to yours so the race stays close. */
export const FRIENDS = [
  { id: 'f-elif', displayName: 'Elif', avatar: 'sky', totalXp: 1880, streak: 12, weekly: (me: number) => Math.round(me * 1.25 + 35) },
  { id: 'f-mert', displayName: 'Mert', avatar: 'olive', totalXp: 960, streak: 3, weekly: (me: number) => Math.round(me * 0.85 + 10) },
  { id: 'f-zeynep', displayName: 'Zeynep', avatar: 'plum', totalXp: 1540, streak: 0, weekly: (me: number) => Math.round(me * 0.55) },
  { id: 'f-can', displayName: 'Can', avatar: 'kraft', totalXp: 410, streak: 1, weekly: (me: number) => Math.round(me * 0.3 + 5) },
] as const;
