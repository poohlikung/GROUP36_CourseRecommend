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

## 2. เทสต์ตัวกันพลาดของสคริปต์ (รันใน CI)

เพิ่มตามรีวิว PR #32: `restore` ต้องรู้ฐานต้นทางเสมอ และปฏิเสธฐาน production ตามชื่อ database เพราะ host แบบ direct กับ `-pooler` ของ Neon ต่างกันแม้ชี้ฐานเดียวกัน

```bash
pwsh -NoProfile -File test/scripts/backup-restore.Tests.ps1
```

| เคส | ผล |
| --- | :---: |
| `restore` โดยไม่ได้ตั้ง `COURSEHUB_SOURCE_DB_URL` หยุดทันที (exit code ไม่ใช่ 0) และแจ้งชื่อตัวแปร ก่อนเชื่อมต่อฐานปลายทาง | ผ่าน |
| ปลายทาง `neondb` ผ่าน host `-pooler` ขณะที่ต้นทางใช้ host direct ถูกปฏิเสธ | ผ่าน |
| ปลายทาง `neondb` ถูกปฏิเสธแม้ต้นทางเป็นฐานชื่ออื่น (อยู่ในรายชื่อฐาน production) | ผ่าน |
| ชื่อฐาน production ตัวพิมพ์ต่างกัน (`NeonDB`) ถูกปฏิเสธ | ผ่าน |
| ปลายทางชื่อเดียวกับต้นทางผ่าน host `-pooler` ถูกปฏิเสธ แม้ไม่อยู่ในรายชื่อ | ผ่าน |
| ปลายทางไม่ระบุชื่อ database ถูกปฏิเสธ | ผ่าน |
| ปลายทาง `coursehub_restore` ผ่านการตรวจ | ผ่าน |
| connection string แบบ JDBC ถูกปฏิเสธ | ผ่าน |

ผล: **8/8 ผ่าน** ทุกเคสตรวจด้วยว่าข้อความ error ไม่มีรหัสผ่าน และเมื่อนำเทสต์ชุดนี้ไปรันกับสคริปต์เวอร์ชันก่อนแก้ จะไม่ผ่าน

ทดสอบซ้ำกับ PostgreSQL บนเครื่องหลังแก้: `restore` ลง database ชื่อ `neondb` บนอีก server ถูกปฏิเสธ ส่วน backup → restore ลง `coursehub_restore` → verify ยังผ่าน

## 3. ทดสอบสคริปต์ `backup-restore.ps1` กับ PostgreSQL บนเครื่อง

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

## 4. Backup/restore กับ Neon จริง

รันเมื่อ 8 ตุลาคม 2026 เวลาประมาณ 22:40 น. (GMT+7) จากเครื่อง Windows ของผู้รับผิดชอบด้วย PowerShell และ PostgreSQL client tools ตามคู่มือข้อ 3–5 connection string อยู่ใน environment variable เท่านั้น

| รายการ | ผล |
| --- | --- |
| เวอร์ชัน | Neon PostgreSQL 18.6, `pg_dump` 18.4 (สคริปต์แสดง `server 18 / client 18`) |
| ต้นทาง → ปลายทาง | database `neondb` → database ว่าง `coursehub_restore` ใน branch `production` ของโปรเจกต์ `coursehub-db` |
| `backup` | สำเร็จ: `coursehub-20261008-224142.dump` ขนาด 42,359 bytes |
| SHA256 ของไฟล์ backup | `FD1264161BC15BCD9293918FB492EE12CBF27AE9D586D0597CAA86B04D057E64` |
| `restore` | สำเร็จ (`pg_restore --exit-on-error` ไม่มี error) |
| `verify` | ผ่าน: 13 ตาราง `Match = True`, `Flyway history ตรงกัน: True` |

ผลนับแถวจาก `verify`:

| Table | neondb | coursehub_restore | Match |
| --- | ---: | ---: | :---: |
| audit_logs | 6 | 6 | True |
| categories | 6 | 6 | True |
| course_categories | 8 | 8 | True |
| course_prices | 6 | 6 | True |
| courses | 6 | 6 | True |
| flyway_schema_history | 4 | 4 | True |
| platforms | 5 | 5 | True |
| provider_members | 1 | 1 | True |
| providers | 5 | 5 | True |
| reviews | 3 | 3 | True |
| saved_courses | 3 | 3 | True |
| user_profiles | 6 | 6 | True |
| users | 6 | 6 | True |

ภาพหน้าจอผล `backup` และ `verify` เก็บไว้กับผู้รับผิดชอบ ไม่ได้คอมมิตเข้า repo เพราะมีชื่อ host ของฐาน production (ไม่มีรหัสผ่านในภาพ) ไฟล์ `.dump` เก็บไว้ในเครื่องผู้รับผิดชอบเท่านั้นตามข้อ 2 ของคู่มือ

## 5. ข้อมูลคงอยู่หลัง restart backend บน Render

| รายการ | ผล |
| --- | --- |
| `GET /api/v1/courses?size=48` ก่อน restart | `totalElements: 6`, `totalPages: 1` |
| Render → Manual Deploy → Restart service | "Your server has successfully restarted" และสถานะกลับเป็น Live |
| `GET /api/v1/courses?size=48` หลัง restart | HTTP 200, `totalElements: 6` เท่าเดิม |

ข้อมูลไม่หายเพราะเก็บใน Neon ไม่ได้อยู่ใน filesystem ของ Render

หมายเหตุ: deploy ที่ Live บน Render ณ วันทดสอบคือ commit `8e1ac30` (merge PR #24) เพราะ service ตั้ง Root Directory เป็น `code/backend` Render จึง deploy ใหม่เฉพาะเมื่อไฟล์ในโฟลเดอร์นั้นเปลี่ยน และ PR #25–#30 ไม่ได้แก้ `code/backend` (ตรวจด้วย `git diff 8e1ac30 d1e8512 -- code/backend` แล้วไม่มีความต่าง) backend ที่ทดสอบจึงเป็นโค้ดเดียวกับ `develop` ล่าสุด

## 6. สรุป

| เกณฑ์ Task 24 | ผล |
| --- | :---: |
| restore สำเร็จ | ผ่าน (ทั้งเทสต์อัตโนมัติและ Neon จริง) |
| กันพลาด restore ทับ production | ผ่าน (8/8 เคสใน CI) |
| ตรวจข้อมูลคงอยู่ครบ | ผ่าน (13/13 ตาราง, Flyway history ตรงกัน, restart แล้วข้อมูลเท่าเดิม) |
| migration rehearsal | ผ่าน (Flyway validate ได้และไม่ migrate ซ้ำบนฐานที่ restore, sequence ใช้งานต่อได้) |
| มีหลักฐาน | รายงานนี้ + ภาพหน้าจอที่ผู้รับผิดชอบเก็บไว้ |
