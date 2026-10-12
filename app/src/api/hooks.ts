import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { AttemptInput, ChatThread, ExamInput, ExamResult, Question, QuestionFilter } from './types';

export const queryKeys = {
  profile: ['profile'] as const,
  question: (id: string) => ['question', id] as const,
  /** Prefix for the history list and facets. */
  questions: ['questions'] as const,
  questionList: (filter: QuestionFilter) => ['questions', 'list', filter.subject ?? null, filter.topicId ?? null] as const,
  facets: ['questions', 'facets'] as const,
  reviewsToday: ['reviews', 'today'] as const,
  messages: (id: string) => ['messages', id] as const,
  exams: ['exams'] as const,
  exam: (id: string) => ['exam', id] as const,
  /** Overview and weekly summary both depend on exams and practice. */
  stats: ['stats'] as const,
  overview: ['stats', 'overview'] as const,
  weeklySummary: ['stats', 'weekly-summary'] as const,
};

export function useProfile() {
  return useQuery({ queryKey: queryKeys.profile, queryFn: api.profile });
}

export function useQuestion(id: string) {
  return useQuery({ queryKey: queryKeys.question(id), queryFn: () => api.question(id), enabled: !!id });
}

export function useSolve() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uri, onUploadProgress }: { uri: string; onUploadProgress?: (f: number) => void }) =>
      api.solve(uri, onUploadProgress),
    onSuccess: (question) => {
      queryClient.setQueryData(queryKeys.question(question.id), question);
      queryClient.invalidateQueries({ queryKey: queryKeys.questions });
    },
  });
}

export function useRecordAttempt(questionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AttemptInput) => api.attempt(questionId, input),
    onSuccess: ({ attempt, profile }) => {
      queryClient.setQueryData(queryKeys.profile, profile);
      queryClient.setQueryData<Question>(queryKeys.question(questionId), (q) =>
        q ? { ...q, attempts: [...q.attempts, attempt] } : q,
      );
      // A wrong/blank answer creates a review entry: refetch to pick it up.
      queryClient.invalidateQueries({ queryKey: queryKeys.question(questionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.questions });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviewsToday });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

export function useQuestionList(filter: QuestionFilter) {
  return useInfiniteQuery({
    queryKey: queryKeys.questionList(filter),
    queryFn: ({ pageParam }) => api.questions(filter, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
  });
}

export function useFacets() {
  return useQuery({ queryKey: queryKeys.facets, queryFn: api.facets });
}

export function useReviewsToday() {
  return useQuery({ queryKey: queryKeys.reviewsToday, queryFn: api.reviewsToday });
}

export function useReviewResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, result, viewedSolution }: { questionId: string; result: 'correct' | 'wrong'; viewedSolution: boolean }) =>
      api.reviewResult(questionId, { result, viewedSolution }),
    onSuccess: ({ review, attempt, profile }, { questionId }) => {
      queryClient.setQueryData(queryKeys.profile, profile);
      queryClient.setQueryData<Question>(queryKeys.question(questionId), (q) =>
        q ? { ...q, review, attempts: [...q.attempts, attempt] } : q,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.reviewsToday });
      queryClient.invalidateQueries({ queryKey: queryKeys.questions });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

export function useMessages(questionId: string) {
  return useQuery({ queryKey: queryKeys.messages(questionId), queryFn: () => api.messages(questionId) });
}

export function useSendMessage(questionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => api.sendMessage(questionId, content),
    onSuccess: ({ userMessage, assistantMessage }) => {
      queryClient.setQueryData<ChatThread>(queryKeys.messages(questionId), (t) =>
        t ? { ...t, items: [...t.items, userMessage, assistantMessage] } : t,
      );
      queryClient.setQueryData<Question>(queryKeys.question(questionId), (q) =>
        q ? { ...q, messageCount: q.messageCount + 2 } : q,
      );
    },
  });
}

export function useExams() {
  return useQuery({ queryKey: queryKeys.exams, queryFn: api.exams });
}

export function useExam(id: string) {
  return useQuery({ queryKey: queryKeys.exam(id), queryFn: () => api.exam(id), enabled: !!id });
}

export function useParseKarne() {
  return useMutation({
    mutationFn: ({ uri, onUploadProgress }: { uri: string; onUploadProgress?: (f: number) => void }) =>
      api.parseKarne(uri, onUploadProgress),
  });
}

function useExamWritten() {
  const queryClient = useQueryClient();
  return (exam: ExamResult | null, removedId?: string) => {
    if (exam) queryClient.setQueryData(queryKeys.exam(exam.id), exam);
    if (removedId) queryClient.removeQueries({ queryKey: queryKeys.exam(removedId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.exams });
    queryClient.invalidateQueries({ queryKey: queryKeys.stats });
  };
}

export function useCreateExam() {
  const queryClient = useQueryClient();
  const written = useExamWritten();
  return useMutation({
    mutationFn: (input: ExamInput) => api.createExam(input),
    onSuccess: ({ exam, profile }) => {
      queryClient.setQueryData(queryKeys.profile, profile);
      written(exam);
    },
  });
}

export function useUpdateExam(id: string) {
  const written = useExamWritten();
  return useMutation({ mutationFn: (input: ExamInput) => api.updateExam(id, input), onSuccess: (exam) => written(exam) });
}

export function useDeleteExam() {
  const written = useExamWritten();
  return useMutation({ mutationFn: (id: string) => api.deleteExam(id), onSuccess: (_, id) => written(null, id) });
}

export function useOverview() {
  return useQuery({ queryKey: queryKeys.overview, queryFn: api.overview });
}

/** Cached per week on the server; the first view of a week generates it (can take a while). */
export function useWeeklySummary() {
  return useQuery({ queryKey: queryKeys.weeklySummary, queryFn: () => api.weeklySummary(), staleTime: 10 * 60_000, retry: 0 });
}

export function useRefreshWeeklySummary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.weeklySummary(true),
    onSuccess: (summary) => queryClient.setQueryData(queryKeys.weeklySummary, summary),
  });
}
