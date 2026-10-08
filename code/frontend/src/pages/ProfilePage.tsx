import { useEffect, useState } from 'react';

import { authApi } from '../api/auth';
import type { Profile } from '../api/auth';
import { getErrorMessage, getFieldError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { FieldError } from '../components/AuthCard';

export function ProfilePage() {
  const { refresh } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    authApi.profile(controller.signal)
      .then((result) => {
        setProfile(result);
        setDisplayName(result.displayName);
        setBio(result.bio ?? '');
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSaved(false);
    setSaving(true);
    try {
      const result = await authApi.updateProfile({ displayName, bio });
      setProfile(result);
      setDisplayName(result.displayName);
      setBio(result.bio ?? '');
      await refresh();
      setSaved(true);
    } catch (saveError) {
      setError(saveError);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page-shell" aria-live="polite" aria-busy="true">
        <div className="surface-card mx-auto max-w-3xl p-7 sm:p-10">
          <div className="flex items-center gap-5">
            <div className="skeleton-block h-20 w-20 shrink-0 rounded-[1.5rem]" />
            <div className="w-full space-y-3">
              <div className="skeleton-block h-4 w-28" />
              <div className="skeleton-block h-7 w-3/5" />
              <p className="text-sm font-bold text-slate-600">กำลังโหลดโปรไฟล์…</p>
            </div>
          </div>
        </div>
      </main>
    );
  }
  if (!profile) {
    return <main className="page-shell"><p className="alert-error" role="alert">{getErrorMessage(error)}</p></main>;
  }

  const initials = profile.displayName.trim().slice(0, 2).toUpperCase();
  const displayNameError = getFieldError(error, 'displayName');
  const bioError = getFieldError(error, 'bio');

  return (
    <main className="page-shell">
      <header className="mb-8 max-w-2xl">
        <p className="eyebrow">Your learning identity</p>
        <h1 className="section-heading mt-4">พื้นที่ส่วนตัวของคุณ</h1>
        <p className="mt-3 leading-7 text-slate-600">อัปเดตข้อมูลที่ผู้เรียนและผู้ให้บริการคอร์สจะเห็นใน CourseHub</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[300px_1fr] lg:gap-8">
        <aside className="surface-panel depth-card overflow-hidden text-center lg:sticky lg:top-28">
          <div className="hero-grid relative overflow-hidden bg-slate-950 px-6 pb-10 pt-8 text-white">
            <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-blue-500/40 blur-3xl" aria-hidden="true" />
            <div className="relative mx-auto grid h-28 w-28 place-items-center rounded-[2rem] border border-white/30 bg-gradient-to-br from-cyan-300 to-blue-500 text-3xl font-black text-slate-950 shadow-2xl [transform:rotate(-3deg)]" aria-hidden="true">
              {initials}
            </div>
            <h2 className="relative mt-5 text-xl font-black">{profile.displayName}</h2>
            <p className="relative mt-1 break-all text-sm text-slate-300">{profile.email}</p>
          </div>
          <div className="space-y-3 p-5 text-left">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700">สถานะบัญชี</p>
              <p className="mt-2 font-black text-slate-900">พร้อมค้นหาเส้นทางใหม่</p>
            </div>
            <p className="px-2 text-xs leading-5 text-slate-500">อีเมลใช้สำหรับเข้าสู่ระบบและไม่สามารถแก้ไขได้จากหน้านี้</p>
          </div>
        </aside>

        <section className="surface-card overflow-hidden">
          <div className="border-b border-slate-200/80 bg-white/70 px-6 py-6 sm:px-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700">Account details</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.025em] text-slate-950">โปรไฟล์ของฉัน</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">แก้ไขข้อมูลที่จะแสดงใน CourseHub</p>
          </div>
          <form className="space-y-6 p-6 sm:p-8" onSubmit={handleSubmit} noValidate aria-busy={saving}>
            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="profile-email">อีเมล</label>
              <input className="form-input bg-slate-100 text-slate-500" id="profile-email" value={profile.email} disabled aria-describedby="profile-email-hint" />
              <span className="mt-1.5 block text-xs font-medium text-slate-500" id="profile-email-hint">ข้อมูลสำหรับเข้าสู่ระบบ</span>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-bold text-slate-800" htmlFor="profile-display-name">ชื่อที่แสดง</label>
                <span className="text-xs font-medium text-slate-500">สูงสุด 100 ตัวอักษร</span>
              </div>
              <input className="form-input" id="profile-display-name" required maxLength={100} value={displayName}
                onChange={(event) => setDisplayName(event.target.value)} aria-invalid={Boolean(displayNameError)}
                aria-describedby={displayNameError ? 'profile-display-name-error' : undefined} />
              <div id="profile-display-name-error"><FieldError message={displayNameError} /></div>
            </div>
            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="profile-bio">ประวัติย่อ</label>
              <textarea className="form-input min-h-40 resize-y" id="profile-bio" maxLength={1000} value={bio}
                onChange={(event) => setBio(event.target.value)} aria-invalid={Boolean(bioError)}
                aria-describedby={`profile-bio-count${bioError ? ' profile-bio-error' : ''}`} />
              <span className="mt-1.5 block text-right text-xs font-medium text-slate-500" id="profile-bio-count">{bio.length}/1000</span>
              <div id="profile-bio-error"><FieldError message={bioError} /></div>
            </div>
            {error ? <p className="alert-error" role="alert">{getErrorMessage(error)}</p> : null}
            {saved ? <p className="alert-success" role="status">บันทึกโปรไฟล์แล้ว</p> : null}
            <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-slate-500">การเปลี่ยนแปลงจะแสดงในบัญชีของคุณทันที</p>
              <button className="primary-button sm:min-w-48" type="submit" disabled={saving || !displayName.trim()}>
                {saving ? 'กำลังบันทึก…' : 'บันทึกการเปลี่ยนแปลง'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
