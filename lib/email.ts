import { getCloudflareContext } from '@opennextjs/cloudflare';
import { ApiError } from '@/lib/api';

type EmailSettings = { apiKey: string; from: string; endpoint: string };

export async function emailSettings(): Promise<EmailSettings> {
  let bindings: Record<string, unknown> = {};
  try { bindings = (await getCloudflareContext({ async: true })).env as unknown as Record<string, unknown>; } catch { /* Next builds have no bindings. */ }
  const apiKey = process.env.RESEND_API_KEY || String(bindings.RESEND_API_KEY || '');
  const from = process.env.EMAIL_FROM || String(bindings.EMAIL_FROM || '');
  if (!apiKey || !from || /[\r\n]/.test(from)) {
    throw new ApiError('Имэйл баталгаажуулах үйлчилгээ хараахан тохируулагдаагүй байна. Түр хүлээгээд дахин оролдоно уу.', 503);
  }
  let endpoint = 'https://api.resend.com/emails';
  // Local integration tests use an in-memory mail server. Never redirect mail
  // or send real credentials to a test endpoint in a production build.
  if (process.env.NODE_ENV === 'development' && process.env.RESEND_TEST_URL) {
    const testUrl = new URL(process.env.RESEND_TEST_URL);
    if (testUrl.protocol !== 'http:' || testUrl.hostname !== '127.0.0.1' || apiKey !== 'local-test-key') throw new Error('Invalid local mail test settings');
    endpoint = testUrl.href;
  }
  return { apiKey, from, endpoint };
}

export async function sendVerificationEmail(settings: EmailSettings, email: string, code: string, generation: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(settings.endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `bantan-verification/${generation}` },
      body: JSON.stringify({
        from: settings.from,
        to: [email],
        subject: `${code} — Bantan TV баталгаажуулах код`,
        text: `Bantan TV\n\nТаны имэйл баталгаажуулах код: ${code}\n\nКод 10 минутын хугацаанд хүчинтэй. Кодоо бусдад бүү дамжуулаарай.\nХэрэв та хүсэлт гаргаагүй бол энэ имэйлийг үл тооно уу.`,
        html: `<div style="background:#090909;color:#fff;font-family:Arial,sans-serif;padding:40px;border-radius:16px;max-width:500px"><p style="color:#ff603c;font-weight:bold;letter-spacing:3px">BANTAN TV</p><h1 style="font-size:26px">Имэйлээ баталгаажуулаарай</h1><p style="color:#ccc">Бүртгэлээ үргэлжлүүлэхийн тулд доорх кодыг оруулна уу.</p><p style="font-size:38px;letter-spacing:10px;font-weight:bold;color:#ffd400">${code}</p><p style="color:#ccc;line-height:1.6">Код 10 минутын хугацаанд хүчинтэй. Кодоо бусдад бүү дамжуулаарай.</p><p style="color:#999;font-size:12px">Хэрэв та хүсэлт гаргаагүй бол энэ имэйлийг үл тооно уу.</p></div>`,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError('Имэйл илгээж чадсангүй. Түр хүлээгээд код дахин илгээнэ үү.', 502);
  }
  if (!response.ok) {
    // Do not log provider response bodies: they can contain recipient details.
    console.error('Resend delivery failed with HTTP status', response.status);
    throw new ApiError('Имэйл илгээж чадсангүй. Түр хүлээгээд код дахин илгээнэ үү.', 502);
  }
}

export async function sendPasswordResetEmail(settings:EmailSettings,email:string,url:string,generation:string) {
  const response=await fetch(settings.endpoint,{
    method:'POST',
    headers:{Authorization:`Bearer ${settings.apiKey}`,'Content-Type':'application/json','Idempotency-Key':`bantan-password-reset/${generation}`},
    body:JSON.stringify({
      from:settings.from,to:[email],subject:'Bantan TV — Нууц үг шинэчлэх',
      text:`Bantan TV\n\nНууц үгээ шинэчлэхийн тулд дараах холбоосоор орно уу:\n${url}\n\nХолбоос 30 минут хүчинтэй бөгөөд нэг удаа ашиглагдана.\nХэрэв та хүсэлт гаргаагүй бол энэ имэйлийг үл тооно уу. Таны нууц үг өөрчлөгдөөгүй.`,
      html:`<div style="background:#090909;color:white;font-family:Arial,sans-serif;padding:40px;border-radius:16px;max-width:500px"><p style="color:#ff603c;font-weight:bold;letter-spacing:3px">BANTAN TV</p><h1 style="font-size:26px">Нууц үгээ шинэчлэх</h1><p style="color:#ccc;line-height:1.7">Доорх товчоор орж шинэ нууц үгээ үүсгээрэй. Холбоос 30 минут хүчинтэй бөгөөд нэг удаа ашиглагдана.</p><a href="${url}" style="display:inline-block;background:#ff4200;color:white;padding:16px 24px;border-radius:10px;text-decoration:none;margin:20px 0">Нууц үг шинэчлэх</a><p style="color:#999;font-size:12px;line-height:1.7">Хэрэв та хүсэлт гаргаагүй бол энэ имэйлийг үл тооно уу. Таны нууц үг өөрчлөгдөөгүй.</p></div>`,
    }),
    signal:AbortSignal.timeout(15000),
  }).catch(()=>{throw new ApiError('Имэйл илгээх үйлчилгээ түр боломжгүй байна.',502);});
  if(!response.ok){console.error('Resend password reset failed with HTTP status',response.status);throw new ApiError('Имэйл илгээх үйлчилгээ түр боломжгүй байна.',502);}
}
