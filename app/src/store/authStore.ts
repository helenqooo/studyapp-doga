import { create } from 'zustand';
import type { AuthResponse, User } from '../api/types';
import { DEMO_MODE } from '../config';
import { secureStorage } from '../lib/secureStorage';
import { addToOutbox } from './sessionOutbox';
import { useTimerStore } from './timerStore';

const TOKEN_KEY = 'derece.token';
const USER_KEY = 'derece.user';

/** The account used in demo mode (no server, no sign-in). */
export const DEMO_USER: User = { id: 'demo-me', username: 'sen', displayName: 'Sen', avatar: 'clay' };

interface AuthState {
  status: 'loading' | 'signedOut' | 'signedIn';
  token: string | null;
  user: User | null;
  /** Reads the saved login once at start-up. */
  hydrate: () => Promise<void>;
  signIn: (res: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: DEMO_MODE ? 'signedIn' : 'loading',
  token: null,
  user: DEMO_MODE ? DEMO_USER : null,

  hydrate: async () => {
    if (DEMO_MODE || get().status !== 'loading') return;
    try {
      const [token, userJson] = await Promise.all([secureStorage.get(TOKEN_KEY), secureStorage.get(USER_KEY)]);
      const user = userJson ? (JSON.parse(userJson) as User) : null;
      set(token && user ? { status: 'signedIn', token, user } : { status: 'signedOut', token: null, user: null });
    } catch {
      set({ status: 'signedOut', token: null, user: null });
    }
  },

  signIn: async ({ token, user }) => {
    set({ status: 'signedIn', token, user });
    await Promise.all([secureStorage.set(TOKEN_KEY, token), secureStorage.set(USER_KEY, JSON.stringify(user))]);
  },

  signOut: async () => {
    if (DEMO_MODE) return;
    // A running pomodoro belongs to this account: stop it (and its notification) and keep
    // it for this account's next sign-in instead of handing it to whoever signs in next.
    const userId = get().user?.id;
    const timer = useTimerStore.getState();
    await timer.hydrate();
    const running = await timer.finish(false).catch(() => null);
    if (running && userId) await addToOutbox(userId, running);
    set({ status: 'signedOut', token: null, user: null });
    await Promise.all([secureStorage.remove(TOKEN_KEY), secureStorage.remove(USER_KEY)]);
  },

  setUser: (user) => {
    set({ user });
    secureStorage.set(USER_KEY, JSON.stringify(user)).catch(() => {});
  },
}));
