import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

export type UserRecord = {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type SessionUser = {
  id: string;
  fullName: string;
  email: string;
};

const SESSION_COOKIE = 'bantan_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEV_SECRET = 'bantan-dev-secret-change-in-production';
const MIN_SECRET_LENGTH = 32;
// The old .env.example value must never sign real sessions.
const PLACEHOLDER_PREFIX = 'replace-with';

/**
 * Session cookies are signed with AUTH_SECRET. In production a missing,
 * placeholder or short secret is a configuration error: refuse to issue or
 * accept sessions rather than sign them with a guessable key.
 */
function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV !== 'production') return secret || DEV_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH || secret.startsWith(PLACEHOLDER_PREFIX)) {
    throw new Error(
      `AUTH_SECRET must be set to a random string of at least ${MIN_SECRET_LENGTH} characters ` +
        '(Worker -> Settings -> Variables and Secrets)'
    );
  }
  return secret;
}

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const prev = Buffer.from(hash, 'hex');
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSessionToken(user: SessionUser): string {
  const body = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + SESSION_TTL_MS })).toString(
    'base64url'
  );
  return `${body}.${signPayload(body, authSecret())}`;
}

export function parseSessionToken(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  let expected: string;
  try {
    expected = signPayload(body, authSecret());
  } catch {
    return null;
  }
  const given = Buffer.from(sig);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return null;

  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionUser & {
      exp?: number;
    };
    if (!data.exp || data.exp < Date.now()) return null;
    if (!data.id || !data.email) return null;
    return { id: data.id, fullName: data.fullName, email: data.email };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  return parseSessionToken(jar.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions(maxAge = SESSION_TTL_MS / 1000) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge
  };
}

export { SESSION_COOKIE };

const DUPLICATE_EMAIL = 'Энэ имэйлээр бүртгэл аль хэдийн бий.';

export async function registerUser(
  fullName: string,
  email: string,
  password: string
): Promise<{ user?: SessionUser; error?: string }> {
  const normalized = email.trim().toLowerCase();
  if (!fullName.trim() || !normalized || password.length < 6) {
    return { error: 'Нэр, имэйл, 6+ тэмдэгттэй нууц үг шаардлагатай.' };
  }
  // Fail before creating the account if sessions cannot be signed.
  authSecret();

  const db = await getDb();
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(normalized).first();
  if (existing) {
    return { error: DUPLICATE_EMAIL };
  }

  const user: UserRecord = {
    id: randomBytes(12).toString('hex'),
    fullName: fullName.trim(),
    email: normalized,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };

  try {
    await db
      .prepare(
        'INSERT INTO users (id, full_name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(user.id, user.fullName, user.email, user.passwordHash, user.createdAt)
      .run();
  } catch (err) {
    // Two sign-ups with the same email at the same moment.
    if (String(err).includes('UNIQUE')) return { error: DUPLICATE_EMAIL };
    throw err;
  }

  return { user: { id: user.id, fullName: user.fullName, email: user.email } };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user?: SessionUser; error?: string }> {
  const normalized = email.trim().toLowerCase();
  const db = await getDb();
  const found = await db
    .prepare('SELECT id, full_name, email, password_hash FROM users WHERE email = ?')
    .bind(normalized)
    .first<UserRow>();
  if (!found || !verifyPassword(password, found.password_hash)) {
    return { error: 'Имэйл эсвэл нууц үг буруу байна.' };
  }
  return { user: { id: found.id, fullName: found.full_name, email: found.email } };
}
