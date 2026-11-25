import { ApiError, apiError, limitRequests, privateJson, readBody, textField } from '@/lib/api';
import { resendVerification } from '@/lib/email-verification';
export async function POST(request:Request) {
  try {
    const body=await readBody(request);
    const id=textField(body,'challengeId',64);
    if(!/^[\da-f-]{36}$/i.test(id))throw new ApiError('Хүсэлт буруу.');
    await limitRequests('verification-resend',request.headers.get('cf-connecting-ip') || 'local',20);
    return privateJson(await resendVerification(id));
  }catch(error){return apiError(error);}
}
