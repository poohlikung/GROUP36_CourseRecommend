import { useAuth } from '../auth/AuthContext';

interface SystemStatusProps {
  compact?: boolean;
}

export function SystemStatus({ compact = false }: SystemStatusProps) {
  const { status, refresh } = useAuth();
  const loading = status === 'loading';

  if (compact) {
    return (
      <section className="system-toast" aria-live="polite" aria-busy={loading}>
        <span className={`system-toast-dot ${loading ? 'is-loading' : ''}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{loading ? 'กำลังเตรียมระบบ…' : 'เชื่อมต่อระบบไม่ได้'}</p>
          <p className="mt-0.5 truncate text-xs text-white/50">
            {loading
              ? 'การเปิดใช้งานครั้งแรกอาจใช้เวลา 2–3 นาที กรุณารอสักครู่'
              : 'ระบบอาจยังไม่พร้อม กรุณาลองเชื่อมต่ออีกครั้ง'}
          </p>
        </div>
        {!loading && (
          <button type="button" className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
            onClick={() => void refresh()}>ลองใหม่</button>
        )}
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-3xl gap-5 px-6 py-12" aria-live="polite" aria-busy={loading}>
      <div>
        <h1 className="text-xl font-bold">{loading ? 'กำลังเตรียมระบบ…' : 'เชื่อมต่อระบบไม่ได้'}</h1>
        <p className="mt-2 text-slate-600">{loading
          ? 'การเปิดใช้งานครั้งแรกอาจใช้เวลา 2–3 นาที กรุณารอสักครู่'
          : 'ระบบอาจยังไม่พร้อม กรุณาลองเชื่อมต่ออีกครั้ง'}</p>
      </div>
      {loading ? <div className="space-y-3" aria-hidden="true">
        <div className="h-8 animate-pulse rounded bg-slate-200" />
        <div className="h-32 animate-pulse rounded bg-slate-200" />
      </div> : <button type="button" className="justify-self-start rounded-lg bg-cyan-700 px-5 py-3 text-white"
        onClick={() => void refresh()}>ลองใหม่</button>}
    </section>
  );
}
