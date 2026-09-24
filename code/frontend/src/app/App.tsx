import { Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider } from '../auth/AuthContext';
import { AppLayout } from '../components/AppLayout';
import { ProtectedRoute, PublicOnlyRoute } from '../components/RouteGuards';
import { HomePage } from '../pages/HomePage';
import { CatalogPage } from '../pages/CatalogPage';
import { LoginPage } from '../pages/LoginPage';
import { ProfilePage } from '../pages/ProfilePage';
import { RegisterPage } from '../pages/RegisterPage';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/courses" element={<CatalogPage />} />
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
