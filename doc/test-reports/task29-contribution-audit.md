# Task 29 — Contribution audit

- ข้อมูลตัดที่ `develop` commit `459658b` (merge PR #43 เมื่อ 10 ตุลาคม 2026 เวลา 23:26 น.) ซึ่งเป็น default branch ของ repo
- นับ PR #1–#43 ครบ ตอนตรวจไม่มี PR เปิดค้าง; PR ที่ส่งรายงานนี้ไม่นับรวม
- เกณฑ์จากใบงานข้อ 8: มี `main`/`develop`/branch ส่วนตัวชื่อ `ชื่อ_รหัส_section`, แต่ละคน commit จากบัญชีตนเองอย่างน้อย 15 meaningful commits กระจายตลอดโครงการ และ PR มี reviewer อย่างน้อย 1 คน
- เกณฑ์ Task 29 ในตารางงานทีม: หลักฐาน backend/API/tests ของทั้ง 4 คน และ meaningful commits ตามแผน
- แหล่งข้อมูล: `git log` ของ `origin/develop`, รายการ PR และรีวิวบน GitHub, หน้า commit บน GitHub (ตรวจว่า commit ผูกกับบัญชี)
- ผู้ตรวจ: Keattisak · ผู้รีวิวตามตารางงาน: BossZY27

## 1. สรุปผล

| เกณฑ์ | ผล | รายละเอียด |
| --- | :---: | --- |
| มี `main` และ `develop` | ✅ | `develop` เป็น default branch และรับงานผ่าน PR; `main` ยังเป็น commit ตั้งโปรเจกต์ รอ release ใน Task 30 (ข้อ 6.8) |
| Branch ส่วนตัวชื่อ `ชื่อ_รหัส_section` | 🟡 | ทุกคนมี branch `<ชื่อ>_<รหัส>_01`; branch หลักของ Phakin ไม่มี `_01` และ #43 เปิดจาก `keattisak-uat-report` (ข้อ 6.5) |
| Commit อย่างน้อย 15 ต่อคน | ✅ | 43–73 commit; ตัด commit ที่แก้ไม่เกิน 3 บรรทัดออกแล้วยังเหลือ 42–69 (ข้อ 3) |
| Commit กระจายตลอดโครงการ | 🟡 | ทุกคนมี commit 3–5 สัปดาห์ แต่ 72% อยู่ในสัปดาห์ 5–11 ต.ค. (ข้อ 6.6) |
| Commit จากบัญชีตนเอง | 🟡 | 3 คนผูกบัญชีครบ; commit โค้ดของ Phakin ใช้อีเมลที่ยังไม่ได้เพิ่มในบัญชี BossZY27 (ข้อ 6.1) |
| PR มี reviewer อย่างน้อย 1 คน | 🟡 | PR ที่ merge 40 อัน มีรีวิวจากสมาชิกอื่น 35 อัน และมี approve 29 อัน; ตั้งแต่ #15 มี approve ทุก PR ยกเว้น #20, #39 และ #43 (ข้อ 6.2) |
| หลักฐาน backend/API/tests ทั้ง 4 คน | ✅ | ทุกคนมี Controller/API, service และเทสต์ backend ของตนเอง (ข้อ 4) |

## 2. สมาชิกและบัญชี

| สมาชิก | GitHub | Branch ที่ใช้เปิด PR | Commit ผูกกับบัญชี GitHub |
| --- | --- | --- | :---: |
| Keattisak | KeattisakNantharat | `keattisak_6733800729_01`, `keattisak-uat-report` | ✅ |
| Sorawit | poohlikung | `sorawit_6733800648_01`, `chore/cloud-pr-review-notifier`, `codex/coursehub-home-proposal`, `codex/coursehub-report-draft` | ✅ |
| Supawat | Pangkeek | `supawat_6733800622_01` | ✅ |
| Phakin | BossZY27 | `phakin_6733800541_01`, `phakin_6733800541`, `phakin_6733800541_12_catalog`, `phakin_6733800541_ci`, `phakin_6733800541_cd`, `phakin_6733800541_platforms` | ❌ (ข้อ 6.1) |

- ใน git ชื่อผู้เขียนของ Sorawit มี 3 แบบ (`poohlikung`, `PoohSorawit`, `Sorawit Wansen`) ทั้งหมดผูกกับบัญชี poohlikung จึงนับรวมกัน
- merge commit ที่กด merge บนเว็บใช้ชื่อโปรไฟล์ GitHub ของผู้กด เช่น `9Nut` คือบัญชี KeattisakNantharat
- ตรวจการผูกบัญชีจากหน้า commit บน GitHub: commit ที่ผูกแล้ว ชื่อผู้เขียนจะมีรูปโปรไฟล์และกดไปหน้าบัญชีได้

## 3. Commit

นับจาก `origin/develop` ไม่นับ merge commit

| สมาชิก | Commit | แก้ไม่เกิน 3 บรรทัด | วันที่มี commit | Commit แรก–ล่าสุด | 7–13 ก.ย. | 14–20 ก.ย. | 21–27 ก.ย. | 28 ก.ย.–4 ต.ค. | 5–11 ต.ค. |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| Keattisak | 53 | 2 | 12 วัน | 19 ก.ย.–10 ต.ค. | 0 | 5 | 3 | 17 | 28 |
| Sorawit | 73 | 4 | 10 วัน | 10 ก.ย.–10 ต.ค. | 4 | 2 | 4 | 8 | 55 |
| Supawat | 43 | 1 | 10 วัน | 22 ก.ย.–10 ต.ค. | 0 | 0 | 3 | 5 | 35 |
| Phakin | 56 | 7 | 8 วัน | 21 ก.ย.–10 ต.ค. | 0 | 0 | 8 | 3 | 45 |
| รวม | 225 | 14 | | | 4 | 7 | 18 | 33 | 163 |

- Commit ของ Sorawit รวม 6 commit ตั้งโปรเจกต์ (10 และ 19 ก.ย.) ก่อนเริ่มใช้ PR และ 2 commit ที่ push เข้า `develop` โดยตรง (ข้อ 6.4)
- Commit ของ Phakin นับครบ 56 อันแม้ยังไม่ผูกบัญชี เพราะทุก commit อยู่ใน PR ที่บัญชี BossZY27 เปิดเอง (ข้อ 6.1)
- 6 commit ของ Sorawit ใน #42 บันทึกเขตเวลาเป็น UTC−03:00 ทั้งที่เวลาบนนาฬิกาเป็นเวลาไทย (ผู้รีวิวทักไว้ใน #42) ตารางนี้ใช้วันที่ตามที่บันทึกใน commit ซึ่งยังเป็น 10 ต.ค. ทั้งหมด

## 4. หลักฐาน backend / API / tests รายคน

ผู้สร้างไฟล์ดูจาก commit แรกที่เพิ่มไฟล์ (`git log --diff-filter=A`) จำนวนเคสนับ `@Test`/`@ParameterizedTest` ในไฟล์ปัจจุบันบน `develop`

### Keattisak — Provider, Course และฐานข้อมูล

- API
  - `ProviderController`: `POST /api/v1/providers`, `GET /api/v1/providers/me`, `GET /api/v1/providers/{id}`, `GET /api/v1/providers/slug/{slug}`, `PUT /api/v1/providers/{id}`, `DELETE /api/v1/providers/{id}`
  - `CourseController`: `POST/GET /api/v1/providers/{providerId}/courses`, `GET/PUT/DELETE /api/v1/courses/{id}`, `POST /api/v1/courses/{id}/submissions`
  - `SystemController`: `GET /api/v1/system/liveness`
- Backend: `ProviderService`, `ProviderServiceImpl`, `ProviderMapper`, `CourseService`, `CourseServiceImpl`, `CourseCommandService`, `CourseQueryService`, `CourseMapper`, `CourseUrlPolicy`, entity `Provider`/`Course`/`CoursePrice`/`Category`/`Platform`, `SecurityConfig`, Flyway `V1__init_schema.sql` และ `V2__seed_initial_data.sql`
- Tests: 9 คลาส 113 เคส (3 เคสใน `CourseControllerTests` และ `CourseUrlPolicyTests` เพิ่มโดย Phakin ใน #40) — `ProviderControllerTests`, `ProviderServiceTests`, `CourseControllerTests`, `CourseServiceTests`, `CourseServiceImplMockitoTests`, `CourseMapperTests`, `CourseUrlPolicyTests`, `CourseSchemaPostgresIntegrationTests`, `BackupRestoreRehearsalIntegrationTests`
- งานอื่น: `ProviderPage.tsx`, `CourseManagementSection.tsx`, `code/scripts/db/backup-restore.ps1`, รายงาน Task 09, 11, 24 และผล UAT/เก็บกวาดข้อมูลทดสอบบน production ใน Task 27 (#43)

### Sorawit — Review, Admin moderation และ Audit Log

- API
  - `ReviewController`: `GET /api/v1/courses/{courseId}/reviews`, `GET/PUT /api/v1/courses/{courseId}/reviews/me`, `POST /api/v1/courses/{courseId}/reviews`
  - `AdminReviewModerationController`: `GET /api/v1/admin/reviews`, `POST /api/v1/admin/reviews/{id}/moderation-decisions`
  - `AdminModerationController`: `GET /api/v1/admin/courses`, `POST /api/v1/admin/courses/{id}/moderation-decisions`, `GET /api/v1/admin/providers`, `POST /api/v1/admin/providers/{id}/verification-decisions`
  - `AdminAuditLogController`: `GET /api/v1/admin/audit-logs` (กรองและแบ่งหน้า)
- Backend: `ReviewService`, `ReviewModerationService`/`Impl`, `CourseModerationService`/`Impl`, `ProviderVerificationService`/`Impl`, State pattern `CourseWorkflow`/`CourseWorkflowState`, `AuditLogQueryService`/`AuditLogSpecifications`, entity `Review`, Flyway `V3__audit_log_reason.sql` และ `V4__review_moderation.sql`
- Tests: 9 คลาส 36 เคส — `ReviewControllerIntegrationTests`, `AdminModerationControllerTests`, `AdminReviewModerationControllerTests`, `AdminAuditLogControllerTests`, `AuditLogQueryServiceTests`, `AuditLogQueryPostgresIntegrationTests`, `CourseWorkflowTests`, `ApiErrorContractIntegrationTests`, `DtoValidationTests` (และ helper `TestFixtures`)
- งานอื่น: `ReviewsPage.tsx`, `AdminPage.tsx`, `ReviewModerationSection.tsx`, `AuditLogsPage.tsx`, E2E `audit-logs.spec.ts`, รายงาน Task 15, 16, 26 และ Audit Log

### Supawat — Profile, Bookmark, Member, Matcher และ Observer

- API
  - `CurrentUserController`: `GET /api/v1/me`
  - `ProfileController`: `GET/PUT /api/v1/me/profile`
  - `BookmarkController`: `GET /api/v1/me/bookmarks`, `GET /api/v1/me/bookmarks/ids`, `PUT/DELETE /api/v1/me/bookmarks/{courseId}`
  - `ProviderMemberController`: `GET/POST /api/v1/providers/{providerId}/members`, `DELETE /api/v1/providers/{providerId}/members/{memberId}`
  - `CourseMatcherController`: `POST /api/v1/course-matches`
- Backend: `CourseMatcherService`, Strategy pattern `ScoringStrategy`/`BudgetFitStrategy`/`EffortFitStrategy`/`ReviewQualityStrategy`, Observer `CourseEventPublisher`/`CourseMetricsListener`, `GlobalExceptionHandler`, `ApiErrorResponse`, `ProviderOwnershipService`, `ProviderMemberService`, `BookmarkService`, `ProfileService`, entity `AuditLog`/`ProviderMember`
- Tests: 16 คลาส 105 เคส — เช่น `CourseMatcherServiceTests`, `ScoringStrategyContractTests`, `CourseMatcherPostgresIntegrationTests`, `BookmarkIntegrationTests`, `ProfileControllerIntegrationTests`, `ProviderMemberServiceTests`, `ProviderMemberPostgresIntegrationTests`, `CourseEventPublicationIntegrationTests`, `AuditTransactionPostgresIntegrationTests`
- งานอื่น: E2E (`auth`, `learner`, `publishing`, `startup`, `matcher`, `provider-members` specs), `LoginPage.tsx`, `RegisterPage.tsx`, `ProfilePage.tsx`, `BookmarksPage.tsx`, หน้าจัดการสมาชิก `ProviderMemberManagementSection.tsx` (#41), รายงาน Task 10, 17, 19, 22, 23 และ UC11

### Phakin — Auth, Catalog และการระบุแพลตฟอร์มจาก URL

- API
  - `AuthController`: `POST /api/v1/auth/register`, `GET /api/v1/auth/csrf`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`
  - `CatalogController`: `GET /api/v1/courses` (pagination/sorting), `GET /api/v1/catalog/categories`, `GET /api/v1/catalog/platforms`
- Backend: `AuthService`, `CatalogCourseService`, `CatalogMetadataService`, `CatalogRatingRepository`, `ActiveUserFilter`, `CoursePlatformResolver`, entity `User`/`UserProfile`, Flyway `V5__automatic_course_platforms.sql`
- Tests: สร้าง 4 คลาส 17 เคส — `AuthControllerIntegrationTests`, `CatalogCourseIntegrationTests`, `CatalogMetadataIntegrationTests`, `FlywayMigrationIntegrationTests`; เพิ่ม 3 เคสของ Task 18 ใน `AuditTransactionPostgresIntegrationTests` (rollback ราคา/หมวดหมู่, แก้คอร์สพร้อมกัน, สมาชิกที่ถูกถอนสิทธิ์) และ 3 เคสของ #40 ใน `CourseControllerTests`/`CourseUrlPolicyTests`
- งานอื่น: `CatalogPage.tsx`, `HomePage.tsx`, `MatcherPage.tsx`, `.github/workflows/ci.yml`, `code/frontend/vercel.json`, รายงาน Task 18, 20, 25, 27

## 5. Pull request และการรีวิว

### สรุปรายคน

| สมาชิก | PR ที่เปิด | Merge | ปิดโดยไม่ merge | ยังเปิด | รีวิวที่ส่งให้ PR คนอื่น | จำนวน PR ที่รีวิว | Approve |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Keattisak | 10 | 10 | 0 | 0 | 29 | 14 | 15 |
| Sorawit | 12 | 9 | 3 | 0 | 3 | 3 | 0 |
| Supawat | 9 | 9 | 0 | 0 | 31 | 18 | 19 |
| Phakin | 12 | 12 | 0 | 0 | 35 | 21 | 20 |

### ทุก PR

ผู้รีวิวแสดงผลล่าสุดของแต่ละคน (ถ้าคนเดียวกันส่ง comment หลัง approve หรือขอแก้ จะแสดงผลก่อนหน้า): ✅ approve · ❌ changes requested · 💬 comment · ⊘ dismissed

| PR | ชื่อ | ผู้เปิด | ผู้รีวิว | ผู้กด merge | สถานะ |
| --- | --- | --- | --- | --- | --- |
| [#1](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/1) | chore: setup backend folder structure and config dependen… | KeattisakNantharat | — | KeattisakNantharat | merged |
| [#2](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/2) | feat: setup backend cloud config, liveness api, security,… | KeattisakNantharat | poohlikung 💬 | poohlikung | merged |
| [#3](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/3) | feat: add flyway v1 schema for 12 relational tables | KeattisakNantharat | — | poohlikung | merged |
| [#4](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/4) | feat: implement database seeding, domain entities, and da… | KeattisakNantharat | BossZY27 ✅ | BossZY27 | merged |
| [#5](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/5) | วางระบบเข้าสู่ระบบและโครงหน้าเว็บ React | BossZY27 | — | KeattisakNantharat | merged |
| [#6](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/6) | เพิ่มหน้าค้นหาและกรองคอร์ส (Task 12) | BossZY27 | poohlikung 💬 | poohlikung | merged |
| [#7](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/7) | Step_05 | Pangkeek | BossZY27 ✅ | BossZY27 | merged |
| [#8](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/8) | feat: ทำระบบยืนยันตัวตนด้วย Session และปรับขั้นตอนการทำงา… | poohlikung | BossZY27 ❌ | — | ปิดโดยไม่ merge |
| [#9](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/9) | 13 Bookmark backend , UI | Pangkeek | BossZY27 ⊘ | KeattisakNantharat | merged |
| [#10](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/10) | (Step 4) docs: add test-plan , (Step 8) test: DTO validat… | poohlikung | BossZY27 ❌ | KeattisakNantharat | merged |
| [#11](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/11) | fix: เพิ่มไฟล์ .env example | poohlikung | BossZY27 ✅ | Pangkeek | merged |
| [#12](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/12) | 10 Member roles + ownership backend | Pangkeek | BossZY27 ✅ | Pangkeek | merged |
| [#13](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/13) | (Step 14 Review backend) เพิ่ม Review API และเทส | poohlikung | BossZY27 ✅ | KeattisakNantharat | merged |
| [#14](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/14) | เพิ่ม CI ตรวจหลังบ้านและหน้าเว็บเมื่อเปิด PR | BossZY27 | — | KeattisakNantharat | merged |
| [#15](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/15) | feat(provider): implement provider CRUD backend and front… | KeattisakNantharat | BossZY27 ✅ | BossZY27 | merged |
| [#16](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/16) | feat(course): implement course CRUD backend and frontend… | KeattisakNantharat | BossZY27 ✅, Pangkeek ✅ | BossZY27 | merged |
| [#17](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/17) | feat(provider,db): provider visibility, schema tests, ER… | KeattisakNantharat | BossZY27 ✅, Pangkeek ✅ | KeattisakNantharat | merged |
| [#18](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/18) | refactor(provider,course): service interfaces, mappers an… | KeattisakNantharat | Pangkeek ✅ | poohlikung | merged |
| [#19](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/19) | Feat: (Step15) Course State moderation + Admin UI | poohlikung | Pangkeek ✅, BossZY27 ✅ | KeattisakNantharat | merged |
| [#20](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/20) | chore: add cloud PR review notifier | poohlikung | — | poohlikung | merged (ไม่อยู่ใน `develop` แล้ว ข้อ 6.3) |
| [#21](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/21) | feat: Step 17 AuditLog transaction และ Observer metrics | Pangkeek | BossZY27 ✅ | Pangkeek | merged |
| [#22](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/22) | (step16): Review moderation backend + Admin UI | poohlikung | Pangkeek ✅, BossZY27 ❌ | KeattisakNantharat | merged |
| [#23](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/23) | Step 19 เพิ่มระบบแนะนำคอร์สตามงบ เวลา และคะแนนรีวิว | Pangkeek | BossZY27 ✅ | KeattisakNantharat | merged |
| [#24](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/24) | เพิ่มเทสต์การแก้คอร์สพร้อมกันและการตรวจสิทธิ์ (Task 18) | BossZY27 | Pangkeek ✅ | KeattisakNantharat | merged |
| [#25](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/25) | เพิ่มแบบทดสอบหาคอร์สและหน้าผลแนะนำ (Task 20) | BossZY27 | Pangkeek ✅ | KeattisakNantharat | merged |
| [#26](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/26) | ตั้งค่า CD ให้ Render และ Vercel ขึ้นระบบหลังเทสต์ผ่าน | BossZY27 | KeattisakNantharat 💬, Pangkeek ✅ | Pangkeek | merged |
| [#27](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/27) | test: Step 22 เพิ่ม E2E learner/provider/admin ด้วย Playw… | Pangkeek | KeattisakNantharat ✅, BossZY27 ✅ | BossZY27 | merged |
| [#28](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/28) | feat: Step 23 Vercel proxy/session และ loading/retry | Pangkeek | KeattisakNantharat ✅, BossZY27 ❌ | KeattisakNantharat | merged |
| [#29](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/29) | feat:(step21) Quiz/results/reasons UI + API integration | poohlikung | KeattisakNantharat ✅, BossZY27 ✅, Pangkeek ✅ | KeattisakNantharat | merged |
| [#30](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/30) | ปรับหน้าตา CourseHub ทั้งเว็บเป็นธีม Learning Orbit | BossZY27 | Pangkeek ✅, KeattisakNantharat ✅ | KeattisakNantharat | merged |
| [#31](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/31) | เอกสาร: บันทึกการขึ้นระบบ Task 25 และผลตรวจเว็บจริง | BossZY27 | Pangkeek ✅, KeattisakNantharat ✅ | KeattisakNantharat | merged |
| [#32](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/32) | feat(db): backup/restore script and migration rehearsal (… | KeattisakNantharat | Pangkeek ✅, BossZY27 ✅ | KeattisakNantharat | merged |
| [#33](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/33) | (step 26)feat: Smoke tests + test report และเพิ่มการรีวิว… | poohlikung | Pangkeek ❌, BossZY27 ✅, KeattisakNantharat ✅ | poohlikung | merged |
| [#34](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/34) | แก้หน้าแนะนำคอร์สให้แสดงคอร์สที่มีจริงก่อนดูผล | BossZY27 | Pangkeek ✅, KeattisakNantharat ✅ | KeattisakNantharat | merged |
| [#35](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/35) | test: scope course event audit assertions to tested entities | Pangkeek | KeattisakNantharat ✅, BossZY27 ✅ | KeattisakNantharat | merged |
| [#36](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/36) | style(frontend): review alternative home design and font… | poohlikung | — | — | ปิดโดยไม่ merge |
| [#37](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/37) | docs(report): review draft CourseHub report separately | poohlikung | — | — | ปิดโดยไม่ merge |
| [#38](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/38) | เอกสาร: อัปเดตสถานะ Task 25 หลังเปิด CD | BossZY27 | KeattisakNantharat ✅ | KeattisakNantharat | merged |
| [#39](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/39) | เอกสาร: ผล UAT หลัง deploy PR #33 | BossZY27 | poohlikung 💬, KeattisakNantharat ❌, Pangkeek 💬 | KeattisakNantharat | merged |
| [#40](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/40) | ให้ระบบระบุแพลตฟอร์มคอร์สจากลิงก์อัตโนมัติ | BossZY27 | KeattisakNantharat ✅, Pangkeek ✅ | poohlikung | merged |
| [#41](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/41) | feat(provider): add UC11 team member management UI | Pangkeek | KeattisakNantharat ✅ | KeattisakNantharat | merged |
| [#42](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/42) | feat: เพิ่มหน้าดูประวัติ Audit Log สำหรับผู้ดูแลระบบ | poohlikung | Pangkeek 💬, KeattisakNantharat ✅ | KeattisakNantharat | merged |
| [#43](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/43) | docs(uat): production UAT evidence and cleanup results (T… | KeattisakNantharat | Pangkeek 💬 | Pangkeek | merged |

## 6. ข้อสังเกตและสิ่งที่ต้องทำ

### 6.1 Commit ของ Phakin ยังไม่ผูกกับบัญชี GitHub

- อีเมลใน commit โค้ดทั้ง 56 อันของ Phakin ยังไม่ได้เพิ่มในบัญชี BossZY27 GitHub จึงผูกให้บัญชีนี้เฉพาะ merge commit 5 อันที่กด merge บนเว็บ ตรวจได้ที่ <https://github.com/poohlikung/GROUP36_CourseRecommend/commits/develop?author=BossZY27>
- รายงานนี้นับให้ Phakin ครบ 56 commit เพราะทุก commit อยู่ใน PR ที่บัญชี BossZY27 เปิดเอง (#5, #6, #14, #24, #25, #26, #30, #31, #34, #38, #39, #40) และอยู่บน branch `phakin_6733800541*`
- วิธีแก้: เจ้าของบัญชีเพิ่มอีเมลที่ใช้ใน commit ที่ GitHub → Settings → Emails คู่มือ GitHub เรื่อง "Troubleshooting missing contributions" ระบุว่าไม่ต้องเข้ากล่องเมลนั้นได้ และกราฟ contribution จะอัปเดตภายใน 24 ชั่วโมง; commit ใหม่ให้ตั้ง `git config user.email` เป็นอีเมลที่อยู่ในบัญชี
- สถานะ: แจ้งเจ้าของบัญชีแล้ว เจ้าของแจ้งว่าไม่ได้ใช้อีเมลนี้แล้ว; ตรวจ commit ล่าสุด `e54a422` (10 ต.ค.) ยังไม่ผูกบัญชี

### 6.2 PR ที่ merge โดยไม่มี approve

| กรณี | PR |
| --- | --- |
| ไม่มีรีวิวจากสมาชิกอื่น | #1, #3 (KeattisakNantharat), #5, #14 (BossZY27), #20 (poohlikung) |
| มีแต่ comment | #2, #6, #43 |
| รีวิวถูก dismiss | #9 |
| ผู้รีวิวขอแก้แล้วไม่มี approve | #10, #39 |

- ส่วนใหญ่ merge ช่วง 20–30 ก.ย. ยกเว้น #20 (6 ต.ค.), #39 และ #43 (10 ต.ค.) ตั้งแต่ #15 (merge 3 ต.ค.) ทุก PR ที่ merge มี approve อย่างน้อย 1 คน ยกเว้น #20, #39 และ #43
- #39: KeattisakNantharat ขอแก้ 2 รอบ ผู้รีวิวอีก 2 คนส่ง comment ผู้เปิด PR แก้ตามรีวิวแล้ว แต่ KeattisakNantharat กด merge โดยยังไม่ได้เปลี่ยนรีวิวของตนเป็น approve
- #43: KeattisakNantharat เปิด PR, Pangkeek ส่ง comment ว่าไม่พบจุดต้องแก้แล้วกด merge โดยไม่ได้กด approve
- #22, #28 และ #33 มี approve แล้ว แต่ตอน merge ยังมีผู้รีวิวอีกคนที่ขอแก้และไม่ได้กลับมารีวิวซ้ำ
- PR ที่ merge แล้วแก้ย้อนหลังไม่ได้ จึงบันทึกตามจริง ข้อเสนอ: เจ้าของ repo เปิด branch protection ของ `develop` ให้ต้อง merge ผ่าน PR ที่มี approve อย่างน้อย 1 คน, ผู้รีวิวที่พอใจแล้วให้กด approve แทนการส่ง comment และกด Re-request review ทุกครั้งที่แก้ตามที่ผู้รีวิวขอ

### 6.3 PR #20 ขึ้นว่า merged แต่ไม่อยู่ใน `develop`

- GitHub แสดงว่า #20 merge เมื่อ 6 ต.ค. แต่ commit `cfc47fb` ของ PR นี้ไม่อยู่ใน `develop` แล้ว ประวัติ `develop` ต่อจาก merge #17 (`1020505`) ไปที่ merge #18 (`8acb35b`) ทันที แสดงว่า `develop` ถูกย้อนกลับหลัง merge #20 ไฟล์ workflow ของ PR นี้จึงไม่อยู่ใน repo
- ข้อเสนอ: เจ้าของ PR ยืนยันว่าตั้งใจเอาออก และเปิด "Block force pushes" ใน branch protection ของ `develop`

### 6.4 Commit ที่ไม่ได้ผ่าน PR

- `461cc54` "Update README.md" (6 ต.ค.) แก้บน `develop` โดยตรง
- `93e81fd` "docs: slide presentation" (10 ต.ค.) เพิ่มไฟล์ PDF สไลด์นำเสนอ 1 ไฟล์บน `develop` โดยตรง ก่อน merge #43
- 6 commit ตั้งโปรเจกต์ (10 และ 19 ก.ย.) push ก่อนเริ่มใช้ PR

### 6.5 ชื่อ branch

- `keattisak_6733800729_01`, `sorawit_6733800648_01` และ `supawat_6733800622_01` ตรงตามรูปแบบ `ชื่อ_รหัส_section`
- KeattisakNantharat เปิด #43 จาก `keattisak-uat-report` ซึ่งไม่ตรงรูปแบบ
- Phakin เปิด PR แรกจาก `phakin_6733800541_01` (#5) จากนั้นใช้ `phakin_6733800541` ซึ่งไม่มี section เป็น branch หลัก (#24, #25, #30, #31, #34, #38, #39) และแยก `_12_catalog` (#6), `_ci` (#14), `_cd` (#26), `_platforms` (#40); README ระบุ branch ของ Phakin เป็น `phakin_6733800541`
- poohlikung เปิด PR จาก branch ชื่ออื่น 3 อัน: `chore/cloud-pr-review-notifier` (#20), `codex/coursehub-home-proposal` (#36), `codex/coursehub-report-draft` (#37) โดย #36 และ #37 ปิดโดยไม่ merge
- เปลี่ยนชื่อ branch ของ PR ที่ merge แล้วไม่ได้ ข้อเสนอ: งานต่อจากนี้ใช้ branch ตามรูปแบบ

### 6.6 การกระจายของ commit

- 163 จาก 225 commit (72%) อยู่ในสัปดาห์ 5–11 ต.ค. ซึ่งเป็นช่วง deploy, E2E, UAT, ฟีเจอร์ UC11/UC19 และแก้ตามรีวิว แต่ทุกคนมี commit อย่างน้อย 3 สัปดาห์ (ข้อ 3)
- ย้อนแก้ไม่ได้ บันทึกตามจริง

### 6.7 การรีวิว PR

- poohlikung ส่งรีวิว 3 ครั้ง (comment ใน #2, #6 และ #39) ขณะที่สมาชิกคนอื่นส่ง 29–35 ครั้ง (ข้อ 5)
- ข้อเสนอ: poohlikung ร่วมรีวิว PR ที่เหลือก่อน release

### 6.8 Branch `main`

- `main` ยังมีแค่ 4 commit ตั้งโปรเจกต์ (10 ก.ย.) ส่วน `develop` นำอยู่ 272 commit (รวม merge commit)
- release `develop` → `main` เป็นงาน Task 30 ซึ่งรอ Task 28 และ 29

## 7. ก่อนปิด Task 29

- [x] หลัง #39–#43 merge รันตัวเลขข้อ 3–5 ใหม่ที่ `459658b`
- [ ] ถ้ามี PR merge เข้า `develop` เพิ่มก่อน release ใน Task 30 ให้รันตัวเลขซ้ำตามข้อ 8
- [ ] ตรวจข้อ 6.1 อีกครั้งหลังเจ้าของบัญชีเพิ่มอีเมล
- [ ] BossZY27 รีวิวรายงานนี้ตามตารางงาน

## 8. วิธีตรวจซ้ำ

คำสั่งใช้ได้ทั้ง PowerShell และ bash รันจาก root ของ repo

```bash
git fetch origin

# จำนวน commit ต่อชื่อและอีเมล (ไม่นับ merge); Sorawit มี 3 ชื่อ ให้รวมกัน
git shortlog -sne --no-merges origin/develop

# วันที่ของแต่ละ commit ของคนหนึ่ง ใช้ดูการกระจายรายสัปดาห์
git log origin/develop --no-merges --author="<ชื่อหรืออีเมล>" --format="%ad %s" --date=short

# commit ที่ไม่ได้ผ่าน PR (อยู่บนเส้นหลักของ develop และไม่ใช่ merge commit)
git log origin/develop --first-parent --no-merges --format="%h %ad %an %s" --date=short

# คนที่กด merge แต่ละ PR
git log origin/develop --merges --format="%an | %s" --grep="Merge pull request"

# ไฟล์ที่แต่ละคนสร้าง
git log origin/develop --no-merges --diff-filter=A --author="<ชื่อหรืออีเมล>" --name-only --format="" -- code/backend/src/main test/backend
```

- รีวิวของแต่ละ PR: เปิด PR บน GitHub แล้วดูช่อง Reviewers หรือแท็บ Conversation
- การผูกบัญชี: เปิดหน้า commit บน GitHub ถ้าชื่อผู้เขียนกดไปหน้าบัญชีได้แปลว่าผูกแล้ว
