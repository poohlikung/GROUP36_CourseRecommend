import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { ApiError } from '../features/auth/authApi';
import { useAuth } from '../features/auth/AuthContext';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const isRegister = mode === 'register';
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (isRegister) await register({ email, password, displayName });
      else await login({ email, password });
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 py-12">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <Link className="text-sm font-black tracking-wide text-cyan-700" to="/">COURSEHUB</Link>
        <h1 className="mt-5 text-3xl font-black">
          {isRegister ? 'สร้างบัญชีใหม่' : 'ยินดีต้อนรับกลับมา'}
        </h1>
        <form className="mt-7 grid gap-5" onSubmit={submit}>
          {isRegister && (
            <label className="grid gap-2 text-sm font-semibold">
              ชื่อที่แสดง
              <input className={inputClass} required maxLength={100} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </label>
          )}
          <label className="grid gap-2 text-sm font-semibold">
            อีเมล
            <input className={inputClass} required type="email" maxLength={255} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            รหัสผ่าน
            <input className={inputClass} required type="password" minLength={isRegister ? 8 : undefined} maxLength={72} autoComplete={isRegister ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</p>}
          <button className="rounded-xl bg-cyan-400 px-5 py-3 font-bold disabled:opacity-60" disabled={submitting} type="submit">
            {submitting ? 'กำลังดำเนินการ...' : isRegister ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          {isRegister ? 'มีบัญชีแล้ว?' : 'ยังไม่มีบัญชี?'}{' '}
          <Link className="font-bold text-blue-700" to={isRegister ? '/login' : '/register'}>
            {isRegister ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </Link>
        </p>
      </section>
    </main>
  );
}
