import { NextResponse } from 'next/server';
import { ApiError, apiError, limitRequests, readBody, textField } from '@/lib/api';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';
import { resetPassword } from '@/lib/password-reset';
export async function POST(request:Request) {
  try {
    const body=await readBody(request);
    const token=textField(body,'token',64);
    if(typeof body.password!=='string' || body.password.length<8 || body.password.length>128)throw new ApiError('8–128 тэмдэгттэй нууц үг оруулна уу.');
    await limitRequests('password-reset-attempt',request.headers.get('cf-connecting-ip') || 'local',30);
    await resetPassword(token,body.password);
    const response=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
    response.cookies.set(SESSION_COOKIE,'',sessionCookieOptions(0));
    return response;
  }catch(error){return apiError(error);}
}
