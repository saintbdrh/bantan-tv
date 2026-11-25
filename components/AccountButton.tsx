'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
export function AccountButton() {
  const [name,setName]=useState<string|null>(null);
  useEffect(()=>{let current=true;fetch('/api/auth/session',{cache:'no-store'}).then(r=>r.json() as Promise<{user?:{fullName:string}}>).then(data=>{if(current)setName(data.user?.fullName ?? null);}).catch(()=>{});return()=>{current=false;};},[]);
  return <Link href={name?'/account':'/login'} className="ghost-button account-nav" title={name ?? undefined}>{name?name.split(' ')[0]:'НЭВТРЭХ'}</Link>;
}
