import { useEffect, useState } from 'react';
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

  const canManage = provider.role === 'OWNER' || provider.role === 'EDITOR';

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
    loadCourses();
    getCatalogOptions()
      .then(({ platforms: p, categories: c }) => {
        setPlatforms(p);
        setCategories(c);
        if (p.length > 0 && formPlatformId === 0) {
          setFormPlatformId(p[0].id);
        }
      })
      .catch(() => {
        // Option load failure will be apparent if dropdowns are empty
      });
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
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleSubmitForReview(courseId: number) {
    setSubmittingCourseId(courseId);
    try {
      await courseApi.submit(courseId);
      setSuccessMessage('ส่งคอร์สให้ผู้ดูแลระบบตรวจสอบแล้ว (สถานะ Pending)');
      loadCourses();
    } catch (err) {
      setError(getErrorMessage(err));
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
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            แบบร่าง (Draft)
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            รอตรวจสอบ (Pending)
          </span>
        );
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            เผยแพร่แล้ว (Published)
          </span>
        );
      case 'REVISION_REQUESTED':
        return (
          <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
            ต้องแก้ไข (Revision Requested)
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            ระงับการใช้งาน
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
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
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center text-xs font-medium text-cyan-700 hover:underline"
          >
            ← กลับไปยังรายการ Provider
          </button>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            คอร์สเรียนของ {provider.name}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Provider Slug: <span className="font-mono">{provider.slug}</span>
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
          >
            เพิ่มคอร์สใหม่
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <div
          role="status"
          className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
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

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
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
        <div className="py-12 text-center text-sm text-slate-500" role="status">
          กำลังโหลดรายการคอร์ส...
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && courses.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h3 className="text-base font-semibold text-slate-900">ยังไม่มีคอร์สเรียนใน Provider นี้</h3>
          <p className="mt-2 text-sm text-slate-500">
            เริ่มต้นสร้างคอร์สแรกของคุณเพื่อเสนอต่อผู้เรียนในระบบ
          </p>
          {canManage && (
            <div className="mt-5">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-600"
              >
                เพิ่มคอร์สใหม่
              </button>
            </div>
          )}
        </div>
      )}

      {/* Course List Cards */}
      {!loading && !error && courses.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2">
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{course.title}</h3>
                    <p className="font-mono text-xs text-slate-500">slug: {course.slug}</p>
                  </div>
                  <div>{getCourseStatusBadge(course.status)}</div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-medium">
                    {course.platformName}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-medium">
                    {course.level}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-medium">
                    {course.language}
                  </span>
                  {course.effortHours && (
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-medium">
                      {course.effortHours} ชม.
                    </span>
                  )}
                  <span className="rounded bg-slate-100 px-2 py-0.5">
                    {formatPrice(course)}
                  </span>
                </div>

                {course.description && (
                  <p className="mt-3 line-clamp-2 text-xs text-slate-600">
                    {course.description}
                  </p>
                )}

                {course.categories && course.categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {course.categories.map((cat) => (
                      <span
                        key={cat.id}
                        className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[11px] font-medium text-cyan-800"
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {canManage && (
                <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  {/* Submit button: only for DRAFT or REVISION_REQUESTED */}
                  {(course.status === 'DRAFT' || course.status === 'REVISION_REQUESTED') && (
                    <button
                      type="button"
                      onClick={() => handleSubmitForReview(course.id)}
                      disabled={submittingCourseId === course.id}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {submittingCourseId === course.id ? 'กำลังส่ง...' : 'ส่งตรวจ'}
                    </button>
                  )}

                  {/* Edit button */}
                  <button
                    type="button"
                    onClick={() => openEditModal(course)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    แก้ไข
                  </button>

                  {/* Delete button: only for DRAFT */}
                  {course.status === 'DRAFT' && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeletingCourse(course);
                        setDeleteError('');
                      }}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      ลบ
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create / Edit Course */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold text-slate-900">
              {editingCourse ? 'แก้ไขข้อมูลคอร์สเรียน' : 'เพิ่มคอร์สเรียนใหม่ (Draft)'}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {editingCourse
                ? `แก้ไขคอร์ส ${editingCourse.slug}`
                : `สร้างดราฟต์คอร์สใหม่ภายใต้สถาบัน ${provider.name}`}
            </p>

            {formError ? (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
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
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <FieldError message={getFieldError(formError, 'title')} />
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
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    อักษรพิมพ์เล็ก ตัวเลข และขีดกลาง (-)
                  </p>
                  <FieldError message={getFieldError(formError, 'slug')} />
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
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    {platforms.map((plat) => (
                      <option key={plat.id} value={plat.id}>
                        {plat.name}
                      </option>
                    ))}
                  </select>
                  <FieldError message={getFieldError(formError, 'platformId')} />
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
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <FieldError message={getFieldError(formError, 'url')} />
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
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="BEGINNER">BEGINNER (เริ่มต้น)</option>
                    <option value="INTERMEDIATE">INTERMEDIATE (ปานกลาง)</option>
                    <option value="ADVANCED">ADVANCED (ขั้นสูง)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="course-language" className="block text-xs font-semibold text-slate-700">
                    ภาษาที่ใช้สอน
                  </label>
                  <select
                    id="course-language"
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value as CourseLanguage)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="THAI">ภาษาไทย</option>
                    <option value="ENGLISH">ภาษาอังกฤษ</option>
                    <option value="SUB_THAI">ซับไตเติลภาษาไทย</option>
                  </select>
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
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <FieldError message={getFieldError(formError, 'effortHours')} />
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
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="FREE">ฟรี (Free)</option>
                    <option value="ONE_TIME">ชำระครั้งเดียว (One-time)</option>
                    <option value="SUBSCRIPTION">รายเดือน/สมาชิก (Subscription)</option>
                  </select>
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
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm disabled:bg-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <FieldError message={getFieldError(formError, 'amount')} />
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
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  หมวดหมู่คอร์สเรียน (Categories)
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const isSelected = formCategoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          isSelected
                            ? 'bg-cyan-700 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

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
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formSubmitting}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-lg bg-cyan-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-cyan-600 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">ยืนยันการลบคอร์สดราฟต์</h3>
            <p className="mt-2 text-sm text-slate-600">
              คุณแน่ใจหรือไม่ว่าต้องการลบคอร์ส{' '}
              <span className="font-semibold text-slate-900">{deletingCourse.title}</span>?
            </p>
            <p className="mt-1 text-xs text-slate-500">
              (หมายเหตุ: สามารถลบได้เฉพาะคอร์สที่อยู่ในสถานะ Draft และไม่มีรีวิวในระบบเท่านั้น)
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
                onClick={() => setDeletingCourse(null)}
                disabled={deleteSubmitting}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteSubmitting}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 disabled:opacity-50"
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
