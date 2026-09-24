import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';

import { getErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export function AppLayout() {
  const { status, user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState('');

  async function handleLogout() {
    setLogoutError('');
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      setLogoutError(getErrorMessage(error));
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4" aria-label="เมนูหลัก">
          <Link to="/" className="text-xl font-black tracking-tight text-cyan-700">CourseHub</Link>
          <div className="flex items-center gap-3 text-sm font-medium">
            {status === 'authenticated' && user ? (
              <>
                <NavLink to="/profile" className="rounded-lg px-3 py-2 hover:bg-slate-100">
                  {user.displayName}
                </NavLink>
                <button type="button" onClick={handleLogout} className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-700">
                  ออกจากระบบ
                </button>
              </>
            ) : status === 'guest' ? (
              <>
                <NavLink to="/login" className="rounded-lg px-3 py-2 hover:bg-slate-100">เข้าสู่ระบบ</NavLink>
                <NavLink to="/register" className="rounded-lg bg-cyan-700 px-4 py-2 text-white hover:bg-cyan-600">สมัครสมาชิก</NavLink>
              </>
            ) : (
              <span className="text-slate-500">กำลังตรวจสอบบัญชี…</span>
            )}
          </div>
        </nav>
        {logoutError && <p className="mx-auto max-w-6xl px-5 pb-3 text-sm text-red-700" role="alert">{logoutError}</p>}
      </header>
      <Outlet />
    </div>
  );
}
