import { test, expect, loginUI, prepareCourse, getCourse } from '../support/fixtures';
import { createProviderUI, manageCourses, createCourseUI, submitCourseUI, decideCourseUI, searchCourse } from '../support/workflow';

test('provider registers and publishes a course through admin approval, then learner discovers it', async ({ actors }) => {
  const { provider, admin, learner } = actors;
  await loginUI(provider);
  await loginUI(admin);
  await loginUI(learner);
  const institute = await createProviderUI(provider);
  await manageCourses(provider, institute.name);
  const course = await createCourseUI(provider);
  await expect(provider.page.getByRole('article', { name: course.title }).getByRole('button', { name: 'ส่งตรวจ' })).toBeDisabled();
  await searchCourse(learner.page, course.title, false);

  await admin.page.goto('/admin');
  const instituteRow = admin.page.getByRole('article').filter({ has: admin.page.getByRole('heading', { name: institute.name, exact: true }) });
  const verification = admin.page.waitForResponse((r) => /\/verification-decisions$/.test(r.url()) && r.request().method() === 'POST');
  await instituteRow.getByRole('button', { name: 'รับรอง Provider', exact: true }).click();
  expect((await verification).status()).toBe(200);
  await expect(instituteRow).toHaveCount(0);
  await manageCourses(provider, institute.name);
  await submitCourseUI(provider.page, course.title);
  await searchCourse(learner.page, course.title, false);
  await decideCourseUI(admin.page, course.title, 'อนุมัติเผยแพร่');
  expect((await getCourse(provider, course.id)).status).toBe('PUBLISHED');
  const publicCourse = await searchCourse(learner.page, course.title, true);
  await learner.page.getByRole('combobox', { name: /^หมวดหมู่/ }).selectOption('programming');
  await learner.page.getByRole('combobox', { name: /^ภาษา/ }).selectOption('THAI');
  await learner.page.getByRole('combobox', { name: /^ระดับ/ }).selectOption('BEGINNER');
  const filtered = learner.page.waitForResponse((r) => {
    const url = new URL(r.url());
    return url.pathname === '/api/v1/courses' && url.searchParams.get('q') === course.title
      && url.searchParams.get('category') === 'programming' && url.searchParams.get('language') === 'THAI'
      && url.searchParams.get('level') === 'BEGINNER' && url.searchParams.get('paymentType') === 'FREE';
  });
  await learner.page.getByRole('combobox', { name: /^รูปแบบราคา/ }).selectOption('FREE');
  expect((await filtered).status()).toBe(200);
  await expect(publicCourse).toBeVisible();
  await expect(publicCourse.getByRole('link', { name: `ดูคอร์ส ${course.title}`, exact: true })).toHaveAttribute('href', course.url);
  await expect(publicCourse.getByRole('link', { name: `ดูคอร์ส ${course.title}`, exact: true })).toHaveAttribute('target', '_blank');
  const excluded = learner.page.waitForResponse((r) => {
    const url = new URL(r.url());
    return url.pathname === '/api/v1/courses' && url.searchParams.get('q') === course.title
      && url.searchParams.get('language') === 'ENGLISH';
  });
  await learner.page.getByRole('combobox', { name: /^ภาษา/ }).selectOption('ENGLISH');
  expect((await excluded).status()).toBe(200);
  await expect(publicCourse).toHaveCount(0);
});

test('admin requests revision, provider sees the reason and resubmits the edited draft', async ({ actors }) => {
  const { provider, admin, learner } = actors;
  const course = await prepareCourse(provider, admin, false);
  // Setup uses API; all submit/revision/edit/publish actions below go through UI.
  await provider.page.goto('/providers');
  await admin.page.goto('/admin');
  await loginUI(learner);
  await manageCourses(provider, provider.displayName);
  await submitCourseUI(provider.page, course.title);
  await decideCourseUI(admin.page, course.title, 'ขอให้แก้ไข', 'เพิ่มรายละเอียดบทเรียน');
  await manageCourses(provider, provider.displayName);
  const row = provider.page.getByRole('article', { name: course.title, exact: true });
  await expect(row).toContainText('ต้องแก้ไข (Revision Requested)');
  await expect(row).toContainText('เหตุผลจาก Admin: เพิ่มรายละเอียดบทเรียน');
  await searchCourse(learner.page, course.title, false);
  await row.getByRole('button', { name: 'แก้ไข', exact: true }).click();
  await provider.page.getByLabel('คำอธิบายคอร์สเรียน', { exact: true }).fill('เพิ่มรายละเอียดบทเรียนแล้ว');
  const update = provider.page.waitForResponse((r) => r.url().endsWith(`/api/v1/courses/${course.id}`) && r.request().method() === 'PUT');
  await provider.page.getByRole('button', { name: 'บันทึกการแก้ไข', exact: true }).click();
  expect((await update).status()).toBe(200);
  await expect(row).toContainText('เพิ่มรายละเอียดบทเรียนแล้ว');
  await submitCourseUI(provider.page, course.title);
  await decideCourseUI(admin.page, course.title, 'อนุมัติเผยแพร่');
  await expect(await searchCourse(learner.page, course.title, true)).toContainText('เพิ่มรายละเอียดบทเรียนแล้ว');
});
