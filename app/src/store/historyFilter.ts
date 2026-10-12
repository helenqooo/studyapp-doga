import { create } from 'zustand';

interface HistoryFilterState {
  subject: string | null;
  topicId: string | null;
  setSubject: (subject: string | null) => void;
  setTopicId: (topicId: string | null) => void;
}

/** Shared between the history list and the topic picker modal. */
export const useHistoryFilter = create<HistoryFilterState>((set) => ({
  subject: null,
  topicId: null,
  setSubject: (subject) => set({ subject, topicId: null }),
  setTopicId: (topicId) => set({ topicId }),
}));
