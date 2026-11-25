'use client';
import { type FormEvent, useEffect, useState } from 'react';

export type VerificationChallenge = {
  verificationRequired: true;
  challengeId: string;
  email: string;
  sent: boolean;
  expiresAt: number;
  retryAfter: number;
  message?: string;
};

export function EmailVerificationForm({initial,nextPath,onBack}:{initial:VerificationChallenge;nextPath:string;onBack:()=>void}) {
  const [challenge,setChallenge]=useState(initial);
  const [code,setCode]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState(initial.message || '');
  const [busy,setBusy]=useState(false);
  const [now,setNow]=useState(()=>Date.now());
  const [resendAt,setResendAt]=useState(()=>Date.now()+initial.retryAfter*1000);
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer);},[]);
  const retrySeconds=Math.max(0,Math.ceil((resendAt-now)/1000));
  const expired=now>=challenge.expiresAt;

  async function verify(event:FormEvent) {
    event.preventDefault();
    if(!/^\d{6}$/.test(code)){setError('6 оронтой код оруулна уу.');return;}
    setBusy(true);setError('');setNotice('');
    try {
      const response=await fetch('/api/auth/verify-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challengeId:challenge.challengeId,code})});
      const data=await response.json() as {error?:string};
      if(!response.ok)throw new Error(data.error);
      window.location.href=nextPath;
    }catch(error){setError(error instanceof Error?error.message:'Алдаа гарлаа.');setBusy(false);}
  }

  async function resend() {
    setBusy(true);setError('');setNotice('');
    try {
      const response=await fetch('/api/auth/resend-verification',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challengeId:challenge.challengeId})});
      const data=await response.json() as VerificationChallenge & {error?:string};
      if(!response.ok)throw new Error(data.error);
      setChallenge(data);setCode('');setNow(Date.now());setResendAt(Date.now()+data.retryAfter*1000);
      setNotice(data.sent?'Шинэ код илгээлээ. Өмнөх код хүчингүй болсон.':data.message || 'Код илгээж чадсангүй.');
    }catch(error){setError(error instanceof Error?error.message:'Код илгээж чадсангүй.');}
    finally{setBusy(false);}
  }

  return <div className="auth-card verification-card">
    <span className="verification-mail" aria-hidden="true">✉</span>
    <p className="eyebrow">EMAIL VERIFICATION</p>
    <h1>Имэйлээ баталгаажуулъя.</h1>
    <p className="auth-sub">{challenge.sent?'6 оронтой кодыг дараах хаяг руу илгээлээ:':'Кодыг дараах хаяг руу илгээх шаардлагатай:'}<br/><strong className="verification-address">{challenge.email}</strong></p>
    <form onSubmit={verify}>
      <div className="auth-field"><label htmlFor="email-code">Баталгаажуулах код</label><input id="email-code" className="verification-code" type="text" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" maxLength={6} value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,''))} placeholder="000000" aria-describedby="code-help" aria-invalid={!!error} autoFocus disabled={busy}/></div>
      <p id="code-help" className="community-muted">{expired?'Кодын хугацаа дууссан. Шинэ код авна уу.':'Код 10 минут хүчинтэй. Inbox болон Spam хавтсаа шалгаарай.'}</p>
      <button className="live-button verification-submit" disabled={busy || code.length!==6 || expired || !challenge.sent}>{busy?'Хүлээнэ үү…':'Баталгаажуулах'}</button>
    </form>
    {error&&<p className="auth-message" role="alert">{error}</p>}
    {notice&&<p className="community-status" role="status">{notice}</p>}
    <div className="verification-footer"><button type="button" className="verification-link" disabled={busy || retrySeconds>0} onClick={()=>void resend()}>{retrySeconds>0?`Дахин илгээх (${retrySeconds}с)`:'Код дахин илгээх'}</button><button type="button" className="verification-link" disabled={busy} onClick={onBack}>Буцах / имэйлээ засах</button></div>
  </div>;
}
