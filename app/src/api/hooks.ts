import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { AttemptInput, Question } from './types';

export const queryKeys = {
  profile: ['profile'] as const,
  question: (id: string) => ['question', id] as const,
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
    },
  });
}
