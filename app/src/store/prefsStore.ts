import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

/** How often Lumi speaks up on its own: Sık / Ara sıra / Sessiz. */
export type TalkLevel = 'often' | 'sometimes' | 'quiet';

/** What Lumi wears (the wardrobe). */
export interface Outfit {
  head: 'party' | 'crown' | 'headphones' | null;
  face: 'glasses' | null;
}

export interface Prefs {
  /** Vibration on taps, selections and verdicts (every call in lib/haptics checks it). */
  haptics: boolean;
  talk: TalkLevel;
  outfit: Outfit;
}

export const DEFAULT_PREFS: Prefs = {
  haptics: true,
  talk: 'sometimes',
  outfit: { head: null, face: null },
};

interface PrefsState extends Prefs {
  /** The account these preferences belong to (null when signed out). */
  userId: string | null;
  /** The account's saved preferences have been read. */
  hydrated: boolean;
  setHaptics: (on: boolean) => void;
  setTalk: (talk: TalkLevel) => void;
  setOutfit: (outfit: Partial<Outfit>) => void;
  /**
   * Switches to an account's preferences: resets to the defaults, then reads the saved
   * ones. Called by the root layout whenever the signed-in user changes.
   */
  loadFor: (userId: string | null) => Promise<void>;
}

const key = (userId: string) => `derece.prefs.${userId}`;

function pick(state: Prefs): Prefs {
  return { haptics: state.haptics, talk: state.talk, outfit: state.outfit };
}

/** Reads saved preferences, keeping only well-formed values. */
function parse(raw: string | null): Partial<Prefs> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as Partial<Prefs>;
    const out: Partial<Prefs> = {};
    if (typeof v.haptics === 'boolean') out.haptics = v.haptics;
    if (v.talk === 'often' || v.talk === 'sometimes' || v.talk === 'quiet') out.talk = v.talk;
    if (v.outfit && typeof v.outfit === 'object') {
      const head = v.outfit.head;
      const face = v.outfit.face;
      out.outfit = {
        head: head === 'party' || head === 'crown' || head === 'headphones' ? head : null,
        face: face === 'glasses' ? face : null,
      };
    }
    return out;
  } catch {
    return {};
  }
}

/** Per-account app preferences, saved on the device at `derece.prefs.<userId>`. */
export const usePrefsStore = create<PrefsState>((set, get) => {
  const save = () => {
    const { userId } = get();
    if (!userId) return;
    AsyncStorage.setItem(key(userId), JSON.stringify(pick(get()))).catch(() => {});
  };
  return {
    ...DEFAULT_PREFS,
    userId: null,
    hydrated: false,

    setHaptics: (haptics) => {
      set({ haptics });
      save();
    },
    setTalk: (talk) => {
      set({ talk });
      save();
    },
    setOutfit: (outfit) => {
      set({ outfit: { ...get().outfit, ...outfit } });
      save();
    },

    loadFor: async (userId) => {
      if (userId === get().userId && get().hydrated) return;
      set({ ...DEFAULT_PREFS, userId, hydrated: !userId });
      if (!userId) return;
      const raw = await AsyncStorage.getItem(key(userId)).catch(() => null);
      // Another account may have signed in while this one was reading.
      if (get().userId !== userId) return;
      set({ ...parse(raw), hydrated: true });
    },
  };
});
