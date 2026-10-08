# Requirement Matrix — CourseHub (คอร์สดีบอกต่อ)

ตารางนี้แมปข้อกำหนดจากใบงาน CP353002 และ use case ของระบบ เข้ากับ feature, task ในตารางงานทีม, หลักฐานใน repository และเกณฑ์ตรวจรับ

- สถานะ Task 21 และรายการที่ปรับด้านล่างอ้างอิง branch `sorawit_6733800648_01` ณ วันที่ 8 ตุลาคม 2026; แถวอื่นที่ไม่ได้แก้ยังเป็นบันทึกเดิมจาก branch ก่อนหน้า
- Matcher backend และ frontend quiz/results มี implementation บน branch นี้ (`CourseMatcherController`, `MatcherPage`, `test/frontend/matcher-flow.test.tsx`)
- เลข Task ตรงกับตาราง "งานทีม CourseHub • 30 งาน"
- สถานะ: ✅ มีหลักฐานใน repo แล้ว · 🟡 ทำแล้วบางส่วน · ⬜ ยังไม่เริ่ม
- ต้องอัปเดตสถานะทุกครั้งที่งานที่เกี่ยวข้อง merge เข้า `develop`
- เพิ่มหลักฐาน Task 22 วันที่ 7 ตุลาคม 2026 ใน branch `supawat_6733800622_01` สำหรับ PR เข้า develop: Playwright E2E learner/provider/admin และรายงานผลจริง
- เพิ่มหลักฐาน Task 23: `code/frontend/vercel.json`, startup/session loading/retry, [คู่มือ Vercel](step23-vercel-guide.md) และ [รายงานทดสอบ](test-reports/step23-vercel.md); ยังไม่ยืนยัน Frontend URL หรือ HTTPS cookie บน Vercel จริง

## 1. ข้อกำหนดจากใบงาน

