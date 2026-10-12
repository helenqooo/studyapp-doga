import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { ResultBurst, type BurstKind } from './ResultBurst';
import { RewardBurst, type RewardKind } from './RewardBurst';

export type Celebration = { kind: BurstKind; xp?: number; levelUp?: number | null } | RewardKind;

const CelebrateContext = createContext<(...items: Celebration[]) => void>(() => {});

/**
 * Hosts celebrations above every screen. They queue, so an answer's burst is followed by
 * a new badge and then a longer streak, one at a time.
 */
export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<(Celebration & { key: number })[]>([]);
  const counter = useRef(0);
  const celebrate = useCallback((...items: Celebration[]) => {
    setQueue((q) => [...q, ...items.map((c) => ({ ...c, key: ++counter.current }))]);
  }, []);
  const next = useCallback(() => setQueue((q) => q.slice(1)), []);
  const current = queue[0];
  return (
    <CelebrateContext.Provider value={celebrate}>
      <View style={{ flex: 1 }}>
        {children}
        {current ? (
          current.kind === 'badge' || current.kind === 'streak' ? (
            <RewardBurst key={current.key} reward={current} onDone={next} />
          ) : (
            <ResultBurst key={current.key} kind={current.kind} xp={current.xp} levelUp={current.levelUp} onDone={next} />
          )
        ) : null}
      </View>
    </CelebrateContext.Provider>
  );
}

/** Returns `celebrate(...items)`. */
export function useCelebrate() {
  return useContext(CelebrateContext);
}
