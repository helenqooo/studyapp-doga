import { buildApp } from './app';
import { createAi, createMockAi } from './claude/ai';
import { openDb } from './db/client';
import { loadEnv } from './env';

const env = loadEnv();
const db = openDb(env.dbFile);
const ai = env.MOCK_SOLVER ? createMockAi() : createAi(env);

const app = await buildApp({ env, db, ai });
app.log.info({ model: ai.model, dataDir: env.dataDir }, 'starting Derece server');
await app.listen({ host: env.HOST, port: env.PORT });
