import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, loginUser, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = await loginUser(String(body.email ?? ''), String(body.password ?? ''));
  if (result.error || !result.user) {
    return NextResponse.json({ error: result.error ?? 'Алдаа' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, user: result.user });
  res.cookies.set(SESSION_COOKIE, createSessionToken(result.user), sessionCookieOptions());
  return res;
}
