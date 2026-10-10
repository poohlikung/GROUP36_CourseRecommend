import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, getErrorMessage, getFieldError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useDialogFocusTrap } from '../../components/useDialogFocusTrap';
import { providerApi } from './providerApi';
import type { MemberRole, MyProvider, ProviderMember } from './types';

interface Props {
  provider: MyProvider;
  onBack: () => void;
}

export function ProviderMemberManagementSection({ provider, onBack }: Props) {
  const { user } = useAuth();
  const [members, setMembers] = useState<ProviderMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [memberRole, setMemberRole] = useState<MemberRole>('EDITOR');
  const [formError, setFormError] = useState<unknown>();
  const [emailError, setEmailError] = useState('');
  const [adding, setAdding] = useState(false);
  const [target, setTarget] = useState<ProviderMember | null>(null);
  const [removing, setRemoving] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const active = useRef(false);
  const listRequest = useRef<AbortController | null>(null);
  const mutationRequest = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const canManage = provider.role === 'OWNER' && !accessDenied;
  const dialogRef = useDialogFocusTrap(target !== null, () => setTarget(null), !removing, headingRef);

  const loadMembers = useCallback(async () => {
    listRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;
    setLoading(true);
    setListError('');
    try {
      const data = await providerApi.listMembers(provider.id, controller.signal);
      if (!active.current || controller.signal.aborted) return;
      setMembers(data);
    } catch (error) {
      if (!active.current || controller.signal.aborted) return;
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
        setAccessDenied(true);
        setMembers([]);
      }
      setListError(getErrorMessage(error));
    } finally {
      if (active.current && !controller.signal.aborted) setLoading(false);
    }
  }, [provider.id]);

  useEffect(() => {
    active.current = true;
    headingRef.current?.focus();
    if (provider.role === 'OWNER') void loadMembers();
    else setLoading(false);
    return () => {
      active.current = false;
      listRequest.current?.abort();
      mutationRequest.current?.abort();
    };
  }, [loadMembers, provider.role]);

  function revokeAccess(error: unknown) {
    if (error instanceof ApiError && [401, 403].includes(error.status)) {
      setAccessDenied(true);
      setMembers([]);
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || loading || !canManage) return;
    const trimmed = email.trim();
    setEmailError('');
    setFormError(undefined);
    if (!trimmed || trimmed.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('กรุณากรอกอีเมลที่ถูกต้อง (ไม่เกิน 255 ตัวอักษร)');
      emailRef.current?.focus();
      return;
    }
    busy.current = true;
    setAdding(true);
    setSuccess('');
    const controller = new AbortController();
    mutationRequest.current = controller;
    try {
      await providerApi.addMember(provider.id, { email: trimmed, memberRole }, controller.signal);
      if (!active.current || controller.signal.aborted) return;
      setEmail('');
      setMemberRole('EDITOR');
      setSuccess('เพิ่มสมาชิกทีมสำเร็จ');
      await loadMembers();
    } catch (error) {
      if (!active.current || controller.signal.aborted) return;
      revokeAccess(error);
      setFormError(error);
      emailRef.current?.focus();
    } finally {
      busy.current = false;
      if (active.current && !controller.signal.aborted) setAdding(false);
    }
  }

  async function removeMember() {
    if (!target || busy.current || !canManage) return;
    busy.current = true;
    setRemoving(true);
    setDeleteError('');
    setSuccess('');
    const controller = new AbortController();
    mutationRequest.current = controller;
    try {
      await providerApi.removeMember(provider.id, target.id, controller.signal);
      if (!active.current || controller.signal.aborted) return;
      if (target.userId === user?.id) {
        onBack();
        return;
      }
      setTarget(null);
      setSuccess('ลบสมาชิกทีมสำเร็จ');
      await loadMembers();
    } catch (error) {
      if (!active.current || controller.signal.aborted) return;
      revokeAccess(error);
      setDeleteError(getErrorMessage(error));
      if (error instanceof ApiError && [404, 409].includes(error.status)) await loadMembers();
    } finally {
      busy.current = false;
      if (active.current && !controller.signal.aborted) setRemoving(false);
    }
  }

  const ownerCount = members.filter((member) => member.memberRole === 'OWNER').length;
  const fieldError = emailError || getFieldError(formError, 'email');
  const roleError = getFieldError(formError, 'memberRole');
  const targetIsLastOwner = target?.memberRole === 'OWNER' && ownerCount <= 1;

  return (
    <section aria-labelledby="team-heading">
      <button type="button" className="ghost-button mb-5" onClick={onBack}>
        <span aria-hidden="true">←</span> กลับไปหน้า Provider
      </button>
      <header className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl sm:p-9">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Partner studio / Team</p>
          <h1 id="team-heading" ref={headingRef} tabIndex={-1} className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">จัดการสมาชิกทีม</h1>
          <p className="mt-3 break-words text-lg font-bold text-slate-200">{provider.name}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">ดูแลทีมของคุณ และกำหนดสิทธิ์ Owner หรือ Editor เมื่อเพิ่มสมาชิก</p>
        </div>
      </header>

      {success && <div role="status" className="alert-success mt-6">{success}</div>}
      {!canManage && <p role="alert" className="alert-error mt-6">เฉพาะ Owner ของ Provider เท่านั้นที่จัดการสมาชิกทีมได้ กรุณากลับไปหน้า Provider เพื่อตรวจสอบสิทธิ์</p>}
      {listError && <div role="alert" className="alert-error mt-6">
        {listError} {success && 'บันทึกสำเร็จแล้ว แต่โหลดรายชื่อใหม่ไม่สำเร็จ'}
        {canManage && <button type="button" onClick={() => void loadMembers()} className="ml-2 min-h-10 font-bold underline" disabled={loading || adding || removing}>ลองใหม่</button>}
      </div>}

      {canManage && <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="surface-card min-w-0 overflow-hidden" aria-labelledby="member-list-heading" aria-busy={loading}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-6">
            <h2 id="member-list-heading" className="text-xl font-black text-slate-950">สมาชิกในทีม</h2>
            {!loading && !listError && <span className="status-chip border-cyan-200 bg-cyan-50 text-cyan-800">{members.length} สมาชิก</span>}
          </div>
          {loading ? <div role="status" className="space-y-3 p-6">
            <span className="sr-only">กำลังโหลดรายชื่อสมาชิก...</span>
            <div className="skeleton-block h-20" /><div className="skeleton-block h-20" />
          </div> : listError ? <p className="p-6 text-sm text-slate-600">ยังแสดงรายชื่อปัจจุบันไม่ได้ กรุณาลองโหลดใหม่ก่อนจัดการสมาชิก</p> : members.length === 0 ?
            <div className="p-8 text-center text-sm text-slate-600">ยังไม่มีสมาชิกในทีม เพิ่มสมาชิกด้วยอีเมลได้จากฟอร์ม</div> : <>
              <div className="hidden grid-cols-[minmax(0,1fr)_9rem_8rem] gap-4 bg-slate-50 px-6 py-3 text-xs font-bold text-slate-500 md:grid" aria-hidden="true">
                <span>อีเมลสมาชิก</span><span>บทบาท</span><span className="text-right">จัดการ</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {members.map((member) => {
                  const lastOwner = member.memberRole === 'OWNER' && ownerCount <= 1;
                  return <li key={member.id} className="grid gap-3 p-6 md:grid-cols-[minmax(0,1fr)_9rem_8rem] md:items-center md:gap-4">
                    <div className="min-w-0">
                      <p className="break-all text-sm font-bold text-slate-900">{member.email}</p>
                      {member.userId === user?.id && <span className="mt-1 inline-block text-xs font-semibold text-cyan-700">คุณ</span>}
                    </div>
                    <div><span className={`status-chip ${member.memberRole === 'OWNER' ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-sky-200 bg-sky-50 text-sky-700'}`}>
                      {member.memberRole === 'OWNER' ? 'Owner (เจ้าของ)' : 'Editor (ผู้ดูแล)'}
                    </span></div>
                    <div className="md:text-right">
                      <button type="button" aria-label={`ลบสมาชิก ${member.email}`} aria-describedby={lastOwner ? `last-owner-${member.id}` : undefined}
                        disabled={adding || removing || lastOwner}
                        onClick={() => { setTarget(member); setDeleteError(''); }}
                        className="min-h-11 rounded-xl px-3 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">ลบสมาชิก</button>
                      {lastOwner && <p id={`last-owner-${member.id}`} className="mt-1 text-xs text-slate-500">ลบ Owner คนสุดท้ายไม่ได้</p>}
                    </div>
                  </li>;
                })}
              </ul>
            </>}
        </section>

        <section className="surface-card p-6" aria-labelledby="add-member-heading">
          <p className="eyebrow">Grow your team</p>
          <h2 id="add-member-heading" className="mt-2 text-xl font-black text-slate-950">เพิ่มสมาชิกทีม</h2>
          <p id="member-email-hint" className="mt-2 text-sm leading-6 text-slate-600">ผู้ใช้ต้องมีบัญชีในระบบอยู่แล้ว และบัญชีต้องไม่ถูกระงับ</p>
          {formError ? <div role="alert" className="alert-error mt-4">{getErrorMessage(formError)}</div> : null}
          <form className="mt-6 space-y-5" onSubmit={addMember} noValidate>
            <div>
              <label htmlFor="member-email" className="text-sm font-bold text-slate-700">อีเมลสมาชิก</label>
              <input id="member-email" ref={emailRef} type="email" required maxLength={255} autoComplete="email"
                placeholder="member@example.com" value={email} onChange={(event) => setEmail(event.target.value)}
                disabled={adding || removing} aria-invalid={Boolean(fieldError)} aria-describedby={`member-email-hint${fieldError ? ' member-email-error' : ''}`} className="form-input text-sm" />
              {fieldError && <p id="member-email-error" role="alert" className="mt-2 text-sm text-rose-700">{fieldError}</p>}
            </div>
            <div>
              <label htmlFor="member-role" className="text-sm font-bold text-slate-700">บทบาทสมาชิก</label>
              <select id="member-role" value={memberRole} onChange={(event) => setMemberRole(event.target.value as MemberRole)}
                disabled={adding || removing} aria-invalid={Boolean(roleError)} aria-describedby={`member-role-hint${roleError ? ' member-role-error' : ''}`} className="form-input text-sm">
                <option value="EDITOR">Editor (ผู้ดูแล)</option><option value="OWNER">Owner (เจ้าของ)</option>
              </select>
              <p id="member-role-hint" className="mt-2 text-xs leading-6 text-slate-600">{memberRole === 'OWNER' ? 'Owner จัดการข้อมูล คอร์ส และสมาชิกทีม รวมถึงลบ Provider ได้' : 'Editor จัดการข้อมูล Provider และคอร์สเรียนได้'}</p>
              {roleError && <p id="member-role-error" role="alert" className="mt-2 text-sm text-rose-700">{roleError}</p>}
            </div>
            <button type="submit" disabled={adding || removing || loading || Boolean(listError)} className="primary-button w-full">{adding ? 'กำลังเพิ่มสมาชิก...' : 'เพิ่มสมาชิก'}</button>
          </form>
        </section>
      </div>}

      {target && <div className="modal-backdrop">
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="remove-member-title" aria-describedby="remove-member-description" tabIndex={-1} className="modal-card max-w-md">
          <p className="eyebrow">Team membership</p>
          <h2 id="remove-member-title" className="mt-2 text-2xl font-black text-slate-950">ยืนยันการลบสมาชิก</h2>
          <p id="remove-member-description" className="mt-3 break-words text-sm leading-7 text-slate-600">ลบ <strong className="break-all text-slate-900">{target.email}</strong> ({target.memberRole === 'OWNER' ? 'Owner' : 'Editor'}) ออกจากทีม {provider.name}?</p>
          {target.userId === user?.id && <p className="mt-3 text-sm font-semibold text-amber-800">คุณกำลังออกจากทีม และจะเสียสิทธิ์จัดการ Provider นี้</p>}
          {deleteError && <p role="alert" className="alert-error mt-4">{deleteError}</p>}
          {targetIsLastOwner && <p role="alert" className="alert-error mt-4">ไม่สามารถลบ Owner คนสุดท้ายได้</p>}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button type="button" disabled={removing} onClick={() => setTarget(null)} className="secondary-button">ยกเลิก</button>
            <button type="button" disabled={removing || !canManage || targetIsLastOwner || Boolean(listError)} onClick={() => void removeMember()} className="primary-button !bg-rose-600 hover:!bg-rose-700">{removing ? 'กำลังลบ...' : 'ยืนยันการลบ'}</button>
          </div>
        </div>
      </div>}
    </section>
  );
}
