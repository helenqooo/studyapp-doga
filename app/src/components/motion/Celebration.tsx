import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { InlineBurst, type BurstRect } from './InlineBurst';
import { RewardBurst, type RewardKind } from './RewardBurst';

export type Celebration = RewardKind;
export type { BurstRect } from './InlineBurst';

interface Celebrate {
  /** Full-screen moments (level, badge, streak); they queue and play one at a time. */
  celebrate: (...items: Celebration[]) => void;
  /** A small burst from a spot on screen (a right answer's row), alongside the queue. */
  burst: (at: BurstRect, xp?: number) => void;
}

const CelebrateContext = createContext<Celebrate>({ celebrate: () => {}, burst: () => {} });

/**
 * Hosts celebrations above every screen: local bursts from where the action happened, and
 * full-screen moments that queue, so a new level is followed by a badge and then a longer
 * streak, one at a time.
 */
export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<(Celebration & { key: number })[]>([]);
  const [bursts, setBursts] = useState<{ key: number; at: BurstRect; xp?: number }[]>([]);
  const counter = useRef(0);
  const celebrate = useCallback((...items: Celebration[]) => {
    setQueue((q) => [...q, ...items.map((c) => ({ ...c, key: ++counter.current }))]);
  }, []);
  const burst = useCallback((at: BurstRect, xp?: number) => {
    setBursts((b) => [...b, { key: ++counter.current, at, xp }]);
  }, []);
  const next = useCallback(() => setQueue((q) => q.slice(1)), []);
  const value = useRef<Celebrate>({ celebrate, burst }).current;
  const current = queue[0];
  return (
    <CelebrateContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        {bursts.map((b) => (
          <InlineBurst key={b.key} at={b.at} xp={b.xp} onDone={() => setBursts((all) => all.filter((x) => x.key !== b.key))} />
        ))}
        {current ? <RewardBurst key={current.key} reward={current} onDone={next} /> : null}
      </View>
    </CelebrateContext.Provider>
  );
}

/** Returns `{ celebrate(...items), burst(at, xp) }`. */
export function useCelebrate() {
  return useContext(CelebrateContext);
}
