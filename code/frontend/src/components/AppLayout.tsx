import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { getErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { BrandMark } from './BrandMark';

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `nav-link ${isActive ? 'nav-link-active' : ''}`;
}

export function AppLayout() {
  const { status, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [logoutError, setLogoutError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    setMenuOpen(false);

    const pageTitles: Record<string, string> = {
      '/': 'หน้าแรก',
      '/courses': 'สำรวจคอร์ส',
      '/match': 'หาคอร์สที่ใช่',
      '/login': 'เข้าสู่ระบบ',
      '/register': 'สมัครสมาชิก',
      '/profile': 'โปรไฟล์',
      '/bookmarks': 'คอร์สที่บันทึก',
      '/providers': 'ผู้ให้บริการ',
      '/admin': 'งานตรวจ Admin',
    };
    document.title = `${pageTitles[location.pathname] ?? 'CourseHub'} | CourseHub`;

    if (previousPathRef.current !== location.pathname) {
      requestAnimationFrame(() => document.getElementById('main-content')?.focus());
      previousPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [menuOpen]);

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
    <div className="flex min-h-screen flex-col text-slate-900">
      <a className="skip-link" href="#main-content">ข้ามไปยังเนื้อหาหลัก</a>
      <header className="sticky top-0 z-40 border-b border-white/70 bg-[rgba(247,243,233,0.88)] backdrop-blur-xl">
        <nav className="shell-container" aria-label="เมนูหลัก">
          <div className="flex min-h-[76px] items-center justify-between gap-4">
            <Link to="/" aria-label="CourseHub หน้าแรก" className="rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100">
              <BrandMark />
            </Link>
            <button
              ref={menuButtonRef}
              type="button"
              className="grid h-11 w-11 place-items-center rounded-xl border border-slate-300 bg-white text-slate-900 shadow-sm lg:hidden"
              aria-label={menuOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
              aria-expanded={menuOpen}
              aria-controls="primary-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span aria-hidden="true" className="text-xl leading-none">{menuOpen ? '×' : '☰'}</span>
            </button>
            <div
              id="primary-navigation"
              className={`${menuOpen ? 'flex' : 'hidden'} absolute left-5 right-5 top-[68px] max-h-[calc(100dvh-5rem)] flex-col gap-1 overflow-y-auto rounded-3xl border border-white bg-[color:var(--paper)] p-3 shadow-2xl lg:static lg:flex lg:max-h-none lg:flex-row lg:items-center lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
            >
              <NavLink to="/courses" className={navLinkClass}>สำรวจคอร์ส</NavLink>
              <NavLink to="/match" className={navLinkClass}>หาคอร์สที่ใช่</NavLink>
              {status === 'authenticated' && user ? (
                <>
                  {user.role === 'ADMIN' && <NavLink to="/admin" className={navLinkClass}>งานตรวจ Admin</NavLink>}
                  <NavLink to="/providers" className={navLinkClass}>ผู้ให้บริการ (Provider)</NavLink>
                  <NavLink to="/bookmarks" className={navLinkClass}>คอร์สที่บันทึก</NavLink>
                  <NavLink to="/profile" className={navLinkClass}>
                    <span className="mr-2 grid h-7 w-7 place-items-center rounded-full bg-blue-100 text-xs font-black text-blue-700" aria-hidden="true">
                      {user.displayName.trim().charAt(0).toUpperCase()}
                    </span>
                    {user.displayName}
                  </NavLink>
                  <button type="button" onClick={handleLogout} className="primary-button min-h-10 rounded-xl px-4 py-2 text-sm">
                    ออกจากระบบ
                  </button>
                </>
              ) : status === 'guest' ? (
                <>
                  <NavLink to="/login" className={navLinkClass}>เข้าสู่ระบบ</NavLink>
                  <NavLink to="/register" className="primary-button min-h-10 rounded-xl px-4 py-2 text-sm">สมัครสมาชิก</NavLink>
                </>
              ) : (
                <span className="px-3 py-2 text-sm font-medium text-slate-600">กำลังตรวจสอบบัญชี…</span>
              )}
            </div>
          </div>
        </nav>
        {logoutError && <p className="shell-container pb-3 text-sm font-medium text-red-700" role="alert">{logoutError}</p>}
      </header>
      <div id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </div>
      <footer className="border-t border-slate-200/80 bg-[color:var(--ink)] text-slate-300">
        <div className="shell-container flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <BrandMark inverse />
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">รวมคอร์ส เปรียบเทียบอย่างชัดเจน แล้วออกแบบเส้นทางเรียนที่เป็นของคุณ</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
            <Link className="transition hover:text-cyan-300" to="/courses">คอร์สทั้งหมด</Link>
            <Link className="transition hover:text-cyan-300" to="/match">ระบบแนะนำ</Link>
            <Link className="transition hover:text-cyan-300" to="/providers">สำหรับ Provider</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
