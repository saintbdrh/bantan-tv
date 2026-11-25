import { randomUUID } from 'crypto';
import { ApiError } from '@/lib/api';
import { hashPassword } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { emailSettings, sendPasswordResetEmail } from '@/lib/email';
import { RESET_LIFETIME_MS, generateResetToken, resetTokenHash, validResetToken } from '@/lib/reset-token';

export async function requestPasswordReset(email:string,siteOrigin:string) {
  const settings=await emailSettings();
  const db=await getDb();
  const user=await db.prepare('SELECT id FROM users WHERE email=?').bind(email).first<{id:string}>();
  if(!user)return;
  const now=Date.now();
  const recent=await db.prepare('SELECT created_at FROM password_resets WHERE user_id=? ORDER BY created_at DESC LIMIT 1').bind(user.id).first<{created_at:number}>();
  if(recent && now-recent.created_at<60000)return;
  const token=generateResetToken();
  const hash=resetTokenHash(token);
  await db.batch([
    db.prepare('UPDATE password_resets SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL').bind(now,user.id),
    db.prepare('INSERT INTO password_resets (token_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)').bind(hash,user.id,now,now+RESET_LIFETIME_MS),
    db.prepare('DELETE FROM password_resets WHERE token_hash IN (SELECT token_hash FROM password_resets WHERE expires_at<? LIMIT 100)').bind(now-24*60*60*1000),
  ]);
  try {
    // Fragments are not sent in HTTP requests or referrers, keeping reset
    // tokens out of access logs and initial server-rendered HTML.
    await sendPasswordResetEmail(settings,email,`${siteOrigin}/reset-password#token=${token}`,randomUUID());
    await db.prepare('UPDATE password_resets SET delivered=1 WHERE token_hash=? AND consumed_at IS NULL').bind(hash).run();
  } catch(error) {
    await db.prepare('UPDATE password_resets SET consumed_at=? WHERE token_hash=?').bind(Date.now(),hash).run();
    // Keep the public response identical for unknown users and mail failures.
    if(!(error instanceof ApiError))throw error;
    console.error('Password reset delivery unavailable');
  }
}

export async function resetPassword(token:string,password:string) {
  if(!validResetToken(token) || password.length<8 || password.length>128)throw new ApiError('Холбоос эсвэл нууц үг буруу байна.');
  const db=await getDb();
  const hash=resetTokenHash(token);
  const now=Date.now();
  const claim=randomUUID();
  const passwordHash=hashPassword(password);
  const results=await db.batch([
    db.prepare('UPDATE password_resets SET consumed_at=?,claim_token=? WHERE token_hash=? AND consumed_at IS NULL AND expires_at>? AND delivered=1').bind(now,claim,hash,now),
    db.prepare('UPDATE users SET password_hash=?,session_version=session_version+1,email_verified_at=COALESCE(email_verified_at,?) WHERE id=(SELECT user_id FROM password_resets WHERE token_hash=? AND claim_token=?)').bind(passwordHash,new Date(now).toISOString(),hash,claim),
    db.prepare('UPDATE email_verifications SET consumed_at=? WHERE consumed_at IS NULL AND user_id=(SELECT user_id FROM password_resets WHERE token_hash=? AND claim_token=?)').bind(now,hash,claim),
    db.prepare('UPDATE password_resets SET consumed_at=? WHERE consumed_at IS NULL AND user_id=(SELECT user_id FROM password_resets WHERE token_hash=? AND claim_token=?)').bind(now,hash,claim),
  ]);
  if(results[1].meta.changes!==1)throw new ApiError('Холбоос буруу, ашиглагдсан эсвэл хугацаа нь дууссан байна. Шинэ холбоос авна уу.',400);
}

export function resetSiteOrigin(request:Request) {
  const target=new URL(request.url);
  const host=request.headers.get('host') || target.host;
  if(process.env.NODE_ENV==='development' && /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))return `http://${host}`;
  // Never build production password reset links from an untrusted Host header.
  return 'https://www.bantan.tv';
}
