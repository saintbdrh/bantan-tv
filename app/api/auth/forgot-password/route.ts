import { ApiError, apiError, limitRequests, privateJson, readBody, textField } from '@/lib/api';
import { requestPasswordReset, resetSiteOrigin } from '@/lib/password-reset';

export async function POST(request:Request) {
  try {
    const body=await readBody(request);
    const email=textField(body,'email',254).toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new ApiError('Зөв имэйл хаяг оруулна уу.');
    await limitRequests('password-reset-ip',request.headers.get('cf-connecting-ip') || 'local',20);
    await limitRequests('password-reset-email',email,5,3600);
    await requestPasswordReset(email,resetSiteOrigin(request));
    return privateJson({ok:true,message:'Энэ хаягаар бүртгэл байгаа бол нууц үг шинэчлэх холбоос илгээгдэнэ. Inbox болон Spam хавтсаа шалгана уу.'});
  }catch(error){return apiError(error);}
}
