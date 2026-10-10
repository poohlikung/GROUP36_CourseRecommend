import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getErrorMessage, getFieldError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AuthCard, FieldError } from '../components/AuthCard';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<unknown>();
  const [submitting, setSubmitting] = useState(false);

  const displayNameError = getFieldError(error, 'displayName');
  const emailError = getFieldError(error, 'email');
  const passwordError = getFieldError(error, 'password');
  const passwordsMismatch = Boolean(password && confirmPassword && password !== confirmPassword);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError(new Error('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน'));
      return;
    }
    setError(undefined);
    setSubmitting(true);
    try {
      await register({ displayName, email, password });
      navigate('/profile', { replace: true });
    } catch (submitError) {
      setError(submitError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="สร้างบัญชีผู้เรียน"
      description="สมัครครั้งเดียวเพื่อบันทึกคอร์ส รีวิว และจัดการโปรไฟล์ของคุณ"
      alternateText="มีบัญชีอยู่แล้ว?"
      alternateLinkText="เข้าสู่ระบบ"
      alternateTo="/login"
    >
      <div className="mb-7 flex items-center gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-500 font-black text-slate-950" aria-hidden="true">01</span>
        <div>
          <p className="text-sm font-black text-slate-900">สร้างพื้นที่เรียนรู้ของคุณ</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-600">ใช้เวลาไม่ถึงหนึ่งนาที แล้วเริ่มค้นหาคอร์สได้เลย</p>
        </div>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
        <div>
          <label className="text-sm font-bold text-slate-800" htmlFor="register-display-name">ชื่อที่แสดง</label>
          <input className="form-input" id="register-display-name" autoComplete="name" required maxLength={100} value={displayName}
            onChange={(event) => setDisplayName(event.target.value)} aria-invalid={Boolean(displayNameError)}
            aria-describedby={displayNameError ? 'register-display-name-error' : undefined} />
          <div id="register-display-name-error"><FieldError message={displayNameError} /></div>
        </div>
        <div>
          <label className="text-sm font-bold text-slate-800" htmlFor="register-email">อีเมล</label>
          <input className="form-input" id="register-email" type="email" autoComplete="email" required maxLength={255} value={email}
            onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? 'register-email-error' : undefined} />
          <div id="register-email-error"><FieldError message={emailError} /></div>
        </div>
        <div>
          <label className="text-sm font-bold text-slate-800" htmlFor="register-password">รหัสผ่าน</label>
          <input className="form-input" id="register-password" type="password" autoComplete="new-password" required minLength={8} maxLength={72}
            value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(passwordError)}
            aria-describedby={`register-password-hint${passwordError ? ' register-password-error' : ''}`} />
          <p className="mt-1.5 text-xs font-medium text-slate-500" id="register-password-hint">อย่างน้อย 8 ตัวอักษร</p>
          <div id="register-password-error"><FieldError message={passwordError} /></div>
        </div>
        <div>
          <label className="text-sm font-bold text-slate-800" htmlFor="register-confirm-password">ยืนยันรหัสผ่าน</label>
          <input className="form-input" id="register-confirm-password" type="password" autoComplete="new-password" required minLength={8} maxLength={72}
            value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)}
            aria-invalid={passwordsMismatch} aria-describedby={passwordsMismatch ? 'register-confirm-password-error' : undefined} />
          {passwordsMismatch ? (
            <p className="mt-1.5 text-sm font-medium text-red-700" id="register-confirm-password-error">
              รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน
            </p>
          ) : null}
        </div>
        {error ? <p className="alert-error" role="alert">{getErrorMessage(error)}</p> : null}
        <button className="primary-button w-full" type="submit"
          disabled={submitting || !displayName.trim() || !email || password.length < 8 || !confirmPassword}>
          {submitting ? 'กำลังสร้างบัญชี…' : 'สมัครสมาชิก'}
        </button>
      </form>
    </AuthCard>
  );
}
