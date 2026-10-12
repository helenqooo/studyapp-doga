import type { Env } from '../env';
import { createClaudeAssistant, createMockAssistant, type Assistant } from './assistant';
import { createClaude } from './client';
import { createClaudeCoach, createMockCoach, type Coach } from './coach';
import { createClaudeKarneParser, createMockKarneParser, type KarneParser } from './karne';
import { createClaudeSolver, createMockSolver, type Solver } from './solver';
import { createClaudeTutor, createMockTutor, type Tutor } from './tutor';

/** Every Claude-backed capability the server uses. */
export interface Ai {
  model: string;
  solver: Solver;
  tutor: Tutor;
  karne: KarneParser;
  coach: Coach;
  assistant: Assistant;
}

export function createAi(env: Env): Ai {
  const claude = createClaude(env);
  return {
    model: claude.model,
    solver: createClaudeSolver(claude),
    tutor: createClaudeTutor(claude),
    karne: createClaudeKarneParser(claude),
    coach: createClaudeCoach(claude),
    assistant: createClaudeAssistant(claude),
  };
}

/** Canned responses for UI testing and tests (MOCK_SOLVER=true). */
export function createMockAi({ delayMs }: { delayMs?: number } = {}): Ai {
  const opts = delayMs === undefined ? {} : { delayMs };
  return {
    model: 'mock',
    solver: createMockSolver(opts),
    tutor: createMockTutor(opts),
    karne: createMockKarneParser(opts),
    coach: createMockCoach(opts),
    assistant: createMockAssistant(opts),
  };
}