| ข้อใบงาน | ข้อกำหนด | Task | หลักฐานใน repo | เกณฑ์ตรวจรับ | สถานะ |
| --- | --- | --- | --- | --- | :---: |
| 2 | Spring Boot 3.x, Java 17+, Maven | 07 | `code/backend/pom.xml` (Spring Boot 3.5, Java 21), `mvnw` | build ผ่านจาก clone ใหม่ | ✅ |
| 2 | SQL + Spring Data JPA | 06 | `repository/`, `domain/entity/`, PostgreSQL | entity map กับ schema ผ่าน `ddl-auto=validate` | ✅ |
| 2 | REST API + Swagger/OpenAPI | 03, 25 | `springdoc` ใน `pom.xml`, `https://coursehub-backend-ahz2.onrender.com/swagger-ui.html` | เปิด Swagger UI ได้ทั้ง local และ public URL | ✅ |
| 2 | Frontend (React) | 07 | `code/frontend/` (React + TypeScript + Vite) | หน้าเว็บเรียก API จริง | ✅ |
| 2 | JUnit 5 + Mockito (+ Spring Boot Test) | ทุก task | `test/backend/unit`, `test/backend/integration` | เทสต์ผ่านใน CI | 🟡 มี JUnit/Spring Boot Test/MockMvc/Testcontainers; Mockito unit test มีใน Course (`CourseServiceImplMockitoTests`) ส่วน feature อื่นยังไม่มี |
| 2, 11 | Deploy บน Cloud | 07, 23, 25 | Backend: `https://coursehub-backend-ahz2.onrender.com` (Render, Docker) + PostgreSQL บน Neon; Flyway V1–V2 migrate สำเร็จ, `GET /api/v1/system/liveness` ตอบ 200 | public URL ใช้งานได้วันนำเสนอ | 🟡 backend และ DB ใช้งานได้แล้ว ยังไม่มี frontend บน Vercel และยังไม่มี URL ใน README |
| 3 | Layered Architecture ห้ามข้าม layer | 03 | Controller → Service → Repository ในทุก feature, `doc/decisions/0001-*.md` | ไม่มี Controller เรียก Repository ตรง | ✅ |
| 4 | SOLID พร้อม `doc/solid-analysis.md` | 21 | `doc/solid-analysis.md` อ้าง source/test รายบรรทัดครบ S/O/L/I/D และ contract ของ `ScoringStrategy` | ระบุไฟล์/บรรทัด/เหตุผลครบ 5 ข้อ | ✅ เอกสารและ unit tests ที่เกี่ยวข้องมีหลักฐาน |
| 5.1 | Layered, MVC, Repository, Service Layer, DTO + Mapper, DI | 03, 21 | `doc/decisions/0001-*.md`, DTO ใน `*/dto/`, Mapper (`CourseMapper`, `ProviderMapper`, `ProfileMapper`), constructor injection | อธิบายใน `doc/design-patterns.md` | 🟡 มีในโค้ด ยังไม่มีเอกสารรวม |
| 5.2 | GoF กลุ่มเดียว ≥ 3 แบบ (Behavioral: Strategy, State, Observer) | 15, 17, 19 | `doc/design-patterns.md`, `doc/decisions/0003-*.md`, class diagrams และรายงาน Task 15/17/19 | implementation + tests + class diagram | 🟡 ครบหลักฐานใน branch supawat; Task 17/19 รอรวมเข้า develop |
| 6 | ≥ 6 ตาราง | 06 | `V1__init_schema.sql` (12 ตาราง) | `FlywayMigrationIntegrationTests` | ✅ |
| 6 | One-to-One | 05, 06 | `users`–`user_profiles`, `courses`–`course_prices` (shared PK) | constraint ทดสอบบน PostgreSQL | ✅ `CourseSchemaPostgresIntegrationTests` |
| 6 | One-to-Many / Many-to-Many | 06 | `providers`→`courses`, `course_categories` | FK และ cascade ตรงตามออกแบบ | ✅ |
| 6 | FK, index, cascade/fetch มีเหตุผล | 06 | FK/CHECK/index ใน V1, `@ManyToOne(fetch = LAZY)` | ลบ Provider ที่มีคอร์สไม่ได้, ลบคอร์สแล้ว price/category link หาย | ✅ `CourseSchemaPostgresIntegrationTests` |
| 6 | ER Diagram + Data Dictionary | 06, 21 | `doc/diagrams/er-diagram.mmd`, `er-diagram.png`, `doc/data-dictionary.md` ตรวจ 12 ตารางกับ Flyway V1–V4 | ตรงกับ migration ทุกตาราง/คอลัมน์ | ✅ เอกสารเทียบ SQL และ render แล้ว; PostgreSQL integration ยังต้องมี Docker |
| 6 | Migration script | 06 | Flyway `V1__init_schema.sql` – `V4__review_moderation.sql` | migrate ฐานข้อมูลว่างได้ | ✅ |
| 6, 11 | Backup/restore + migration rehearsal | 24 | `code/scripts/db/backup-restore.ps1`, `BackupRestoreRehearsalIntegrationTests`, `doc/task24-backup-restore-guide.md` | restore ลงฐานว่างแล้วจำนวนแถว, Flyway history และ sequence ตรงกับต้นทาง | ✅ rehearsal อัตโนมัติผ่านใน CI และ backup/restore จาก Neon จริงผ่าน 13/13 ตาราง (`doc/test-reports/task24-backup-restore.md`) |
| 7 | CRUD ≥ 2 resource | 09, 11 | Provider CRUD, Course CRUD | สร้าง/อ่าน/แก้/ลบสำเร็จ และลบที่ต้องห้ามได้ 409 | ✅ |
| 7 | HTTP status ถูกต้อง (200/201/204/400/404/409/500) | 08, 09, 11 | `GlobalExceptionHandler`, `doc/api-contract.md` | MockMvc tests ตรวจ status | ✅ |
| 7 | Resource-based endpoint | 03 | `/api/v1/providers/{providerId}/courses` | ตาม `doc/api-contract.md` | ✅ |
| 7 | Global Exception Handler + error format | 08 | `exception/GlobalExceptionHandler.java`, `common/ApiErrorResponse.java` | `ApiErrorContractIntegrationTests` | ✅ |
| 7 | Validation (`@Valid`) | 08 | DTO ทุกตัวใช้ Bean Validation | 400 พร้อม `fieldErrors` | ✅ |
| 7 | Pagination & Sorting ≥ 1 endpoint | 12 | `GET /api/v1/courses?page&size&sort` (`CatalogController`) | `CatalogCourseIntegrationTests` | ✅ |
| 8 | Branch ชื่อ_รหัส_section, PR มี reviewer | ทุกคน | branch `*_67338007xx_01`, PR บน GitHub | PR ทุกอันมี reviewer ≥ 1 | ✅ |
| 9 | โฟลเดอร์ `code/`, `test/`, `doc/`, `img/` | 07 | root ของ repo, test ถูกค้นจาก `test/` ผ่าน `build-helper-maven-plugin` | CI รันเทสต์จาก `test/` | ✅ |
| 9.1 | Use Case Diagram + Description | 02 | `doc/diagrams/use-case-diagram.png`, `doc/Use Case Descriptions.md` | ครบทุก actor | ✅ |
| 9.1 | Class, Sequence ≥ 3, Activity, Component, Deployment, State | 21 | `doc/diagrams/` มี diagram แยกตาม feature, activity, component, deployment, state; Mermaid render ได้ | ไฟล์ใน `doc/diagrams/` | ✅ |
| 10 | README ครบหัวข้อ | 01, 28 | `README.md` | ครบตามใบงานข้อ 10 | 🟡 ยังขาดคอลัมน์ Section, Tech Stack, Architecture, Deployment URL, Project Structure |
| 11 | Dockerfile + docker-compose.yml | 07, 25 | `code/backend/Dockerfile`, `docker-compose.yml` | `docker compose up` รัน DB + backend ได้ | 🟡 compose ยังไม่มี frontend |
| 11 | CI/CD (คะแนนพิเศษ) | 26 | `.github/workflows/ci.yml` | Build → Test ผ่านทุก PR, Deploy อัตโนมัติ | 🟡 มี Build/Test ยังไม่มี Deploy |
| 14 | Test report | 26 | `doc/test-reports/` | รวมผลทุกคน | 🟡 มีรายงานราย task |
| 14 | End-to-end learner/provider/admin | 22 | `test/e2e/specs/`, `doc/task22-e2e-guide.md`, `doc/test-reports/task22-e2e.md` | Chromium + backend/PostgreSQL จริง; ทั้ง 10 scenarios ผ่านซ้ำจาก DB ใหม่ ไม่มี skipped/flaky | ✅ มีใน branch supawat; รอ PR เข้า develop |
| 14 | Slide ใน `doc/slide/` | 28 | — | — | ⬜ |

