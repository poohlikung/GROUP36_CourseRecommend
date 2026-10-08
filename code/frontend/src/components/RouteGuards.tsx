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

export function PublicOnlyRoute({ children, authenticatedTo = '/' }: {
  children: React.ReactNode;
  authenticatedTo?: string;
}) {
  const { status } = useAuth();
  const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from ?? authenticatedTo;
  if (status === 'loading') return <PageStatus message="กำลังตรวจสอบการเข้าสู่ระบบ…" />;
  if (status === 'authenticated') return <Navigate to={destination} replace />;
  return children;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  if (status !== 'authenticated') return null;
  return user?.role === 'ADMIN' ? children : <Navigate to="/" replace />;
}

function PageStatus({ message }: { message: string }) {
  return (
    <main className="grid min-h-[60vh] place-items-center px-6" aria-live="polite">
      <div className="surface-panel flex items-center gap-4 px-6 py-5">
        <span className="relative flex h-3 w-3" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-600" />
        </span>
        <p className="font-semibold text-slate-600">{message}</p>
      </div>
    </main>
  );
}
