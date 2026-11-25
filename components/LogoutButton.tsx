'use client';
import { useState } from 'react';
export function LogoutButton() {
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  return <><button className="ghost-button" disabled={busy} onClick={async()=>{setBusy(true);setError('');try {const response=await fetch('/api/auth/logout',{method:'POST'});if(!response.ok)throw new Error();window.location.href='/';}catch{setError('Гарч чадсангүй. Дахин оролдоно уу.');setBusy(false);}}}>{busy?'Хүлээнэ үү…':'Гарах'}</button>{error&&<p role="alert">{error}</p>}</>;
}
