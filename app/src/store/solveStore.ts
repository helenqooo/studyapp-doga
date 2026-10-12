import { create } from 'zustand';
import type { LocalImage } from '../lib/image';

interface SolveState {
  /** Photo waiting on the crop screen. */
  pending: LocalImage | null;
  /** Cropped local copy per solved question, so the solution screen shows it instantly. */
  localImages: Record<string, LocalImage>;
  setPending: (image: LocalImage | null) => void;
  rememberImage: (questionId: string, image: LocalImage) => void;
}

export const useSolveStore = create<SolveState>((set) => ({
  pending: null,
  localImages: {},
  setPending: (pending) => set({ pending }),
  rememberImage: (questionId, image) =>
    set((s) => ({ localImages: { ...s.localImages, [questionId]: image } })),
}));
