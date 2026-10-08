import { useEffect, useRef, useState } from 'react';
import { getErrorMessage, getFieldError } from '../api/client';
import { FieldError } from '../components/AuthCard';
import { CourseManagementSection } from '../features/course/CourseManagementSection';
import { providerApi } from '../features/provider/providerApi';
import type {
  CreateProviderPayload,
  MemberRole,
  MyProvider,
  ProviderStatus,
  UpdateProviderPayload,
} from '../features/provider/types';

export function isSafeHttpUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

const focusableElementSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function useDialogFocusTrap(
  isOpen: boolean,
  onClose: () => void,
  canClose: boolean,
  fallbackRef?: { readonly current: HTMLElement | null },
) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const canCloseRef = useRef(canClose);

  useEffect(() => {
    closeRef.current = onClose;
    canCloseRef.current = canClose;
  }, [onClose, canClose]);

  useEffect(() => {
    if (!isOpen) return;

    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const activeDialog: HTMLDivElement = dialog;

    const getFocusableElements = () =>
      Array.from(activeDialog.querySelectorAll<HTMLElement>(focusableElementSelector));
    (getFocusableElements()[0] ?? activeDialog).focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (!canCloseRef.current) return;
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        activeDialog.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !activeDialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !activeDialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (trigger?.isConnected) {
        trigger.focus();
      } else {
        fallbackRef?.current?.focus();
      }
    };
  }, [isOpen]);

  return dialogRef;
}

function focusFirstFieldError(error: unknown, fields: ReadonlyArray<readonly [string, string]>) {
  const firstInvalidField = fields.find(([field]) => Boolean(getFieldError(error, field)));
  if (!firstInvalidField) return;
  window.setTimeout(() => document.getElementById(firstInvalidField[1])?.focus(), 0);
}

