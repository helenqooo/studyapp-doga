import { buildApp } from './app';
import { createClaude } from './claude/client';
import { createClaudeSolver, createMockSolver } from './claude/solver';
import { createClaudeTutor, createMockTutor } from './claude/tutor';
import { openDb } from './db/client';
import { loadEnv } from './env';

const env = loadEnv();
const db = openDb(env.dbFile);
const claude = env.MOCK_SOLVER ? null : createClaude(env);
const solver = claude ? createClaudeSolver(claude) : createMockSolver();
const tutor = claude ? createClaudeTutor(claude) : createMockTutor();

const app = await buildApp({ env, db, solver, tutor });
app.log.info({ model: solver.model, dataDir: env.dataDir }, 'starting Derece server');
await app.listen({ host: env.HOST, port: env.PORT });
