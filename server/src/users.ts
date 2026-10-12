import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { eq, isNull, sql } from 'drizzle-orm';
import type { Db } from './db/client';
import {
  attempts,
  authTokens,
  exams,
  legacyProfile,
  profiles,
  questions,
  reviews,
  sessions,
  users,
  type ProfileSettings,
} from './db/schema';

const scrypt = (password: string, salt: Buffer, keylen: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

export const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
export const PASSWORD_MIN = 8;
export const DISPLAY_NAME_MAX = 30;
export const AVATARS = ['clay', 'kraft', 'olive', 'sky', 'plum', 'sand', 'slate', 'rose'] as const;
export type Avatar = (typeof AVATARS)[number];

export type UserRow = typeof users.$inferSelect;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLocaleLowerCase('en-US');
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, saltB64, keyB64] = stored.split('$');
  if (algo !== 'scrypt' || !n || !r || !p || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** A hash to compare against when the username doesn't exist, so timing doesn't reveal it. */
let dummyHash: Promise<string> | null = null;
export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(12).toString('hex'));
  return dummyHash;
}

export const tokenDigest = (token: string) => createHash('sha256').update(token).digest('hex');

/** Creates a login token; only its digest is stored. */
export function issueToken(db: Db, userId: string, now: number): string {
  const token = randomBytes(32).toString('base64url');
  db.insert(authTokens).values({ tokenHash: tokenDigest(token), userId, createdAt: now, lastUsedAt: now }).run();
  return token;
}

/** Tokens unused for this long stop working. */
export const TOKEN_IDLE_MS = 180 * 24 * 60 * 60 * 1000;

export function userForToken(db: Db, token: string, now: number): UserRow | null {
  const hash = tokenDigest(token);
  const row = db
    .select({ user: users, lastUsedAt: authTokens.lastUsedAt })
    .from(authTokens)
    .innerJoin(users, eq(authTokens.userId, users.id))
    .where(eq(authTokens.tokenHash, hash))
    .get();
  if (!row) return null;
  if (now - row.lastUsedAt > TOKEN_IDLE_MS) {
    db.delete(authTokens).where(eq(authTokens.tokenHash, hash)).run();
    return null;
  }
  // Refresh at most once an hour to keep writes rare.
  if (now - row.lastUsedAt > 60 * 60 * 1000) {
    db.update(authTokens).set({ lastUsedAt: now }).where(eq(authTokens.tokenHash, hash)).run();
  }
  return row.user;
}

export function revokeToken(db: Db, token: string): void {
  db.delete(authTokens).where(eq(authTokens.tokenHash, tokenDigest(token))).run();
}

export function userCount(db: Db): number {
  return db.select({ n: sql<number>`count(*)` }).from(users).get()?.n ?? 0;
}

/**
 * Creates the account and its profile. The very first account also claims the data from
 * the single-user version (rows without an owner and the old profile row).
 */
export function createUser(
  db: Db,
  input: { username: string; displayName: string; passwordHash: string; avatar: Avatar },
  now: number,
): UserRow {
  return db.transaction((tx) => {
    const first = (tx.select({ n: sql<number>`count(*)` }).from(users).get()?.n ?? 0) === 0;
    const user = tx
      .insert(users)
      .values({ id: randomUUID(), createdAt: now, ...input })
      .returning()
      .get();

    const legacy = first ? tx.select().from(legacyProfile).where(eq(legacyProfile.id, 1)).get() : undefined;
    tx.insert(profiles)
      .values({
        userId: user.id,
        ...(legacy
          ? {
              xp: legacy.xp,
              currentStreak: legacy.currentStreak,
              longestStreak: legacy.longestStreak,
              lastStreakDate: legacy.lastStreakDate,
              badges: legacy.badges,
              settings: legacy.settings as ProfileSettings,
            }
          : {}),
      })
      .run();

    if (first) {
      for (const table of [questions, attempts, reviews, exams, sessions]) {
        tx.update(table).set({ userId: user.id }).where(isNull(table.userId)).run();
      }
    }
    return user;
  });
}

export function userDto(u: UserRow) {
  return { id: u.id, username: u.username, displayName: u.displayName, avatar: u.avatar };
}

/** Failed sign-ins per key (ip + username), to slow down password guessing. */
export class LoginLimiter {
  private failures = new Map<string, number[]>();
  constructor(
    private readonly max = 10,
    private readonly windowMs = 15 * 60 * 1000,
  ) {}

  blocked(key: string, now: number): boolean {
    const recent = (this.failures.get(key) ?? []).filter((t) => now - t < this.windowMs);
    this.failures.set(key, recent);
    return recent.length >= this.max;
  }

  fail(key: string, now: number): void {
    const list = this.failures.get(key) ?? [];
    list.push(now);
    this.failures.set(key, list);
  }

  reset(key: string): void {
    this.failures.delete(key);
  }
}
