import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <PageStatus message="กำลังตรวจสอบการเข้าสู่ระบบ…" />;
  if (status === 'error') return <PageStatus message="เชื่อมต่อระบบไม่ได้ กรุณารีเฟรชแล้วลองใหม่" />;
  if (status === 'guest') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return children;
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') return <PageStatus message="กำลังตรวจสอบการเข้าสู่ระบบ…" />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return children;
}

function PageStatus({ message }: { message: string }) {
  return (
    <main className="grid min-h-[60vh] place-items-center px-6" aria-live="polite">
      <p className="text-slate-600">{message}</p>
    </main>
  );
}
