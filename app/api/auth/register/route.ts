import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth';
import { authInput } from '@/lib/auth-input';
import { apiError } from '@/lib/api';
import { beginVerification } from '@/lib/email-verification';
import { emailSettings } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
  const body = await authInput(req, true);
  await emailSettings();
  const result = await registerUser(
    String(body.fullName ?? ''),
    String(body.email ?? ''),
    String(body.password ?? '')
  );
  if (result.error || !result.user) {
    return NextResponse.json({ error: result.error ?? 'Алдаа' }, { status: 400 });
  }

  return NextResponse.json(await beginVerification(result.user), {status:202,headers:{'Cache-Control':'no-store'}});
  } catch(error) { return apiError(error); }
}
