// Test harness: a real app on a temp database, mock AI, and a controllable clock.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildApp } from './app';
import { createMockAi } from './claude/ai';
import { openDb } from './db/client';
import { loadEnv } from './env';

export const DAY = 24 * 60 * 60 * 1000;
const TOKEN = 'test-token-1234567890';

export async function createTestApp(startIso = '2026-10-12T09:00:00Z') {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'derece-test-'));
  const env = loadEnv({ APP_TOKEN: TOKEN, MOCK_SOLVER: 'true', DATA_DIR: dataDir, APP_TIMEZONE: 'Europe/Istanbul' });
  // Default start is noon in Istanbul, so day arithmetic never straddles midnight.
  const clock = { now: Date.parse(startIso) };
  const app = await buildApp(
    { env, db: openDb(env.dbFile), ai: createMockAi({ delayMs: 0 }), now: () => clock.now },
    { logger: false },
  );
  const auth = { authorization: `Bearer ${TOKEN}` };

  async function call<T = any>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, body?: unknown) {
    const res = await app.inject({ method, url, headers: auth, ...(body !== undefined ? { payload: body as object } : {}) });
    return { status: res.statusCode, json: (res.body ? res.json() : null) as T };
  }

  /** Multipart upload of a tiny PNG (enough for the magic-byte check). */
  async function upload(url: string) {
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
    const boundary = '----derece-test';
    const payload = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="q.png"\r\nContent-Type: image/png\r\n\r\n`),
      png,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const res = await app.inject({
      method: 'POST',
      url,
      headers: { ...auth, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload,
    });
    return { status: res.statusCode, json: res.json() };
  }

  async function solveOne(): Promise<string> {
    const res = await upload('/solve');
    assert.equal(res.status, 201);
    return res.json.id;
  }

  async function close() {
    await app.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }

  return { app, clock, call, upload, solveOne, close };
}
