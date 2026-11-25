import { NextResponse } from 'next/server';
import { ApiError, apiError, limitRequests, readBody, textField } from '@/lib/api';
import { authSecret, createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';
import { verifyEmail } from '@/lib/email-verification';

export async function POST(request:Request) {
  try {
    const body=await readBody(request);
    const id=textField(body,'challengeId',64);
    const code=textField(body,'code',6);
    if(!/^[\da-f-]{36}$/i.test(id) || !/^\d{6}$/.test(code)) throw new ApiError('6 оронтой код оруулна уу.');
    await limitRequests('verification-attempt',request.headers.get('cf-connecting-ip') || 'local',60);
    authSecret();
    const user=await verifyEmail(id,code);
    const response=NextResponse.json({ok:true,user},{headers:{'Cache-Control':'no-store'}});
    response.cookies.set(SESSION_COOKIE,createSessionToken(user),sessionCookieOptions());
    return response;
  } catch(error) {return apiError(error);}
}
