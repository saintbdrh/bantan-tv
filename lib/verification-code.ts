import { createHmac, randomInt, timingSafeEqual } from 'crypto';

export const CODE_LIFETIME_MS = 10 * 60 * 1000;
export const RESEND_DELAY_MS = 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;

export function generateVerificationCode(): string {
  return String(randomInt(0, 1000000)).padStart(6, '0');
}

export function verificationCodeHash(id: string, code: string, secret: string): string {
  return createHmac('sha256', secret).update(`email-verification:${id}:${code}`).digest('hex');
}

export function matchesVerificationCode(id: string, code: string, hash: string, secret: string): boolean {
  if (!/^\d{6}$/.test(code) || !/^[a-f0-9]{64}$/.test(hash)) return false;
  return timingSafeEqual(Buffer.from(verificationCodeHash(id, code, secret), 'hex'), Buffer.from(hash, 'hex'));
}
