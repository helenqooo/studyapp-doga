export const XP = {
  solveQuestion: 10,
  reviewCorrect: 15,
  pomodoroComplete: 20,
  examEntry: 50,
} as const;

const BASE_LEVEL_XP = 100;
const LEVEL_GROWTH = 1.2;

/** XP needed to go from `level` to `level + 1` (each level ~20% more than the previous). */
export function xpForLevel(level: number): number {
  return Math.round(BASE_LEVEL_XP * LEVEL_GROWTH ** (level - 1));
}

export interface LevelInfo {
  level: number;
  /** XP earned inside the current level. */
  levelXp: number;
  /** XP required to finish the current level. */
  levelXpRequired: number;
}

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  return { level, levelXp: remaining, levelXpRequired: xpForLevel(level) };
}
