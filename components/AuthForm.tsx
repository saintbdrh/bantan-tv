'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { SiteShell } from '@/components/SiteShell';
import { HomeBack } from '@/components/HomeBack';
import { EmailVerificationForm, type VerificationChallenge } from '@/components/EmailVerificationForm';

type AuthFormProps = {
  mode: 'login' | 'signup';
  next?: string;
};

type FieldErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  form?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function AuthForm({ mode, next }: AuthFormProps) {
  const isLogin = mode === 'login';
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [verification,setVerification]=useState<VerificationChallenge|null>(null);
  const nextPath = typeof next === 'string' && /^\/(?:games|account|trees(?:\/[\w-]{1,64})?)$/.test(next) ? next : '/account';

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    const email = form.email.trim();
    if (!email) next.email = 'Имэйл оруулна уу.';
    else if (!isValidEmail(email)) next.email = 'Имэйл буруу байна.';
    if (!form.password) next.password = 'Нууц үг оруулна уу.';
    else if (!isLogin && form.password.length < 8) next.password = 'Нууц үг хамгийн багадаа 8 тэмдэгт.';
    else if (form.password.length > 128) next.password = 'Нууц үг хамгийн ихдээ 128 тэмдэгт.';
    if (!isLogin && !form.fullName.trim()) next.fullName = 'Нэр оруулна уу.';
    return next;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password
        })
      });
      const data = (await res.json()) as { error?: string } & Partial<VerificationChallenge>;
      if (!res.ok) {
        setErrors({ form: data.error || 'Алдаа гарлаа.' });
        setLoading(false);
        return;
      }
      if(data.verificationRequired && data.challengeId) {
        setVerification(data as VerificationChallenge);
        setForm(f=>({...f,password:''}));
        setLoading(false);
        return;
      }
      window.location.href = nextPath;
    } catch {
      setErrors({ form: 'Сүлжээний алдаа. Дахин оролдоно уу.' });
      setLoading(false);
    }
  };

  if(verification) return <SiteShell><div className="container"><HomeBack/><EmailVerificationForm initial={verification} nextPath={nextPath} onBack={()=>{setVerification(null);setErrors({});}}/></div></SiteShell>;

  return (
    <SiteShell>
      <div className="container">
        <HomeBack />
        <div className="auth-card">
          <p className="eyebrow">БҮРТГЭЛ</p>
          <h1>{isLogin ? 'Нэвтрэх' : 'Бүртгүүлэх'}</h1>
          <p className="auth-sub">
            {isLogin
              ? 'Имэйлээрээ нэвтэрч, тоглоомын оноо болон гацуураа хадгалаарай.'
              : 'Бүртгүүлсний дараа имэйлд ирэх 6 оронтой кодоор хаягаа баталгаажуулна.'}
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {!isLogin && (
              <div className="auth-field">
                <label htmlFor="fullName">Нэр</label>
                <input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  autoComplete="name"
                  maxLength={80}
                  aria-invalid={!!errors.fullName}
                  aria-describedby={errors.fullName ? 'err-fullName' : undefined}
                />
                {errors.fullName && (
                  <p id="err-fullName" className="auth-message" role="alert">
                    {errors.fullName}
                  </p>
                )}
              </div>
            )}
            <div className="auth-field">
              <label htmlFor="email">Имэйл</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                autoComplete="email"
                maxLength={254}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'err-email' : undefined}
              />
              {errors.email && (
                <p id="err-email" className="auth-message" role="alert">
                  {errors.email}
                </p>
              )}
            </div>
            <div className="auth-field">
              <label htmlFor="password">Нууц үг</label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                minLength={isLogin ? 1 : 8}
                maxLength={128}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'err-password' : undefined}
              />
              {errors.password && (
                <p id="err-password" className="auth-message" role="alert">
                  {errors.password}
                </p>
              )}
            </div>
            <button
              type="submit"
              className="live-button"
              style={{ width: '100%', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? '...' : isLogin ? 'НЭВТРЭХ' : 'БҮРТГҮҮЛЭХ'}
            </button>
            {errors.form && (
              <p className="auth-message" role="alert">
                {errors.form}
              </p>
            )}
          </form>

          {isLogin && <p className="auth-switch"><Link href="/forgot-password">Нууц үгээ мартсан уу?</Link></p>}

          <p className="auth-switch">
            {isLogin ? (
              <>
                Бүртгэлгүй юу? <Link href={`/signup?next=${encodeURIComponent(nextPath)}`}>Бүртгүүлэх</Link>
              </>
            ) : (
              <>
                Аль хэдийн бүртгэлтэй юу? <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>Нэвтрэх</Link>
              </>
            )}
          </p>
        </div>
      </div>
    </SiteShell>
  );
}
