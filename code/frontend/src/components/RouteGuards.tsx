import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { SystemStatus } from './SystemStatus';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading' || status === 'error') return <SystemStatus />;
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
  if (status === 'loading' || status === 'error') return <SystemStatus />;
  if (status === 'authenticated') return <Navigate to={destination} replace />;
  return children;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  if (status !== 'authenticated') return null;
  return user?.role === 'ADMIN' ? children : <Navigate to="/" replace />;
}

