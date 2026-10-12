import { buildApp } from './app';
import { createClaudeSolver, createMockSolver } from './claude/solver';
import { openDb } from './db/client';
import { loadEnv } from './env';

const env = loadEnv();
const db = openDb(env.dbFile);
const solver = env.MOCK_SOLVER ? createMockSolver() : createClaudeSolver(env);

const app = await buildApp({ env, db, solver });
app.log.info({ model: solver.model, dataDir: env.dataDir }, 'starting Derece server');
await app.listen({ host: env.HOST, port: env.PORT });
