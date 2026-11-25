import { randomUUID } from 'crypto';
import { authSecret, type SessionUser } from '@/lib/auth';
import { ApiError, limitRequests } from '@/lib/api';
import { getDb } from '@/lib/db';
import { emailSettings, sendVerificationEmail } from '@/lib/email';
import { CODE_LIFETIME_MS, MAX_CODE_ATTEMPTS, RESEND_DELAY_MS, generateVerificationCode, matchesVerificationCode, verificationCodeHash } from '@/lib/verification-code';

type Challenge = {
  id: string; email: string; user_id: string; code_hash: string;
  expires_at: number; attempts: number; send_count: number;
  last_sent_at: number; generation: string; delivery_state: string; consumed_at: number | null;
};

async function deliver(challenge: Challenge, code: string) {
  const db = await getDb();
  try {
    await sendVerificationEmail(await emailSettings(), challenge.email, code, challenge.generation);
    await db.prepare("UPDATE email_verifications SET delivery_state='sent' WHERE id=? AND generation=?").bind(challenge.id,challenge.generation).run();
    return true;
  } catch (error) {
    await db.prepare("UPDATE email_verifications SET delivery_state='failed' WHERE id=? AND generation=?").bind(challenge.id,challenge.generation).run();
    if (!(error instanceof ApiError)) throw error;
    return false;
  }
}

function publicChallenge(challenge: Challenge, sent: boolean) {
  return {
    verificationRequired: true,
    challengeId: challenge.id,
    email: challenge.email,
    sent,
    expiresAt: challenge.expires_at,
    retryAfter: Math.max(0,Math.ceil((challenge.last_sent_at+RESEND_DELAY_MS-Date.now())/1000)),
    ...(!sent ? {message:'Код илгээж чадсангүй. Түр хүлээгээд дахин илгээнэ үү.'} : {}),
  };
}

export async function beginVerification(user: SessionUser) {
  await emailSettings(); // Fail clearly before claiming a code when settings are absent.
  const secret=authSecret();
  const db=await getDb();
  const now=Date.now();
  const recent=await db.prepare('SELECT * FROM email_verifications WHERE user_id=? AND consumed_at IS NULL ORDER BY last_sent_at DESC LIMIT 1').bind(user.id).first<Challenge>();
  if (recent && recent.last_sent_at+RESEND_DELAY_MS>now) return publicChallenge(recent,recent.delivery_state==='sent');
  await limitRequests('verification-send',user.id,5,3600);
  const id=randomUUID();
  const code=generateVerificationCode();
  const challenge:Challenge={id,email:user.email,user_id:user.id,code_hash:verificationCodeHash(id,code,secret),expires_at:now+CODE_LIFETIME_MS,attempts:0,send_count:1,last_sent_at:now,generation:randomUUID(),delivery_state:'sending',consumed_at:null};
  // Replaced challenges can no longer be used, even if an old email arrives late.
  await db.batch([
    db.prepare('UPDATE email_verifications SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL').bind(now,user.id),
    db.prepare('INSERT INTO email_verifications (id,email,user_id,code_hash,expires_at,last_sent_at,generation) VALUES (?,?,?,?,?,?,?)').bind(id,user.email,user.id,challenge.code_hash,challenge.expires_at,now,challenge.generation),
    db.prepare('DELETE FROM email_verifications WHERE id IN (SELECT id FROM email_verifications WHERE expires_at < ? LIMIT 100)').bind(now-24*60*60*1000),
  ]);
  return publicChallenge(challenge,await deliver(challenge,code));
}

export async function resendVerification(id:string) {
  const secret=authSecret();
  await emailSettings();
  const db=await getDb();
  const existing=await db.prepare('SELECT * FROM email_verifications WHERE id=? AND consumed_at IS NULL').bind(id).first<Challenge>();
  if (!existing) throw new ApiError('Код хүчингүй болсон. Имэйл, нууц үгээрээ дахин нэвтэрнэ үү.',410);
  if (Date.now()-existing.last_sent_at>24*60*60*1000) throw new ApiError('Хүсэлт дууссан. Дахин нэвтэрнэ үү.',410);
  await limitRequests('verification-send',existing.user_id,5,3600);
  const now=Date.now();
  const code=generateVerificationCode();
  const generation=randomUUID();
  const challenge=await db.prepare(`UPDATE email_verifications SET code_hash=?,expires_at=?,attempts=0,send_count=send_count+1,last_sent_at=?,generation=?,delivery_state='sending' WHERE id=? AND consumed_at IS NULL AND last_sent_at<=? AND send_count<5 RETURNING *`).bind(verificationCodeHash(id,code,secret),now+CODE_LIFETIME_MS,now,generation,id,now-RESEND_DELAY_MS).first<Challenge>();
  if (!challenge) throw new ApiError('60 секунд хүлээгээд дахин оролдоно уу. Дахин илгээх хязгаарт хүрсэн бол дахин нэвтэрнэ үү.',429);
  return publicChallenge(challenge,await deliver(challenge,code));
}

export async function verifyEmail(id:string,code:string):Promise<SessionUser> {
  const db=await getDb();
  const now=Date.now();
  // Attempts are incremented atomically; parallel guesses cannot bypass the cap.
  const challenge=await db.prepare(`UPDATE email_verifications SET attempts=attempts+1 WHERE id=? AND consumed_at IS NULL AND expires_at>? AND attempts<? AND delivery_state='sent' RETURNING *`).bind(id,now,MAX_CODE_ATTEMPTS).first<Challenge>();
  if (!challenge || !matchesVerificationCode(id,code,challenge.code_hash,authSecret())) {
    throw new ApiError('Код буруу, хугацаа дууссан эсвэл оролдлогын хязгаарт хүрсэн байна. Шинэ код авна уу.');
  }
  const claim=randomUUID();
  const results=await db.batch([
    db.prepare("UPDATE email_verifications SET consumed_at=?,claim_token=? WHERE id=? AND code_hash=? AND consumed_at IS NULL AND expires_at>? AND attempts<=? AND delivery_state='sent'").bind(now,claim,id,challenge.code_hash,now,MAX_CODE_ATTEMPTS),
    db.prepare('UPDATE users SET email_verified_at=COALESCE(email_verified_at,?) WHERE id=(SELECT user_id FROM email_verifications WHERE id=? AND claim_token=?)').bind(new Date(now).toISOString(),id,claim),
    db.prepare('SELECT u.id,u.full_name,u.email,u.session_version FROM users u JOIN email_verifications v ON v.user_id=u.id WHERE v.id=? AND v.claim_token=? AND u.email_verified_at IS NOT NULL').bind(id,claim),
  ]);
  const record=results[2].results[0] as {id:string;full_name:string;email:string;session_version:number}|undefined;
  if (!record) throw new ApiError('Код аль хэдийн ашиглагдсан эсвэл шинэчлэгдсэн байна. Дахин нэвтэрнэ үү.',409);
  return {id:record.id,fullName:record.full_name,email:record.email,sessionVersion:record.session_version};
}