export function ProviderPage() {
  const [providers, setProviders] = useState<MyProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<MyProvider | null>(null);
  const [deletingProvider, setDeletingProvider] = useState<MyProvider | null>(null);
  const [managingCoursesProvider, setManagingCoursesProvider] = useState<MyProvider | null>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState<CreateProviderPayload>({
    name: '',
    slug: '',
    description: '',
    websiteUrl: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<unknown>();

  // Edit Form State
  const [editForm, setEditForm] = useState<UpdateProviderPayload>({
    name: '',
    slug: '',
    description: '',
    websiteUrl: '',
  });
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<unknown>();

  // Delete State
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Success Notification
  const [successMessage, setSuccessMessage] = useState('');
  const pageHeadingRef = useRef<HTMLHeadingElement>(null);
  const createDialogRef = useDialogFocusTrap(showCreateModal, () => setShowCreateModal(false), !creating, pageHeadingRef);
  const editDialogRef = useDialogFocusTrap(editingProvider !== null, () => setEditingProvider(null), !updating, pageHeadingRef);
  const deleteDialogRef = useDialogFocusTrap(deletingProvider !== null, () => setDeletingProvider(null), !deleting, pageHeadingRef);
  const createNameError = getFieldError(createError, 'name');
  const createSlugError = getFieldError(createError, 'slug');
  const createDescriptionError = getFieldError(createError, 'description');
  const createWebsiteError = getFieldError(createError, 'websiteUrl');
  const editNameError = getFieldError(updateError, 'name');
  const editSlugError = getFieldError(updateError, 'slug');
  const editDescriptionError = getFieldError(updateError, 'description');
  const editWebsiteError = getFieldError(updateError, 'websiteUrl');

  function loadProviders() {
    setLoading(true);
    setListError('');
    providerApi
      .findMine()
      .then((data) => {
        setProviders(data);
      })
      .catch((err) => {
        setListError(getErrorMessage(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadProviders();
  }, []);

  function handleOpenEdit(provider: MyProvider) {
    setEditingProvider(provider);
    setEditForm({
      name: provider.name,
      slug: provider.slug,
      description: provider.description ?? '',
      websiteUrl: provider.websiteUrl ?? '',
    });
    setUpdateError(undefined);
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(undefined);
    setCreating(true);
    try {
      await providerApi.create({
        name: createForm.name.trim(),
        slug: createForm.slug.trim().toLowerCase(),
        description: createForm.description?.trim() || undefined,
        websiteUrl: createForm.websiteUrl?.trim() || undefined,
      });
      setShowCreateModal(false);
      setCreateForm({ name: '', slug: '', description: '', websiteUrl: '' });
      setSuccessMessage('ลงทะเบียน Provider สำเร็จ รอการตรวจสอบและอนุมัติ');
      loadProviders();
    } catch (err) {
      setCreateError(err);
      focusFirstFieldError(err, [
        ['name', 'create-name'],
        ['slug', 'create-slug'],
        ['description', 'create-desc'],
        ['websiteUrl', 'create-website'],
      ]);
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProvider) return;
    setUpdateError(undefined);
    setUpdating(true);
    try {
      await providerApi.update(editingProvider.id, {
        name: editForm.name?.trim(),
        slug: editForm.slug?.trim().toLowerCase(),
        description: editForm.description ? editForm.description.trim() : '',
        websiteUrl: editForm.websiteUrl ? editForm.websiteUrl.trim() : '',
      });
      setEditingProvider(null);
      setSuccessMessage('แก้ไขข้อมูล Provider สำเร็จ');
      loadProviders();
    } catch (err) {
      setUpdateError(err);
      focusFirstFieldError(err, [
        ['name', 'edit-name'],
        ['slug', 'edit-slug'],
        ['description', 'edit-desc'],
        ['websiteUrl', 'edit-website'],
      ]);
    } finally {
      setUpdating(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingProvider) return;
    setDeleteError('');
    setDeleting(true);
    try {
      await providerApi.delete(deletingProvider.id);
      setDeletingProvider(null);
      setSuccessMessage('ลบ Provider สำเร็จ');
      loadProviders();
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  function getStatusBadge(status: ProviderStatus) {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="status-chip border-emerald-200 bg-emerald-50 text-emerald-800">
            อนุมัติแล้ว
          </span>
        );
      case 'PENDING':
        return (
          <span className="status-chip border-amber-200 bg-amber-50 text-amber-800">
            รอการอนุมัติ (Pending)
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="status-chip border-slate-300 bg-slate-100 text-slate-700">
            ระงับการใช้งาน
          </span>
        );
    }
  }

  function getRoleBadge(role: MemberRole) {
    switch (role) {
      case 'OWNER':
        return (
          <span className="status-chip border-indigo-200 bg-indigo-50 text-indigo-700">
            Owner (เจ้าของ)
          </span>
        );
      case 'EDITOR':
        return (
          <span className="status-chip border-sky-200 bg-sky-50 text-sky-700">
            Editor (ผู้ดูแล)
          </span>
        );
    }
  }

  if (managingCoursesProvider) {
    return (
      <main className="page-shell">
        <CourseManagementSection
          provider={managingCoursesProvider}
          onBack={() => {
            setManagingCoursesProvider(null);
            loadProviders();
            window.setTimeout(() => pageHeadingRef.current?.focus(), 0);
          }}
        />
      </main>
    );
  }

  return (
    <main className="page-shell">
      <header className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-9 text-white shadow-[0_28px_70px_rgba(4,20,46,0.24)] sm:px-9">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-500/30 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Partner studio</p>
            <h1 ref={pageHeadingRef} tabIndex={-1} className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
            ผู้ให้บริการคอร์ส (Provider Management)
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
              จัดการสถาบันและผู้ให้บริการคอร์สเรียนที่คุณเป็นสมาชิกหรือเจ้าของ
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowCreateModal(true);
              setCreateError(undefined);
            }}
            className="primary-button shrink-0 !bg-white !text-blue-700 hover:!bg-blue-50"
          >
            <span aria-hidden="true">＋</span>
            ลงทะเบียน Provider ใหม่
          </button>
        </div>
      </header>

      {/* Notifications */}
      {successMessage && (
        <div
          role="status"
          className="alert-success mt-6 flex items-center justify-between gap-4"
        >
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="min-h-10 rounded-xl px-3 text-xs font-bold hover:bg-emerald-100 focus:outline-none focus:ring-4 focus:ring-emerald-100"
          >
            ปิด
          </button>
        </div>
      )}

      {listError && (
        <div
          role="alert"
          className="alert-error mt-6"
        >
          {listError}{' '}
          <button
            type="button"
            onClick={loadProviders}
            className="ml-2 font-semibold underline hover:no-underline"
          >
            ลองใหม่
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="mt-8 grid gap-5 md:grid-cols-2" role="status" aria-label="กำลังโหลดข้อมูลผู้ให้บริการคอร์ส">
          <div className="skeleton-block h-64" />
          <div className="skeleton-block h-64" />
          <span className="sr-only">กำลังโหลดข้อมูลผู้ให้บริการคอร์ส...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !listError && providers.length === 0 && (
        <div className="empty-state mt-8 py-14">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-100 text-3xl text-blue-700" aria-hidden="true">⌂</div>
          <h2 className="mt-5 text-xl font-black text-slate-950">ยังไม่มี Provider ที่คุณดูแล</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            คุณสามารถลงทะเบียนสถาบันหรือองค์กรของคุณเพื่อเริ่มเพิ่มคอร์สเรียนได้ทันที
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(true);
                setCreateError(undefined);
              }}
              className="primary-button"
            >
              ลงทะเบียน Provider ใหม่
            </button>
          </div>
        </div>
      )}

      {/* Provider List */}
      {!loading && !listError && providers.length > 0 && (
        <section aria-label="Provider ที่คุณดูแล" className="mt-8 grid gap-5 md:grid-cols-2">
          {providers.map((p) => (
            <article
              key={p.id}
              aria-labelledby={`provider-title-${p.id}`}
              className="surface-card depth-card group relative flex min-h-72 flex-col justify-between overflow-hidden p-6"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400" aria-hidden="true" />
              <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Learning partner</p>
                    <h2 id={`provider-title-${p.id}`} className="mt-1 truncate text-xl font-black tracking-tight text-slate-950">{p.name}</h2>
                    <p className="mt-1 truncate font-mono text-xs text-slate-500">slug: {p.slug}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:max-w-44 sm:justify-end">
                    {getStatusBadge(p.status)}
                    {getRoleBadge(p.role)}
                  </div>
                </div>

                <p className="mt-5 line-clamp-3 text-sm leading-6 text-slate-600">
                  {p.description || 'ไม่มีคำอธิบาย'}
                </p>

                {isSafeHttpUrl(p.websiteUrl) && (
                  <p className="mt-4 text-sm">
                    <a
                      href={p.websiteUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 max-w-full items-center break-all font-bold text-blue-700 hover:text-blue-900 hover:underline"
                    >
                      {p.websiteUrl}
                    </a>
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-4">
                {(p.role === 'OWNER' || p.role === 'EDITOR') && (
                  <button
                    type="button"
                    onClick={() => setManagingCoursesProvider(p)}
                    className="primary-button !min-h-10 !px-4 !py-2 text-sm"
                  >
                    จัดการคอร์สเรียน
                  </button>
                )}

                {(p.role === 'OWNER' || p.role === 'EDITOR') && (
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(p)}
                    className="secondary-button !min-h-10 !px-4 !py-2 text-sm"
                  >
                    แก้ไขข้อมูล
                  </button>
                )}

                {p.role === 'OWNER' && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingProvider(p);
                      setDeleteError('');
                    }}
                    className="inline-flex min-h-10 items-center justify-center rounded-2xl px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-4 focus:ring-rose-100"
                  >
                    ลบ Provider
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Modal: Create Provider */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div ref={createDialogRef} role="dialog" aria-modal="true" aria-labelledby="create-provider-title" tabIndex={-1} className="modal-card max-w-lg">
            <p className="eyebrow">New learning partner</p>
            <h2 id="create-provider-title" className="mt-2 text-2xl font-black tracking-tight text-slate-950">ลงทะเบียน Provider ใหม่</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              กรอกข้อมูลเพื่อขออนุมัติเป็นผู้ให้บริการคอร์สเรียนในระบบ
            </p>

            {createError ? (
              <div
                role="alert"
                className="alert-error mt-4"
              >
                {getErrorMessage(createError)}
              </div>
            ) : null}

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="create-name" className="block text-xs font-semibold text-slate-700">
                  ชื่อสถาบัน / ผู้ให้บริการ <span className="text-rose-500">*</span>
                </label>
                <input
                  id="create-name"
                  type="text"
                  required
                  maxLength={100}
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="เช่น Chula MOOC, Skooldio"
                  aria-invalid={Boolean(createNameError)}
                  aria-describedby={createNameError ? 'create-name-error' : undefined}
                  className="form-input text-sm"
                />
                <div id="create-name-error"><FieldError message={createNameError} /></div>
              </div>

              <div>
                <label htmlFor="create-slug" className="block text-xs font-semibold text-slate-700">
                  URL Slug <span className="text-rose-500">*</span>
                </label>
                <input
                  id="create-slug"
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={createForm.slug}
                  onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                  placeholder="เช่น chula-mooc, skooldio"
                  aria-invalid={Boolean(createSlugError)}
                  aria-describedby={createSlugError ? 'create-slug-help create-slug-error' : 'create-slug-help'}
                  className="form-input text-sm"
                />
                <p id="create-slug-help" className="mt-1 text-[11px] text-slate-500">
                  ใช้ภาษาอังกฤษพิมพ์เล็ก ตัวเลข และขีดกลาง (-) เท่านั้น
                </p>
                <div id="create-slug-error"><FieldError message={createSlugError} /></div>
              </div>

              <div>
                <label
                  htmlFor="create-desc"
                  className="block text-xs font-semibold text-slate-700"
                >
                  คำอธิบายสถาบัน (ไม่บังคับ)
                </label>
                <textarea
                  id="create-desc"
                  rows={3}
                  maxLength={2000}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="รายละเอียดเกี่ยวกับหลักสูตรหรือผู้ให้บริการ..."
                  aria-invalid={Boolean(createDescriptionError)}
                  aria-describedby={createDescriptionError ? 'create-description-error' : undefined}
                  className="form-input text-sm"
                />
                <div id="create-description-error"><FieldError message={createDescriptionError} /></div>
              </div>

              <div>
                <label
                  htmlFor="create-website"
                  className="block text-xs font-semibold text-slate-700"
                >
                  เว็บไซต์ทางการ (ไม่บังคับ)
                </label>
                <input
                  id="create-website"
                  type="url"
                  maxLength={255}
                  pattern="https?://.*"
                  title="URL ต้องขึ้นต้นด้วย http:// หรือ https://"
                  value={createForm.websiteUrl}
                  onChange={(e) => setCreateForm({ ...createForm, websiteUrl: e.target.value })}
                  placeholder="https://example.com"
                  aria-invalid={Boolean(createWebsiteError)}
                  aria-describedby={createWebsiteError ? 'create-website-error' : undefined}
                  className="form-input text-sm"
                />
                <div id="create-website-error"><FieldError message={createWebsiteError} /></div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="secondary-button !min-h-10 !px-4 !py-2 text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="primary-button !min-h-10 !px-4 !py-2 text-sm"
                >
                  {creating ? 'กำลังบันทึก...' : 'ลงทะเบียน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Provider */}
      {editingProvider && (
        <div className="modal-backdrop">
          <div ref={editDialogRef} role="dialog" aria-modal="true" aria-labelledby="edit-provider-title" tabIndex={-1} className="modal-card max-w-lg">
            <p className="eyebrow">Partner profile</p>
            <h2 id="edit-provider-title" className="mt-2 text-2xl font-black tracking-tight text-slate-950">แก้ไขข้อมูล Provider</h2>
            <p className="mt-2 text-sm text-slate-600">
              แก้ไขข้อมูลสถาบัน ({editingProvider.slug})
            </p>

            {updateError ? (
              <div
                role="alert"
                className="alert-error mt-4"
              >
                {getErrorMessage(updateError)}
              </div>
            ) : null}

            <form onSubmit={handleUpdateSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-xs font-semibold text-slate-700">
                  ชื่อสถาบัน / ผู้ให้บริการ <span className="text-rose-500">*</span>
                </label>
                <input
                  id="edit-name"
                  type="text"
                  required
                  maxLength={100}
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  aria-invalid={Boolean(editNameError)}
                  aria-describedby={editNameError ? 'edit-name-error' : undefined}
                  className="form-input text-sm"
                />
                <div id="edit-name-error"><FieldError message={editNameError} /></div>
              </div>

              <div>
                <label htmlFor="edit-slug" className="block text-xs font-semibold text-slate-700">
                  URL Slug
                </label>
                <input
                  id="edit-slug"
                  type="text"
                  minLength={2}
                  maxLength={100}
                  pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                  title="ตัวพิมพ์เล็ก ตัวเลข คั่นด้วยเครื่องหมายขีดกลาง (-) เท่านั้น"
                  value={editForm.slug ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                  placeholder="chula-mooc"
                  aria-invalid={Boolean(editSlugError)}
                  aria-describedby={editSlugError ? 'edit-slug-error' : undefined}
                  className="form-input text-sm"
                />
                <div id="edit-slug-error"><FieldError message={editSlugError} /></div>
              </div>

              <div>
                <label htmlFor="edit-desc" className="block text-xs font-semibold text-slate-700">
                  คำอธิบายสถาบัน
                </label>
                <textarea
                  id="edit-desc"
                  rows={3}
                  maxLength={2000}
                  value={editForm.description ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  aria-invalid={Boolean(editDescriptionError)}
                  aria-describedby={editDescriptionError ? 'edit-description-error' : undefined}
                  className="form-input text-sm"
                />
                <div id="edit-description-error"><FieldError message={editDescriptionError} /></div>
              </div>

              <div>
                <label
                  htmlFor="edit-website"
                  className="block text-xs font-semibold text-slate-700"
                >
                  เว็บไซต์ทางการ
                </label>
                <input
                  id="edit-website"
                  type="url"
                  maxLength={255}
                  pattern="https?://.*"
                  title="URL ต้องขึ้นต้นด้วย http:// หรือ https://"
                  value={editForm.websiteUrl ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, websiteUrl: e.target.value })}
                  placeholder="https://example.com"
                  aria-invalid={Boolean(editWebsiteError)}
                  aria-describedby={editWebsiteError ? 'edit-website-error' : undefined}
                  className="form-input text-sm"
                />
                <div id="edit-website-error"><FieldError message={editWebsiteError} /></div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingProvider(null)}
                  disabled={updating}
                  className="secondary-button !min-h-10 !px-4 !py-2 text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="primary-button !min-h-10 !px-4 !py-2 text-sm"
                >
                  {updating ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deletingProvider && (
        <div className="modal-backdrop">
          <div ref={deleteDialogRef} role="dialog" aria-modal="true" aria-labelledby="delete-provider-title" tabIndex={-1} className="modal-card max-w-md">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-100 text-xl text-rose-700" aria-hidden="true">!</div>
            <h2 id="delete-provider-title" className="mt-4 text-xl font-black tracking-tight text-slate-950">ยืนยันการลบ Provider</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              คุณแน่ใจหรือไม่ว่าต้องการลบสถาบัน{' '}
              <span className="font-semibold text-slate-900">{deletingProvider.name}</span>?
              การกระทำนี้จะลบข้อมูลสมาชิกทั้งหมดและไม่สามารถกู้คืนได้
            </p>

            {deleteError && (
              <div
                role="alert"
                className="alert-error mt-4"
              >
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingProvider(null)}
                disabled={deleting}
                  className="secondary-button !min-h-10 !px-4 !py-2 text-sm"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                  className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-rose-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-600 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? 'กำลังลบ...' : 'ยืนยันการลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
