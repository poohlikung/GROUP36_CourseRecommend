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
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <label className="block text-sm font-medium">
          อีเมล
          <input
            className="form-input"
            type="email"
            autoComplete="email"
            required
            maxLength={255}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(getFieldError(error, 'email'))}
          />
          <FieldError message={getFieldError(error, 'email')} />
        </label>
        <label className="block text-sm font-medium">
          รหัสผ่าน
          <input
            className="form-input"
            type="password"
            autoComplete="current-password"
            required
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(getFieldError(error, 'password'))}
          />
          <FieldError message={getFieldError(error, 'password')} />
        </label>
        {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{getErrorMessage(error)}</p> : null}
        <button className="primary-button w-full" type="submit" disabled={submitting || !email || !password}>
          {submitting ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </AuthCard>
  );
}
