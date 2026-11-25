import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, loginUser, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';
import { authInput } from '@/lib/auth-input';
import { apiError } from '@/lib/api';

export async function POST(req: NextRequest) {
  try {
  const body = await authInput(req);
  const result = await loginUser(String(body.email ?? ''), String(body.password ?? ''));
  if (result.error || !result.user) {
    return NextResponse.json({ error: result.error ?? 'Алдаа' }, { status: 401 });
  }

  if (result.needsVerification) return NextResponse.json({error:'Бүртгэлээ эхлээд баталгаажуулна уу. Бүртгүүлэх хэсэгт имэйл, нууц үгээ оруулаад үргэлжлүүлнэ үү.'},{status:403});

  const res = NextResponse.json({ ok: true, user: result.user });
  res.cookies.set(SESSION_COOKIE, createSessionToken(result.user), sessionCookieOptions());
  return res;
  } catch(error) { return apiError(error); }
}
