import { Link } from 'react-router-dom';

import { useAuth } from './AuthContext';

export function AuthActions({ dark = false }: { dark?: boolean }) {
  const { user, logout } = useAuth();
  const text = dark ? 'text-slate-200 hover:text-white' : 'text-slate-600 hover:text-slate-950';

  if (user) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className={dark ? 'text-slate-200' : 'text-slate-700'}>{user.displayName}</span>
        <button className={`${text} font-semibold`} onClick={() => void logout()} type="button">
          ออกจากระบบ
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm font-semibold">
      <Link className={text} to="/login">เข้าสู่ระบบ</Link>
      <Link className="rounded-lg bg-cyan-400 px-4 py-2 text-slate-950 hover:bg-cyan-300" to="/register">
        สมัครสมาชิก
      </Link>
    </div>
  );
}
