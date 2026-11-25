import { ApiError, limitRequests, readBody, textField } from '@/lib/api';

export async function authInput(request:Request, signup=false) {
  const body=await readBody(request);
  const email=textField(body,'email',254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError('Зөв имэйл хаяг оруулна уу.');
  if (typeof body.password!=='string' || body.password.length>128 || body.password.length<(signup?8:1)) throw new ApiError(signup?'8–128 тэмдэгттэй нууц үг оруулна уу.':'Нууц үг оруулна уу.');
  const fullName=signup?textField(body,'fullName',80):'';
  if (signup && !fullName) throw new ApiError('Нэр оруулна уу.');
  const ip=request.headers.get('cf-connecting-ip') || 'local';
  await limitRequests(signup?'signup-ip':'login-ip',ip,signup?10:60);
  await limitRequests(signup?'signup-email':'login-email',email,signup?5:10);
  return {email,password:body.password,fullName};
}
