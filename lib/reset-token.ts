import { createHash, randomBytes } from 'crypto';

export const RESET_LIFETIME_MS=30*60*1000;
export function generateResetToken(){return randomBytes(32).toString('hex');}
export function resetTokenHash(token:string){return createHash('sha256').update(`bantan-password-reset:${token}`).digest('hex');}
export function validResetToken(token:unknown):token is string {return typeof token==='string' && /^[a-f0-9]{64}$/.test(token);}
