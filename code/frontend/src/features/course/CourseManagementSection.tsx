import { useEffect, useRef, useState } from 'react';
import { getErrorMessage, getFieldError } from '../../api/client';
import { FieldError } from '../../components/AuthCard';
import { getCatalogOptions } from '../catalog/catalogApi';
import type { CatalogOption } from '../catalog/types';
import type { MyProvider } from '../provider/types';
import { courseApi } from './courseApi';
import type {
  CourseDetail,
  CourseLanguage,
  CourseLevel,
  CourseStatus,
  CreateCoursePayload,
  PaymentType,
  UpdateCoursePayload,
} from './types';

interface CourseManagementSectionProps {
  provider: MyProvider;
  onBack: () => void;
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

export function CourseManagementSection({ provider, onBack }: CourseManagementSectionProps) {
  const [courses, setCourses] = useState<CourseDetail[]>([]);
  const [platforms, setPlatforms] = useState<CatalogOption[]>([]);
  const [categories, setCategories] = useState<CatalogOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseDetail | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<unknown>();

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formPlatformId, setFormPlatformId] = useState<number>(0);
  const [formLevel, setFormLevel] = useState<CourseLevel>('BEGINNER');
  const [formLanguage, setFormLanguage] = useState<CourseLanguage>('THAI');
  const [formEffortHours, setFormEffortHours] = useState<string>('');
  const [formPaymentType, setFormPaymentType] = useState<PaymentType>('FREE');
  const [formAmount, setFormAmount] = useState<string>('0');
  const [formCurrency, setFormCurrency] = useState('THB');
  const [formCategoryIds, setFormCategoryIds] = useState<number[]>([]);

