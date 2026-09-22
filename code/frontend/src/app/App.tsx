import { Navigate, Route, Routes } from 'react-router-dom';

import { HomePage } from '../pages/HomePage';
import { CatalogPage } from '../pages/CatalogPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/courses" element={<CatalogPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
