import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { getErrorMessage, getFieldError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AuthCard, FieldError } from '../components/AuthCard';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>();
  const [submitting, setSubmitting] = useState(false);

  const emailError = getFieldError(error, 'email');
  const passwordError = getFieldError(error, 'password');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate(destination, { replace: true });
    } catch (submitError) {
      setError(submitError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="ยินดีต้อนรับกลับ"
      description="เข้าสู่ระบบเพื่อจัดการโปรไฟล์และรายการคอร์สของคุณ"
      alternateText="ยังไม่มีบัญชี?"
      alternateLinkText="สมัครสมาชิก"
      alternateTo="/register"
    >
      <div className="mb-7 grid grid-cols-2 gap-3" aria-hidden="true">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3">
          <span className="block text-xs font-bold text-blue-700">บัญชีเดียว</span>
          <span className="mt-1 block text-sm font-black text-slate-900">เก็บทุกคอร์สที่สนใจ</span>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
          <span className="block text-xs font-bold text-emerald-700">กลับมาเรียนต่อ</span>
          <span className="mt-1 block text-sm font-black text-slate-900">ต่อเนื่องทุกอุปกรณ์</span>
        </div>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
        <div>
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-bold text-slate-800" htmlFor="login-email">อีเมล</label>
            <span className="text-xs font-medium text-slate-500">ใช้สำหรับเข้าสู่ระบบ</span>
          </div>
          <input
            className="form-input"
            id="login-email"
            type="email"
            autoComplete="email"
            required
            maxLength={255}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? 'login-email-error' : undefined}
          />
          <div id="login-email-error"><FieldError message={emailError} /></div>
        </div>
        <div>
          <label className="text-sm font-bold text-slate-800" htmlFor="login-password">รหัสผ่าน</label>
          <input
            className="form-input"
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(passwordError)}
            aria-describedby={passwordError ? 'login-password-error' : undefined}
          />
          <div id="login-password-error"><FieldError message={passwordError} /></div>
        </div>
        {error ? <p className="alert-error" role="alert">{getErrorMessage(error)}</p> : null}
        <button className="primary-button w-full" type="submit" disabled={submitting || !email || !password}>
          {submitting ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </AuthCard>
  );
}
