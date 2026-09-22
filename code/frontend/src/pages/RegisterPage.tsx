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
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <label className="block text-sm font-medium">
          ชื่อที่แสดง
          <input className="form-input" autoComplete="name" required maxLength={100} value={displayName}
            onChange={(event) => setDisplayName(event.target.value)} />
          <FieldError message={getFieldError(error, 'displayName')} />
        </label>
        <label className="block text-sm font-medium">
          อีเมล
          <input className="form-input" type="email" autoComplete="email" required maxLength={255} value={email}
            onChange={(event) => setEmail(event.target.value)} />
          <FieldError message={getFieldError(error, 'email')} />
        </label>
        <label className="block text-sm font-medium">
          รหัสผ่าน
          <input className="form-input" type="password" autoComplete="new-password" required minLength={8} maxLength={72}
            value={password} onChange={(event) => setPassword(event.target.value)} />
          <p className="mt-1 text-xs text-slate-500">อย่างน้อย 8 ตัวอักษร</p>
          <FieldError message={getFieldError(error, 'password')} />
        </label>
        <label className="block text-sm font-medium">
          ยืนยันรหัสผ่าน
          <input className="form-input" type="password" autoComplete="new-password" required minLength={8} maxLength={72}
            value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        </label>
        {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{getErrorMessage(error)}</p> : null}
        <button className="primary-button w-full" type="submit"
          disabled={submitting || !displayName.trim() || !email || password.length < 8 || !confirmPassword}>
          {submitting ? 'กำลังสร้างบัญชี…' : 'สมัครสมาชิก'}
        </button>
      </form>
    </AuthCard>
  );
}
