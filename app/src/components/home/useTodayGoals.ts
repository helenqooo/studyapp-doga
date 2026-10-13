import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useProfile, useReviewsToday, useStudyDay } from '../../api/hooks';
import { DAILY_GOALS } from '../../config';

/** One of today's three goals: where it stands against its target. */
export interface GoalState {
  /** Done so far (reviews cleared, focus minutes, questions solved). */
  value: number;
  /** The day's target; 0 for reviews when nothing is due today. */
  goal: number;
  complete: boolean;
}

export interface TodayGoals {
  /** Reviews and today's study totals have arrived. */
  loaded: boolean;
  review: GoalState & { due: number | undefined };
  focus: GoalState;
  solve: GoalState;
  /** Goals not yet complete (shown in the header caption). */
  remaining: number;
  allDone: boolean;
}

/**
 * Today's optik: reviews cleared, focus minutes and questions solved, refetched whenever
 * Home gains focus. No reviews due counts as a quiet, complete goal.
 */
export function useTodayGoals(): TodayGoals {
  const profile = useProfile();
  const reviews = useReviewsToday();
  const study = useStudyDay();
  const { refetch: refetchProfile } = profile;
  const { refetch: refetchReviews } = reviews;
  const { refetch: refetchStudy } = study;

  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      refetchReviews();
      refetchStudy();
    }, [refetchProfile, refetchReviews, refetchStudy]),
  );

  const loaded = !!reviews.data && !!study.data;
  const due = reviews.data?.items.length;
  const cleared = reviews.data?.completedToday ?? 0;
  const reviewGoal = (due ?? 0) + cleared;
  const minutes = study.data ? study.data.focusSec / 60 : 0;
  const solved = study.data?.solved ?? 0;

  const review = { value: cleared, goal: reviewGoal, due, complete: loaded && (due ?? 0) === 0 };
  const focus = { value: minutes, goal: DAILY_GOALS.focusMinutes, complete: loaded && minutes >= DAILY_GOALS.focusMinutes };
  const solve = { value: solved, goal: DAILY_GOALS.solved, complete: loaded && solved >= DAILY_GOALS.solved };
  const done = [review, focus, solve].filter((g) => g.complete).length;
  return { loaded, review, focus, solve, remaining: 3 - done, allDone: loaded && done === 3 };
}
