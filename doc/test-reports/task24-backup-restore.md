# Task 24 — Backup/restore + migration rehearsal: Test report

- วันที่รัน: 8 ตุลาคม 2026
- Branch: `keattisak_6733800729_01` (ฐานจาก `develop` commit `d1e8512`)
- Production: Neon PostgreSQL 18.6
- เทสต์อัตโนมัติ: Testcontainers `postgres:18-alpine` (major version เดียวกับ Neon), Flyway
- ทดสอบสคริปต์บนเครื่อง: PostgreSQL 16 ทั้ง server และ client (`pg_dump`/`pg_restore`/`psql`), PowerShell 7.4
- คู่มือขั้นตอน: [`doc/task24-backup-restore-guide.md`](../task24-backup-restore-guide.md)

## 1. เทสต์อัตโนมัติ (รันใน CI ทุก PR)

รันจากโฟลเดอร์ `code/backend`:

```bash
./mvnw test -Dtest=BackupRestoreRehearsalIntegrationTests
```

`BackupRestoreRehearsalIntegrationTests` สร้าง PostgreSQL 18 จำนวน 2 ตัว: ตัวแรก migrate ด้วย Flyway V1–V4 และเพิ่มคอร์สทดสอบที่มีราคาและ 2 หมวดหมู่ จากนั้น `pg_dump --format=custom` แล้ว `pg_restore --exit-on-error` ลงตัวที่สองซึ่งว่างเปล่า

| เคส | ตรวจอะไร | ผล |
| --- | --- | :---: |
| `restoredDatabaseHasSameRowCountsInEveryTable` | จำนวนแถวทุกตารางใน `public` (12 ตาราง + `flyway_schema_history`) เท่ากับต้นทาง | ผ่าน |
| `restoredDatabaseKeepsCourseWithItsPriceAndCategories` | คอร์สทดสอบยังมี provider, ราคา `ONE_TIME 1290.00 THB` และหมวดหมู่ `data-science-ai, programming` ครบ | ผ่าน |
| `restoredDatabaseIsAlreadyMigratedSoFlywayDoesNothing` | `flyway_schema_history` ตรงกับต้นทาง, `Flyway.validate()` ผ่าน และ `migrate()` รัน 0 migration (ไม่ migrate ซ้ำ) | ผ่าน |
| `restoredSequencesContinueAfterExistingIds` | หลัง restore เพิ่ม Provider ใหม่ได้ id มากกว่า id เดิมทั้งหมด (sequence ถูก restore ด้วย) | ผ่าน |

ผล: **4/4 ผ่าน** ทั้งบน `postgres:16-alpine` และ `postgres:18-alpine` (ประมาณ 10 วินาที) โดยเทสต์ที่คอมมิตใช้ 18 ให้ตรงกับ Neon

ชุดเต็ม `mvn verify` บนเครื่องที่มี Docker: 312 เคส ผ่าน 291 ส่วน 21 เคสที่ไม่ผ่านอยู่ใน `CourseEventPublicationIntegrationTests` ซึ่ง**ไม่ผ่านแบบเดียวกันบน `develop` (`d1e8512`) ที่ยังไม่มีงาน Task 24** (นับ audit log ที่เทสต์อื่นสร้างไว้ในฐาน H2 เดียวกัน ขึ้นกับลำดับการรันเทสต์) จึงไม่เกี่ยวกับงานนี้ และ CI ของ `develop` ยังผ่าน

## 2. ทดสอบสคริปต์ `backup-restore.ps1` กับ PostgreSQL บนเครื่อง

จำลองต้นทางชื่อ `neondb` (migrate ด้วย backend จริง ได้ Flyway V1–V4 และข้อมูล seed) และปลายทางว่างชื่อ `coursehub_restore` บน PostgreSQL 16 แยกกัน 2 ตัว

| ขั้นตอน | ผลที่ได้ | ผล |
| --- | --- | :---: |
| `restore` โดยให้ปลายทางเป็นฐานเดียวกับต้นทาง | ปฏิเสธ: "ห้าม restore ทับฐาน production" | ผ่าน |
| `backup` | ได้ไฟล์ `coursehub-<วันเวลา>.dump` 40,716 bytes พร้อม SHA256 แสดงเฉพาะ host/database ไม่แสดงรหัสผ่าน | ผ่าน |
| `restore` ลงฐานว่าง | `pg_restore` สำเร็จ | ผ่าน |
| `restore` ซ้ำลงฐานเดิม | ปฏิเสธ: "มี 13 ตารางอยู่แล้ว ให้ใช้ฐานว่างเท่านั้น" | ผ่าน |
| `verify` | 13 ตาราง `Match = True`, `Flyway history ตรงกัน: True`, exit code 0 | ผ่าน |
| `verify` หลังลบแถวใน `saved_courses` ของปลายทาง 1 แถว | แสดง `saved_courses 2 → 1 False`, "ไม่ผ่าน: จำนวนแถวไม่ตรง 1 ตาราง", exit code 1 | ผ่าน |

ผลนับแถวจาก `verify` (ข้อมูล seed + ข้อมูลที่ backend สร้างตอนเริ่มทำงาน):

| Table | Source | Restored |
| --- | ---: | ---: |
| audit_logs | 6 | 6 |
| categories | 6 | 6 |
| course_categories | 8 | 8 |
| course_prices | 6 | 6 |
| courses | 6 | 6 |
| flyway_schema_history | 4 | 4 |
| platforms | 5 | 5 |
| provider_members | 1 | 1 |
| providers | 5 | 5 |
| reviews | 3 | 3 |
| saved_courses | 2 | 2 |
| user_profiles | 4 | 4 |
| users | 4 | 4 |

## 3. Backup/restore กับ Neon จริง

ทำตามคู่มือข้อ 4–5 จากเครื่อง Windows ของผู้รับผิดชอบ (connection string อยู่ใน environment variable เท่านั้น)

| รายการ | ผล |
| --- | --- |
| Neon PostgreSQL version / client version | Neon 18.6 / client _รอผล_ |
| ไฟล์ backup และ SHA256 | _รอผล_ |
| `restore` ลง `coursehub_restore` | _รอผล_ |
| `verify` ทุกตาราง Match และ Flyway history ตรงกัน | _รอผล_ |
| ภาพหน้าจอหลักฐาน (ปิดรหัสผ่านแล้ว) | _รอผล_ |

## 4. ข้อมูลคงอยู่หลัง restart backend บน Render

| รายการ | ผล |
| --- | --- |
| `totalElements` ของ `GET /api/v1/courses` ก่อน restart | _รอผล_ |
| Restart service ใน Render แล้วสถานะกลับเป็น Live | _รอผล_ |
| `totalElements` หลัง restart เท่าเดิม | _รอผล_ |
| Log ของ Flyway หลัง restart ไม่มี migration ใหม่ | _รอผล_ |