## 2. Use case → feature

| Use case | Feature / API หลัก | Task | หลักฐาน | สถานะ |
| --- | --- | --- | --- | :---: |
| UC01 ค้นหา กรอง เปรียบเทียบคอร์ส | `GET /api/v1/courses`, `/catalog/categories`, `/catalog/platforms` | 12 | `CatalogController`, `CatalogPage.tsx`, `CatalogCourseIntegrationTests` | ✅ |
| UC02 Course Matcher Quiz | `POST /api/v1/course-matches` | 19, 20 | `CourseMatcherController`, `MatcherPage`, `ScoringStrategyContractTests`, `test/frontend/matcher-flow.test.tsx` | ✅ backend/frontend และ unit/UI tests มีใน branch; PostgreSQL/E2E ต้องมี Docker |
| UC03 Career Roadmap | — | หลังส่งวิชา | — | ⬜ ไม่อยู่ในขอบเขตรอบส่งวิชา |
| UC04 สมัครสมาชิก / เข้าสู่ระบบ | `/api/v1/auth/*` | 05 | `AuthController`, `LoginPage.tsx`, `RegisterPage.tsx`, `AuthControllerIntegrationTests` | ✅ |
| UC05 จัดการโปรไฟล์ | `GET/PUT /api/v1/me/profile` | 05 | `ProfileController`, `ProfilePage.tsx` | ✅ |
| UC06 บันทึกคอร์ส | `PUT/DELETE /api/v1/me/bookmarks/{courseId}` | 13 | `BookmarkController`, `BookmarksPage.tsx`, `BookmarkIntegrationTests` | ✅ |
| UC07 เขียนรีวิว | `/api/v1/courses/{courseId}/reviews` | 14 | `ReviewController`, `ReviewControllerIntegrationTests` | 🟡 มี backend ยังไม่มี UI |
| UC08 ลิงก์ออกไปเรียนที่ต้นทาง | URL คอร์สตรวจ host ตาม `platforms.allowed_host` | 11 | `CourseUrlPolicy.requireAllowedUrl` | 🟡 ตรวจ URL ตอนบันทึกแล้ว ยังไม่มี endpoint outbound |
| UC09 สมัครเป็น Provider | `POST /api/v1/providers` | 09 | `ProviderServiceImpl.createProvider`, `ProviderPage.tsx` | ✅ |
| UC10 จัดการโปรไฟล์สถาบัน | `GET/PUT/DELETE /api/v1/providers/{id}` | 09 | `ProviderServiceImpl`, `ProviderControllerTests` | ✅ |
| UC11 จัดการสมาชิกทีม | `/api/v1/providers/{id}/members` | 10 | `ProviderMemberService`, `ProviderMemberControllerTests` | ✅ |
| UC12 สร้าง/แก้ไขคอร์สดราฟต์ | `POST /providers/{id}/courses`, `PUT /courses/{id}` | 11 | `CourseServiceImpl`, `CourseManagementSection.tsx` | ✅ |
| UC13 ส่งคอร์สเข้าตรวจ | `POST /api/v1/courses/{id}/submissions` | 11 | `CourseServiceImpl.submitCourse` (Provider ต้อง ACTIVE) | ✅ |
| UC14 ลบคอร์ส | `DELETE /api/v1/courses/{id}` | 11 | `CourseServiceImpl.deleteCourse` (เฉพาะ DRAFT ที่ไม่เคยเผยแพร่และไม่มีรีวิว) | ✅ |
| UC15 Admin ตรวจและอนุมัติคอร์ส | `POST /api/v1/admin/courses/{id}/moderation-decisions` | 15 | `CourseModerationServiceImpl`, `CourseWorkflow`, `AdminModerationControllerTests` | ✅ |
| UC16 Admin รับรอง Provider | `POST /api/v1/admin/providers/{id}/verification-decisions` | 15 | `ProviderVerificationServiceImpl`, `AdminModerationControllerTests` | ✅ |
| UC17 Admin ตรวจรีวิว | `GET /api/v1/admin/reviews`, `POST /api/v1/admin/reviews/{id}/moderation-decisions` | 16 | `AdminReviewModerationController`, `ReviewModerationSection`, `AdminReviewModerationControllerTests` | ✅ |
| UC18 จัดการหมวดหมู่ | — | — | seed หมวดหมู่ใน V2 | ⬜ |
| UC19 ดู Audit Log | — | 17 | ตาราง `audit_logs` มีข้อมูลจาก Provider/Course แล้ว | 🟡 บันทึกแล้ว ยังไม่มีหน้าดู |
