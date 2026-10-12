import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { ResultBurst, type BurstKind } from './ResultBurst';

interface Celebration {
  kind: BurstKind;
  xp?: number;
  levelUp?: number | null;
}

const CelebrateContext = createContext<(c: Celebration) => void>(() => {});

/** Hosts the result burst above every screen so any screen can trigger it. */
export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<(Celebration & { key: number }) | null>(null);
  const counter = useRef(0);
  const celebrate = useCallback((c: Celebration) => {
    counter.current += 1;
    setCurrent({ ...c, key: counter.current });
  }, []);
  return (
    <CelebrateContext.Provider value={celebrate}>
      <View style={{ flex: 1 }}>
        {children}
        {current ? (
          <ResultBurst key={current.key} kind={current.kind} xp={current.xp} levelUp={current.levelUp} onDone={() => setCurrent(null)} />
        ) : null}
      </View>
    </CelebrateContext.Provider>
  );
}

/** Returns `celebrate({ kind, xp, levelUp })`. */
export function useCelebrate() {
  return useContext(CelebrateContext);
}
