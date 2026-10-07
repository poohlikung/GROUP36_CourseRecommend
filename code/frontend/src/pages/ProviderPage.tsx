import { useEffect, useState } from 'react';
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
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            อนุมัติแล้ว
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            รอการอนุมัติ (Pending)
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            ระงับการใช้งาน
          </span>
        );
    }
  }

  function getRoleBadge(role: MemberRole) {
    switch (role) {
      case 'OWNER':
        return (
          <span className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
            Owner (เจ้าของ)
          </span>
        );
      case 'EDITOR':
        return (
          <span className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
            Editor (ผู้ดูแล)
          </span>
        );
    }
  }

  if (managingCoursesProvider) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-10">
        <CourseManagementSection
          provider={managingCoursesProvider}
          onBack={() => {
            setManagingCoursesProvider(null);
            loadProviders();
          }}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            ผู้ให้บริการคอร์ส (Provider Management)
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            จัดการสถาบันและผู้ให้บริการคอร์สเรียนที่คุณเป็นสมาชิกหรือเจ้าของ
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreateModal(true);
            setCreateError(undefined);
          }}
          className="inline-flex items-center justify-center rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
        >
          ลงทะเบียน Provider ใหม่
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div
          role="status"
          className="mt-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-xs font-semibold underline hover:no-underline"
          >
            ปิด
          </button>
        </div>
      )}

      {listError && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
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
        <div className="mt-12 text-center text-slate-500" role="status">
          กำลังโหลดข้อมูลผู้ให้บริการคอร์ส...
        </div>
      )}

      {/* Empty State */}
      {!loading && !listError && providers.length === 0 && (
        <div className="mt-12 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h2 className="text-base font-semibold text-slate-900">ยังไม่มี Provider ที่คุณดูแล</h2>
          <p className="mt-2 text-sm text-slate-500">
            คุณสามารถลงทะเบียนสถาบันหรือองค์กรของคุณเพื่อเริ่มเพิ่มคอร์สเรียนได้ทันที
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(true);
                setCreateError(undefined);
              }}
              className="inline-flex items-center rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-600"
            >
              ลงทะเบียน Provider ใหม่
            </button>
          </div>
        </div>
      )}

      {/* Provider List */}
      {!loading && !listError && providers.length > 0 && (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {providers.map((p) => (
            <article
              key={p.id}
              aria-labelledby={`provider-title-${p.id}`}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 id={`provider-title-${p.id}`} className="text-lg font-bold text-slate-900">{p.name}</h2>
                    <p className="font-mono text-xs text-slate-500">slug: {p.slug}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {getStatusBadge(p.status)}
                    {getRoleBadge(p.role)}
                  </div>
                </div>

                <p className="mt-3 line-clamp-3 text-sm text-slate-600">
                  {p.description || 'ไม่มีคำอธิบาย'}
                </p>

                {isSafeHttpUrl(p.websiteUrl) && (
                  <p className="mt-2 text-xs">
                    <a
                      href={p.websiteUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-cyan-700 hover:underline"
                    >
                      {p.websiteUrl}
                    </a>
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
                {(p.role === 'OWNER' || p.role === 'EDITOR') && (
                  <button
                    type="button"
                    onClick={() => setManagingCoursesProvider(p)}
                    className="rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-cyan-600"
                  >
                    จัดการคอร์สเรียน
                  </button>
                )}

                {(p.role === 'OWNER' || p.role === 'EDITOR') && (
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(p)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    ลบ Provider
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal: Create Provider */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900">ลงทะเบียน Provider ใหม่</h2>
            <p className="mt-1 text-xs text-slate-500">
              กรอกข้อมูลเพื่อขออนุมัติเป็นผู้ให้บริการคอร์สเรียนในระบบ
            </p>

            {createError ? (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
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
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <FieldError message={getFieldError(createError, 'name')} />
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
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  ใช้ภาษาอังกฤษพิมพ์เล็ก ตัวเลข และขีดกลาง (-) เท่านั้น
                </p>
                <FieldError message={getFieldError(createError, 'slug')} />
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
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <FieldError message={getFieldError(createError, 'description')} />
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
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <FieldError message={getFieldError(createError, 'websiteUrl')} />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-cyan-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-cyan-600 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900">แก้ไขข้อมูล Provider</h2>
            <p className="mt-1 text-xs text-slate-500">
              แก้ไขข้อมูลสถาบัน ({editingProvider.slug})
            </p>

            {updateError ? (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
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
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <FieldError message={getFieldError(updateError, 'name')} />
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
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <FieldError message={getFieldError(updateError, 'slug')} />
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
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <FieldError message={getFieldError(updateError, 'description')} />
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
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <FieldError message={getFieldError(updateError, 'websiteUrl')} />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingProvider(null)}
                  disabled={updating}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="rounded-lg bg-cyan-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-cyan-600 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">ยืนยันการลบ Provider</h2>
            <p className="mt-2 text-sm text-slate-600">
              คุณแน่ใจหรือไม่ว่าต้องการลบสถาบัน{' '}
              <span className="font-semibold text-slate-900">{deletingProvider.name}</span>?
              การกระทำนี้จะลบข้อมูลสมาชิกทั้งหมดและไม่สามารถกู้คืนได้
            </p>

            {deleteError && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
              >
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingProvider(null)}
                disabled={deleting}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 disabled:opacity-50"
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
