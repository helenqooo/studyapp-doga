import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useCompanionStore } from '../../store/companionStore';
import { InlineBurst, type BurstRect } from './InlineBurst';
import { RewardBurst, type RewardKind } from './RewardBurst';

export type Celebration = RewardKind;
export type { BurstRect } from './InlineBurst';

interface Celebrate {
  /** Full-screen moments (level, badge, streak); they queue and play one at a time. */
  celebrate: (...items: Celebration[]) => void;
  /** A small burst from a spot on screen (a right answer's row or letter), alongside the queue. */
  burst: (at: BurstRect, xp?: number) => void;
}

const CelebrateContext = createContext<Celebrate>({ celebrate: () => {}, burst: () => {} });

/**
 * Hosts celebrations above every screen: local bursts from where the action happened, and
 * full-screen moments that queue, so a new level is followed by a badge and then a longer
 * streak, one at a time. While a full-screen moment plays the companion steps aside
 * (`setCelebrating`) unless it was staged for it, and a new level is announced as `level.up`.
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

  // The companion steps aside while a moment plays. RewardBurst reports when its staging is
  // settled (`onStage`; a badge or a streak settles at once, a level after asking `stage()`),
  // and only then is the companion marked as celebrating: a celebrating, unstaged companion
  // hides and could no longer be staged.
  const currentKey = current?.key ?? null;
  const level = current?.kind === 'level' ? current.level : null;
  useEffect(() => {
    const store = useCompanionStore.getState();
    if (currentKey === null) store.setCelebrating(false);
    if (level !== null) store.emit({ type: 'level.up', level });
  }, [currentKey, level]);
  useEffect(() => () => useCompanionStore.getState().setCelebrating(false), []);
  const onStage = useCallback(() => useCompanionStore.getState().setCelebrating(true), []);

  return (
    <CelebrateContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        {bursts.map((b) => (
          <InlineBurst key={b.key} at={b.at} xp={b.xp} onDone={() => setBursts((all) => all.filter((x) => x.key !== b.key))} />
        ))}
        {current ? <RewardBurst key={current.key} reward={current} onDone={next} onStage={onStage} /> : null}
      </View>
    </CelebrateContext.Provider>
  );
}

/** Returns `{ celebrate(...items), burst(at, xp) }`. */
export function useCelebrate() {
  return useContext(CelebrateContext);
}
