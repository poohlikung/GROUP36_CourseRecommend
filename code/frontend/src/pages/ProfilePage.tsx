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
    return <main className="mx-auto max-w-4xl px-5 py-12" aria-live="polite">กำลังโหลดโปรไฟล์…</main>;
  }
  if (!profile) {
    return <main className="mx-auto max-w-4xl px-5 py-12 text-red-800" role="alert">{getErrorMessage(error)}</main>;
  }

  const initials = profile.displayName.trim().slice(0, 2).toUpperCase();

  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl bg-slate-900 p-6 text-center text-white">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-cyan-500 text-3xl font-black" aria-hidden="true">
            {initials}
          </div>
          <h1 className="mt-4 text-xl font-bold">{profile.displayName}</h1>
          <p className="mt-1 break-all text-sm text-slate-300">{profile.email}</p>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-bold">โปรไฟล์ของฉัน</h2>
          <p className="mt-1 text-sm text-slate-600">แก้ไขข้อมูลที่จะแสดงใน CourseHub</p>
          <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
            <label className="block text-sm font-medium">
              อีเมล
              <input className="form-input bg-slate-100 text-slate-500" value={profile.email} disabled />
            </label>
            <label className="block text-sm font-medium">
              ชื่อที่แสดง
              <input className="form-input" required maxLength={100} value={displayName}
                onChange={(event) => setDisplayName(event.target.value)} />
              <FieldError message={getFieldError(error, 'displayName')} />
            </label>
            <label className="block text-sm font-medium">
              ประวัติย่อ
              <textarea className="form-input min-h-36 resize-y" maxLength={1000} value={bio}
                onChange={(event) => setBio(event.target.value)} />
              <span className="mt-1 block text-right text-xs text-slate-500">{bio.length}/1000</span>
              <FieldError message={getFieldError(error, 'bio')} />
            </label>
            {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{getErrorMessage(error)}</p> : null}
            {saved ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status">บันทึกโปรไฟล์แล้ว</p> : null}
            <button className="primary-button" type="submit" disabled={saving || !displayName.trim()}>
              {saving ? 'กำลังบันทึก…' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
