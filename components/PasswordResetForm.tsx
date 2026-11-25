'use client';
import { type FormEvent, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { SiteShell } from '@/components/SiteShell';

function subscribeToHash(callback:()=>void){window.addEventListener('hashchange',callback);return()=>window.removeEventListener('hashchange',callback);}
const getHash=()=>window.location.hash;
const serverHash=()=>'';

export function PasswordResetForm({mode}:{mode:'request'|'reset'}) {
  const hash=useSyncExternalStore(subscribeToHash,getHash,serverHash);
  const token=new URLSearchParams(hash.slice(1)).get('token') || '';
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [busy,setBusy]=useState(false);
  const [done,setDone]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const request=mode==='request';

  async function submit(event:FormEvent) {
    event.preventDefault();setError('');
    if(!request && (password.length<8 || password.length>128 || password!==confirm)) {setError('Нууц үг 8–128 тэмдэгттэй, давтан оруулсан утгатай ижил байх ёстой.');return;}
    setBusy(true);
    try {
      const response=await fetch(request?'/api/auth/forgot-password':'/api/auth/reset-password',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request?{email:email.trim().toLowerCase()}:{token,password}),
      });
      const data=await response.json() as {error?:string;message?:string};
      if(!response.ok)throw new Error(data.error);
      setDone(true);setPassword('');setConfirm('');
      setMessage(data.message || 'Нууц үг шинэчлэгдлээ. Шинэ нууц үгээрээ нэвтэрнэ үү.');
      if(!request)window.history.replaceState(null,'',window.location.pathname);
    }catch(error){setError(error instanceof Error?error.message:'Алдаа гарлаа. Дахин оролдоно уу.');}
    finally{setBusy(false);}
  }
  return <SiteShell><div className="container"><div className="auth-card verification-card">
    <p className="eyebrow">BANTAN ACCOUNT</p><h1>{request?'Нууц үгээ мартсан уу?':'Шинэ нууц үг'}</h1>
    {done?<><p className="community-status" role="status">{message}</p><Link className="live-button verification-submit" href="/login">Нэвтрэх</Link>{request&&<p className="community-muted">Холбоос 30 минут хүчинтэй. Код оруулах шаардлагагүй.</p>}</>:<>
      <p className="auth-sub">{request?'Бүртгэлтэй имэйл хаягаа оруулна уу. Нууц үг шинэчлэх холбоос илгээнэ.':'Найдвартай шинэ нууц үг сонгоорой.'}</p>
      {!request && !/^[a-f0-9]{64}$/.test(token)?<p className="auth-message" role="alert">Имэйлд ирсэн бүтэн холбоосыг нээнэ үү. <Link href="/forgot-password">Шинэ холбоос авах</Link></p>:<form onSubmit={submit}>
        {request?<div className="auth-field"><label htmlFor="reset-email">Имэйл</label><input id="reset-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)}/></div>:<>
          <div className="auth-field"><label htmlFor="new-password">Шинэ нууц үг</label><input id="new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={event=>setPassword(event.target.value)}/></div>
          <div className="auth-field"><label htmlFor="confirm-password">Нууц үг давтах</label><input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirm} onChange={event=>setConfirm(event.target.value)}/></div><p className="community-muted">Шинэчилсний дараа бусад төхөөрөмж дээрх нэвтрэлтүүд дуусна.</p>
        </>}
        <button className="live-button verification-submit" disabled={busy}>{busy?'Хүлээнэ үү…':request?'Холбоос илгээх':'Нууц үг шинэчлэх'}</button>
      </form>}
      {error&&<p className="auth-message" role="alert">{error}</p>}
      <p className="auth-switch"><Link href="/login">← Нэвтрэх хэсэг рүү буцах</Link></p>
    </>}
  </div></div></SiteShell>;
}
