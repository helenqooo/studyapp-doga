import { create } from 'zustand';

interface HistoryFilterState {
  subject: string | null;
  topicId: string | null;
  /** Picks a subject and clears the topic. */
  setSubject: (subject: string | null) => void;
  setTopicId: (topicId: string | null) => void;
  /** Picks a topic together with its subject (the topic picker lists every subject). */
  setTopic: (subject: string, topicId: string) => void;
}

/** Shared between the history list and the topic picker modal. */
export const useHistoryFilter = create<HistoryFilterState>((set) => ({
  subject: null,
  topicId: null,
  setSubject: (subject) => set({ subject, topicId: null }),
  setTopicId: (topicId) => set({ topicId }),
  setTopic: (subject, topicId) => set({ subject, topicId }),
}));
