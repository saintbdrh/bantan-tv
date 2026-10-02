import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { promises as fs } from 'fs';
import path from 'path';

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

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');
const SESSION_COOKIE = 'bantan_session';
const AUTH_SECRET = process.env.AUTH_SECRET || 'bantan-dev-secret-change-in-production';

async function ensureUsersFile() {
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });
    await fs.writeFile(USERS_FILE, '[]', 'utf8');
  }
}

export async function readUsers(): Promise<UserRecord[]> {
  await ensureUsersFile();
  const raw = await fs.readFile(USERS_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeUsers(users: UserRecord[]) {
  await ensureUsersFile();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

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

function signPayload(payload: string): string {
  return createHash('sha256').update(`${payload}.${AUTH_SECRET}`).digest('hex');
}

export function createSessionToken(user: SessionUser): string {
  const body = Buffer.from(
    JSON.stringify({ ...user, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })
  ).toString('base64url');
  return `${body}.${signPayload(body)}`;
}

export function parseSessionToken(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  if (signPayload(body) !== sig) return null;
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
  const jar = cookies();
  return parseSessionToken(jar.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions(maxAge = 7 * 24 * 60 * 60) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge
  };
}

export { SESSION_COOKIE };

export async function registerUser(
  fullName: string,
  email: string,
  password: string
): Promise<{ user?: SessionUser; error?: string }> {
  const normalized = email.trim().toLowerCase();
  if (!fullName.trim() || !normalized || password.length < 6) {
    return { error: 'Нэр, имэйл, 6+ тэмдэгттэй нууц үг шаардлагатай.' };
  }
  const users = await readUsers();
  if (users.some((u) => u.email === normalized)) {
    return { error: 'Энэ имэйлээр бүртгэл аль хэдийн бий.' };
  }
  const user: UserRecord = {
    id: randomBytes(12).toString('hex'),
    fullName: fullName.trim(),
    email: normalized,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };
  users.push(user);
  await writeUsers(users);
  return { user: { id: user.id, fullName: user.fullName, email: user.email } };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user?: SessionUser; error?: string }> {
  const normalized = email.trim().toLowerCase();
  const users = await readUsers();
  const found = users.find((u) => u.email === normalized);
  if (!found || !verifyPassword(password, found.passwordHash)) {
    return { error: 'Имэйл эсвэл нууц үг буруу байна.' };
  }
  return { user: { id: found.id, fullName: found.fullName, email: found.email } };
}
