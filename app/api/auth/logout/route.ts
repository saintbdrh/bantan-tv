import { NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';
import { sameOrigin } from '@/lib/api';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({error:'Invalid origin'},{status:403});
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(0), maxAge: 0 });
  return res;
}
