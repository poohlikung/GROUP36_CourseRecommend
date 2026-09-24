import { Navigate, Route, Routes } from 'react-router-dom';

import { HomePage } from '../pages/HomePage';
import { CatalogPage } from '../pages/CatalogPage';
import { AuthPage } from '../pages/AuthPage';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';

export function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}

function AppRoutes() {
  const { loading } = useAuth();
  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-200">กำลังโหลด...</main>;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/courses" element={<CatalogPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