  // Delete modal state
  const [deletingCourse, setDeletingCourse] = useState<CourseDetail | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Submit action state
  const [submittingCourseId, setSubmittingCourseId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');
  const sectionHeadingRef = useRef<HTMLHeadingElement>(null);
  const formDialogRef = useDialogFocusTrap(isModalOpen, () => setIsModalOpen(false), !formSubmitting, sectionHeadingRef);
  const deleteDialogRef = useDialogFocusTrap(deletingCourse !== null, () => setDeletingCourse(null), !deleteSubmitting, sectionHeadingRef);
  const titleError = getFieldError(formError, 'title');
  const slugError = getFieldError(formError, 'slug');
  const descriptionError = getFieldError(formError, 'description');
  const urlError = getFieldError(formError, 'url');
  const platformError = getFieldError(formError, 'platformId');
  const levelError = getFieldError(formError, 'level');
  const languageError = getFieldError(formError, 'language');
  const effortError = getFieldError(formError, 'effortHours');
  const paymentTypeError = getFieldError(formError, 'paymentType');
  const amountError = getFieldError(formError, 'amount');
  const currencyError = getFieldError(formError, 'currency');
  const categoriesError = getFieldError(formError, 'categoryIds');

  useEffect(() => {
    sectionHeadingRef.current?.focus();
  }, []);

  const canManage = provider.role === 'OWNER' || provider.role === 'EDITOR';
  const canSubmitForReview = provider.status === 'ACTIVE';

  function loadCourses() {
    setLoading(true);
    setError('');
    courseApi
      .listByProvider(provider.id)
      .then((data) => {
        setCourses(data);
      })
      .catch((err) => {
        setError(getErrorMessage(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    const controller = new AbortController();
    loadCourses();
    getCatalogOptions(controller.signal)
      .then(({ platforms: p, categories: c }) => {
        if (controller.signal.aborted) return;
        setPlatforms(p);
        setCategories(c);
        setFormPlatformId((current) => current === 0 && p.length > 0 ? p[0].id : current);
      })
      .catch(() => {
        // Option load failure will be apparent if dropdowns are empty
      });
    return () => controller.abort();
  }, [provider.id]);

  function openCreateModal() {
    setEditingCourse(null);
    setFormTitle('');
    setFormSlug('');
    setFormDescription('');
    setFormUrl('');
    setFormPlatformId(platforms.length > 0 ? platforms[0].id : 0);
    setFormLevel('BEGINNER');
    setFormLanguage('THAI');
    setFormEffortHours('');
    setFormPaymentType('FREE');
    setFormAmount('0');
    setFormCurrency('THB');
    setFormCategoryIds([]);
    setFormError(undefined);
    setIsModalOpen(true);
  }

  function openEditModal(course: CourseDetail) {
    setEditingCourse(course);
    setFormTitle(course.title);
    setFormSlug(course.slug);
    setFormDescription(course.description ?? '');
    setFormUrl(course.url);
    setFormPlatformId(course.platformId);
    setFormLevel(course.level);
    setFormLanguage(course.language);
    setFormEffortHours(course.effortHours ? String(course.effortHours) : '');
    setFormPaymentType(course.paymentType);
    setFormAmount(course.amount !== null && course.amount !== undefined ? String(course.amount) : '');
    setFormCurrency(course.currency || 'THB');
    setFormCategoryIds(course.categories.map((c) => c.id));
    setFormError(undefined);
    setIsModalOpen(true);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    setFormSubmitting(true);

    const amountNum =
      formPaymentType === 'FREE'
        ? 0
        : formAmount !== '' && !isNaN(parseFloat(formAmount))
          ? parseFloat(formAmount)
          : undefined;
    const effortNum = formEffortHours ? parseInt(formEffortHours, 10) : undefined;

    try {
      if (editingCourse) {
        const payload: UpdateCoursePayload = {
          title: formTitle.trim(),
          slug: formSlug.trim().toLowerCase(),
          description: formDescription.trim(),
          url: formUrl.trim(),
          platformId: formPlatformId,
          level: formLevel,
          language: formLanguage,
          effortHours: effortNum,
          paymentType: formPaymentType,
          amount: amountNum,
          currency: formCurrency.trim() || 'THB',
          categoryIds: formCategoryIds,
        };
        await courseApi.update(editingCourse.id, payload);
        setSuccessMessage('แก้ไขข้อมูลคอร์สเรียนสำเร็จ');
      } else {
        const payload: CreateCoursePayload = {
          title: formTitle.trim(),
          slug: formSlug.trim().toLowerCase(),
          description: formDescription.trim(),
          url: formUrl.trim(),
          platformId: formPlatformId,
          level: formLevel,
          language: formLanguage,
          effortHours: effortNum,
          paymentType: formPaymentType,
          amount: amountNum,
          currency: formCurrency.trim() || 'THB',
          categoryIds: formCategoryIds,
        };
        await courseApi.create(provider.id, payload);
        setSuccessMessage('สร้างคอร์สใหม่ในสถานะ Draft สำเร็จ');
      }
      setIsModalOpen(false);
      loadCourses();
    } catch (err) {
      setFormError(err);
      focusFirstFieldError(err, [
        ['title', 'course-title'],
        ['slug', 'course-slug'],
        ['platformId', 'course-platform'],
        ['url', 'course-url'],
        ['level', 'course-level'],
        ['language', 'course-language'],
        ['effortHours', 'course-effort'],
        ['paymentType', 'course-payment-type'],
        ['amount', 'course-amount'],
        ['currency', 'course-currency'],
        ['categoryIds', 'course-categories'],
        ['description', 'course-desc'],
      ]);
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleSubmitForReview(courseId: number) {
    setSubmittingCourseId(courseId);
    setActionError('');
    try {
      await courseApi.submit(courseId);
      setSuccessMessage('ส่งคอร์สให้ผู้ดูแลระบบตรวจสอบแล้ว (สถานะ Pending)');
      loadCourses();
    } catch (err) {
      // แยกจาก error ตอนโหลดรายการ เพื่อไม่ให้รายการคอร์สหายไป
      setActionError(getErrorMessage(err));
    } finally {
      setSubmittingCourseId(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingCourse) return;
    setDeleteSubmitting(true);
    setDeleteError('');
    try {
      await courseApi.delete(deletingCourse.id);
      setDeletingCourse(null);
      setSuccessMessage('ลบคอร์สดราฟต์สำเร็จ');
      loadCourses();
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setDeleteSubmitting(false);
    }
  }

  function toggleCategory(catId: number) {
    setFormCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  }

  function getCourseStatusBadge(status: CourseStatus) {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="status-chip border-amber-200 bg-amber-50 text-amber-800">
            แบบร่าง (Draft)
          </span>
        );
      case 'PENDING':
        return (
          <span className="status-chip border-blue-200 bg-blue-50 text-blue-800">
            รอตรวจสอบ (Pending)
          </span>
        );
      case 'PUBLISHED':
        return (
          <span className="status-chip border-emerald-200 bg-emerald-50 text-emerald-800">
            เผยแพร่แล้ว (Published)
          </span>
        );
      case 'REVISION_REQUESTED':
        return (
          <span className="status-chip border-orange-200 bg-orange-50 text-orange-800">
            ต้องแก้ไข (Revision Requested)
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="status-chip border-slate-300 bg-slate-100 text-slate-700">
            ระงับการใช้งาน
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="status-chip border-slate-200 bg-slate-50 text-slate-500">
            เก็บถาวร (Archived)
          </span>
        );
    }
  }

  function formatPrice(course: CourseDetail) {
    if (course.paymentType === 'FREE') {
      return <span className="font-semibold text-emerald-700">ฟรี</span>;
    }
    if (course.amount === null || course.amount === undefined) {
      return <span className="font-semibold text-slate-500">ดูราคาที่เว็บไซต์</span>;
    }
    const amt = course.amount.toLocaleString();
    const typeLabel = course.paymentType === 'SUBSCRIPTION' ? '/ เดือน' : '';
    return (
      <span className="font-semibold text-slate-900">
        {amt} {course.currency} {typeLabel}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <header className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-[0_28px_70px_rgba(4,20,46,0.22)] sm:px-8">
        <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-blue-500/30 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-4 inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-bold text-cyan-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-4 focus:ring-white/10"
          >
            ← กลับไปยังรายการ Provider
          </button>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Course workspace</p>
          <h1 ref={sectionHeadingRef} tabIndex={-1} className="mt-2 text-2xl font-black tracking-[-0.03em] sm:text-3xl">
            คอร์สเรียนของ {provider.name}
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Provider Slug: <span className="font-mono">{provider.slug}</span>
          </p>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreateModal}
              className="primary-button shrink-0 !bg-white !text-blue-700 hover:!bg-blue-50"
            >
              <span aria-hidden="true">＋</span>
              เพิ่มคอร์สใหม่
            </button>
          )}
        </div>
      </header>

      {/* Notifications */}
      {successMessage && (
        <div
          role="status"
          className="alert-success flex items-center justify-between gap-4"
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

      {canManage && !canSubmitForReview && (
        <div
          role="note"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
        >
          Provider นี้ยังไม่ได้รับการอนุมัติ (สถานะไม่ใช่ Active) จึงยังส่งคอร์สเข้าตรวจไม่ได้
          แต่สามารถสร้างและแก้ไขคอร์สดราฟต์ได้ตามปกติ
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="alert-error flex items-center justify-between gap-4"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError('')}
            className="text-xs font-semibold underline hover:no-underline"
          >
            ปิด
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="alert-error"
        >
          {error}{' '}
          <button
            type="button"
            onClick={loadCourses}
            className="ml-2 font-semibold underline hover:no-underline"
          >
            ลองใหม่
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid gap-5 md:grid-cols-2" role="status" aria-label="กำลังโหลดรายการคอร์ส">
          <div className="skeleton-block h-64" />
          <div className="skeleton-block h-64" />
          <span className="sr-only">กำลังโหลดรายการคอร์ส...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && courses.length === 0 && (
        <div className="empty-state py-14">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-cyan-100 text-3xl text-cyan-800" aria-hidden="true">✦</div>
          <h2 className="mt-5 text-xl font-black text-slate-950">ยังไม่มีคอร์สเรียนใน Provider นี้</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            เริ่มต้นสร้างคอร์สแรกของคุณเพื่อเสนอต่อผู้เรียนในระบบ
          </p>
          {canManage && (
            <div className="mt-5">
              <button
                type="button"
                onClick={openCreateModal}
                className="primary-button"
              >
                เพิ่มคอร์สใหม่
              </button>
            </div>
          )}
        </div>
      )}

      {/* Course List Cards */}
      {!loading && !error && courses.length > 0 && (
        <section aria-label={`คอร์สเรียนของ ${provider.name}`} className="grid gap-5 md:grid-cols-2">
          {courses.map((course) => (
            <article
              key={course.id}
              aria-labelledby={`managed-course-title-${course.id}`}
              className="surface-card depth-card group relative flex min-h-80 flex-col justify-between overflow-hidden p-5 sm:p-6"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400" aria-hidden="true" />
              <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">{course.platformName}</p>
                    <h2 id={`managed-course-title-${course.id}`} className="mt-1 text-lg font-black tracking-tight text-slate-950">{course.title}</h2>
                    <p className="mt-1 truncate font-mono text-xs text-slate-500">slug: {course.slug}</p>
                  </div>
                  <div>{getCourseStatusBadge(course.status)}</div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-700">
                  <span className="status-chip border-slate-200 bg-slate-50">
                    {course.platformName}
                  </span>
                  <span className="status-chip border-slate-200 bg-slate-50">
                    {course.level}
                  </span>
                  <span className="status-chip border-slate-200 bg-slate-50">
                    {course.language}
                  </span>
                  {course.effortHours && (
                    <span className="status-chip border-slate-200 bg-slate-50">
                      {course.effortHours} ชม.
                    </span>
                  )}
                  <span className="status-chip border-slate-200 bg-slate-50">
                    {formatPrice(course)}
                  </span>
                </div>

                {course.description && (
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                    {course.description}
                  </p>
                )}

                {course.moderationReason && (
                  <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                    เหตุผลจาก Admin: {course.moderationReason}
                  </p>
                )}

                {course.categories && course.categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {course.categories.map((cat) => (
                      <span
                        key={cat.id}
                    className="status-chip border-cyan-200 bg-cyan-50 !px-2.5 !py-1 text-[11px] text-cyan-800"
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {canManage && (
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-4">
                  {/* Submit button: only for DRAFT or REVISION_REQUESTED */}
                  {(course.status === 'DRAFT' || course.status === 'REVISION_REQUESTED') && (
                    <button
                      type="button"
                      onClick={() => handleSubmitForReview(course.id)}
                      disabled={!canSubmitForReview || submittingCourseId === course.id}
                      title={canSubmitForReview ? undefined : 'Provider ต้องได้รับการอนุมัติก่อนส่งคอร์สเข้าตรวจ'}
                      className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submittingCourseId === course.id ? 'กำลังส่ง...' : 'ส่งตรวจ'}
                    </button>
                  )}

                  {/* Edit button: backend ไม่อนุญาตให้แก้คอร์ส SUSPENDED/ARCHIVED */}
                  {course.status !== 'SUSPENDED' && course.status !== 'ARCHIVED' && (
                    <button
                      type="button"
                      onClick={() => openEditModal(course)}
                      className="secondary-button !min-h-10 !px-4 !py-2 text-sm"
                    >
                      แก้ไข
                    </button>
                  )}

                  {/* Delete button: only for DRAFT */}
                  {course.status === 'DRAFT' && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeletingCourse(course);
                        setDeleteError('');
                      }}
                      className="inline-flex min-h-10 items-center justify-center rounded-2xl px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-4 focus:ring-rose-100"
                    >
                      ลบ
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      {/* Modal: Create / Edit Course */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div ref={formDialogRef} role="dialog" aria-modal="true" aria-labelledby="course-form-title" tabIndex={-1} className="modal-card max-w-2xl">
            <p className="eyebrow">Course editor</p>
            <h2 id="course-form-title" className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              {editingCourse ? 'แก้ไขข้อมูลคอร์สเรียน' : 'เพิ่มคอร์สเรียนใหม่ (Draft)'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {editingCourse
                ? `แก้ไขคอร์ส ${editingCourse.slug}`
                : `สร้างดราฟต์คอร์สใหม่ภายใต้สถาบัน ${provider.name}`}
            </p>

            {editingCourse &&
            (editingCourse.status === 'PUBLISHED' || editingCourse.status === 'PENDING') ? (
              <div
                role="note"
                className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
              >
                เมื่อบันทึกการแก้ไข คอร์สนี้จะกลับเป็นสถานะ Draft
                {editingCourse.status === 'PUBLISHED' ? ' และจะไม่แสดงในหน้าค้นหาคอร์ส' : ''} จนกว่าจะส่งตรวจและได้รับอนุมัติอีกครั้ง
              </div>
            ) : null}

            {formError ? (
              <div
                role="alert"
                className="alert-error mt-4"
              >
                {getErrorMessage(formError)}
              </div>
            ) : null}

            <form onSubmit={handleFormSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="course-title" className="block text-xs font-semibold text-slate-700">
                  ชื่อคอร์สเรียน <span className="text-rose-500">*</span>
                </label>
                <input
                  id="course-title"
                  type="text"
                  required
                  maxLength={200}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="เช่น Complete Web Development Bootcamp"
                  aria-invalid={Boolean(titleError)}
                  aria-describedby={titleError ? 'course-title-error' : undefined}
                  className="form-input text-sm"
                />
                <div id="course-title-error"><FieldError message={titleError} /></div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="course-slug" className="block text-xs font-semibold text-slate-700">
                    URL Slug <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="course-slug"
                    type="text"
                    required
                    minLength={3}
                    maxLength={100}
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="web-dev-bootcamp"
                    aria-invalid={Boolean(slugError)}
                    aria-describedby={slugError ? 'course-slug-help course-slug-error' : 'course-slug-help'}
                    className="form-input text-sm"
                  />
                  <p id="course-slug-help" className="mt-1 text-[11px] text-slate-500">
                    อักษรพิมพ์เล็ก ตัวเลข และขีดกลาง (-)
                  </p>
                  <div id="course-slug-error"><FieldError message={slugError} /></div>
                </div>

                <div>
                  <label htmlFor="course-platform" className="block text-xs font-semibold text-slate-700">
                    แพลตฟอร์ม <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="course-platform"
                    required
                    value={formPlatformId}
                    onChange={(e) => setFormPlatformId(Number(e.target.value))}
                    aria-invalid={Boolean(platformError)}
                    aria-describedby={platformError ? 'course-platform-error' : undefined}
                    className="form-input text-sm"
                  >
                    {platforms.map((plat) => (
                      <option key={plat.id} value={plat.id}>
                        {plat.name}
                      </option>
                    ))}
                  </select>
                  <div id="course-platform-error"><FieldError message={platformError} /></div>
                </div>
              </div>

              <div>
                <label htmlFor="course-url" className="block text-xs font-semibold text-slate-700">
                  ลิงก์คอร์สเรียน (URL) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="course-url"
                  type="url"
                  required
                  maxLength={255}
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://example.com/course"
                  aria-invalid={Boolean(urlError)}
                  aria-describedby={urlError ? 'course-url-error' : undefined}
                  className="form-input text-sm"
                />
                <div id="course-url-error"><FieldError message={urlError} /></div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="course-level" className="block text-xs font-semibold text-slate-700">
                    ระดับความยาก
                  </label>
                  <select
                    id="course-level"
                    value={formLevel}
                    onChange={(e) => setFormLevel(e.target.value as CourseLevel)}
                    aria-invalid={Boolean(levelError)}
                    aria-describedby={levelError ? 'course-level-error' : undefined}
                    className="form-input text-sm"
                  >
                    <option value="BEGINNER">BEGINNER (เริ่มต้น)</option>
                    <option value="INTERMEDIATE">INTERMEDIATE (ปานกลาง)</option>
                    <option value="ADVANCED">ADVANCED (ขั้นสูง)</option>
                  </select>
                  <div id="course-level-error"><FieldError message={levelError} /></div>
                </div>

                <div>
                  <label htmlFor="course-language" className="block text-xs font-semibold text-slate-700">
                    ภาษาที่ใช้สอน
                  </label>
                  <select
                    id="course-language"
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value as CourseLanguage)}
                    aria-invalid={Boolean(languageError)}
                    aria-describedby={languageError ? 'course-language-error' : undefined}
                    className="form-input text-sm"
                  >
                    <option value="THAI">ภาษาไทย</option>
                    <option value="ENGLISH">ภาษาอังกฤษ</option>
                    <option value="SUB_THAI">ซับไตเติลภาษาไทย</option>
                  </select>
                  <div id="course-language-error"><FieldError message={languageError} /></div>
                </div>

                <div>
                  <label htmlFor="course-effort" className="block text-xs font-semibold text-slate-700">
                    ระยะเวลาเรียน (ชั่วโมง)
                  </label>
                  <input
                    id="course-effort"
                    type="number"
                    min={1}
                    value={formEffortHours}
                    onChange={(e) => setFormEffortHours(e.target.value)}
                    placeholder="เช่น 20"
                    aria-invalid={Boolean(effortError)}
                    aria-describedby={effortError ? 'course-effort-error' : undefined}
                    className="form-input text-sm"
                  />
                  <div id="course-effort-error"><FieldError message={effortError} /></div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="course-payment-type" className="block text-xs font-semibold text-slate-700">
                    รูปแบบราคา
                  </label>
                  <select
                    id="course-payment-type"
                    value={formPaymentType}
                    onChange={(e) => setFormPaymentType(e.target.value as PaymentType)}
                    aria-invalid={Boolean(paymentTypeError)}
                    aria-describedby={paymentTypeError ? 'course-payment-type-error' : undefined}
                    className="form-input text-sm"
                  >
                    <option value="FREE">ฟรี (Free)</option>
                    <option value="ONE_TIME">ชำระครั้งเดียว (One-time)</option>
                    <option value="SUBSCRIPTION">รายเดือน/สมาชิก (Subscription)</option>
                  </select>
                  <div id="course-payment-type-error"><FieldError message={paymentTypeError} /></div>
                </div>

                <div>
                  <label htmlFor="course-amount" className="block text-xs font-semibold text-slate-700">
                    จำนวนเงิน
                  </label>
                  <input
                    id="course-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={formPaymentType === 'FREE'}
                    value={formPaymentType === 'FREE' ? '0' : formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    aria-invalid={Boolean(amountError)}
                    aria-describedby={amountError ? 'course-amount-error' : undefined}
                    className="form-input text-sm"
                  />
                  <div id="course-amount-error"><FieldError message={amountError} /></div>
                </div>

                <div>
                  <label htmlFor="course-currency" className="block text-xs font-semibold text-slate-700">
                    สกุลเงิน
                  </label>
                  <input
                    id="course-currency"
                    type="text"
                    maxLength={10}
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    aria-invalid={Boolean(currencyError)}
                    aria-describedby={currencyError ? 'course-currency-error' : undefined}
                    className="form-input text-sm"
                  />
                  <div id="course-currency-error"><FieldError message={currencyError} /></div>
                </div>
              </div>

              <fieldset
                id="course-categories"
                tabIndex={-1}
                aria-invalid={Boolean(categoriesError)}
                aria-describedby={categoriesError ? 'course-categories-error' : undefined}
              >
                <legend className="block text-xs font-semibold text-slate-700">
                  หมวดหมู่คอร์สเรียน (Categories)
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const isSelected = formCategoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        aria-pressed={isSelected}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-[0_8px_18px_rgba(21,94,239,0.22)]'
                            : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
                <div id="course-categories-error"><FieldError message={categoriesError} /></div>
              </fieldset>

              <div>
                <label htmlFor="course-desc" className="block text-xs font-semibold text-slate-700">
                  คำอธิบายคอร์สเรียน
                </label>
                <textarea
                  id="course-desc"
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="รายละเอียดเนื้อหา สิ่งที่จะได้เรียนรู้..."
                  aria-invalid={Boolean(descriptionError)}
                  aria-describedby={descriptionError ? 'course-description-error' : undefined}
                  className="form-input text-sm"
                />
                <div id="course-description-error"><FieldError message={descriptionError} /></div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formSubmitting}
                  className="secondary-button !min-h-10 !px-4 !py-2 text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="primary-button !min-h-10 !px-4 !py-2 text-sm"
                >
                  {formSubmitting
                    ? 'กำลังบันทึก...'
                    : editingCourse
                    ? 'บันทึกการแก้ไข'
                    : 'สร้างคอร์สดราฟต์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deletingCourse && (
        <div className="modal-backdrop">
          <div ref={deleteDialogRef} role="dialog" aria-modal="true" aria-labelledby="delete-course-title" tabIndex={-1} className="modal-card max-w-md">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-100 text-xl text-rose-700" aria-hidden="true">!</div>
            <h2 id="delete-course-title" className="mt-4 text-xl font-black tracking-tight text-slate-950">ยืนยันการลบคอร์สดราฟต์</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              คุณแน่ใจหรือไม่ว่าต้องการลบคอร์ส{' '}
              <span className="font-semibold text-slate-900">{deletingCourse.title}</span>?
            </p>
            <p className="mt-1 text-xs text-slate-500">
              (หมายเหตุ: สามารถลบได้เฉพาะคอร์สที่อยู่ในสถานะ Draft และไม่มีรีวิวในระบบเท่านั้น)
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
                onClick={() => setDeletingCourse(null)}
                disabled={deleteSubmitting}
                className="secondary-button !min-h-10 !px-4 !py-2 text-sm"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteSubmitting}
                className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-rose-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-600 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteSubmitting ? 'กำลังลบ...' : 'ยืนยันการลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
