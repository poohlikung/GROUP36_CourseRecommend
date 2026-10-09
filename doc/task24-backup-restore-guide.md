# Task 24 — Backup/restore และ migration rehearsal

คู่มือสำรองฐานข้อมูล CourseHub บน Neon, กู้คืนลงฐานทดสอบ, ตรวจว่าข้อมูลครบ และซ้อมก่อน migrate จริง

| ส่วน | ไฟล์ |
| --- | --- |
| สคริปต์ (Windows PowerShell) | `code/scripts/db/backup-restore.ps1` |
| เทสต์ซ้อม backup/restore อัตโนมัติ (รันใน CI) | `test/backend/integration/com/example/courserecommend/BackupRestoreRehearsalIntegrationTests.java` |
| เทสต์ตัวกันพลาดของสคริปต์ (รันใน CI job `Database script safety tests`) | `test/scripts/backup-restore.Tests.ps1` |
| ผลทดสอบและหลักฐาน | `doc/test-reports/task24-backup-restore.md` |

## 1. หลักการ

- ฐาน production คือ database `neondb` บน Neon ห้าม restore ทับฐานนี้โดยตรง
- backup ด้วย `pg_dump --format=custom --no-owner --no-acl` ได้ไฟล์ `.dump` ไฟล์เดียว ครบทั้ง schema ข้อมูล ประวัติ Flyway และค่า sequence
- restore ลง **ฐานว่าง** ที่แยกจาก production เสมอ แล้วเทียบจำนวนแถวทุกตารางและ `flyway_schema_history` กับต้นทาง
- `restore` ต้องตั้งทั้ง `COURSEHUB_SOURCE_DB_URL` และ `COURSEHUB_RESTORE_DB_URL` และปฏิเสธเมื่อ
  - ชื่อ database ปลายทางเป็นฐาน production (`neondb`, เปลี่ยนรายชื่อได้ด้วย `-ProtectedDatabase`)
  - ชื่อ database ปลายทางตรงกับต้นทาง ตัดสินจากชื่อฐาน ไม่ใช้ host เพราะ Neon มี host แบบ direct (`ep-xxx`) และ pooler (`ep-xxx-pooler`) ที่ชี้ฐานเดียวกัน
  - ปลายทางมีตารางอยู่แล้ว

## 2. ความปลอดภัย

- connection string ของ Neon มีรหัสผ่าน ใส่ใน environment variable ของ PowerShell หน้าต่างนั้นเท่านั้น ห้ามใส่ในไฟล์ที่คอมมิต ห้ามส่งในแชต
- ไฟล์ `.dump` มีอีเมลและ password hash ของผู้ใช้จริง เก็บในโฟลเดอร์ `backups/` (อยู่ใน `.gitignore` แล้ว) ห้ามอัปโหลดขึ้น GitHub หรือส่งให้คนอื่น และลบทิ้งเมื่อไม่ใช้แล้ว
- สคริปต์แสดงเฉพาะ host/ชื่อ database ไม่แสดง user หรือรหัสผ่าน แต่ก่อนแคปหน้าจอเป็นหลักฐานให้ตรวจอีกครั้งว่าไม่มีรหัสผ่านในภาพ

## 3. สิ่งที่ต้องติดตั้ง (Windows ไม่ต้องใช้ Docker)

1. ดูเวอร์ชัน PostgreSQL ของ Neon: Neon Console → SQL Editor รัน `SHOW server_version;` (ณ 8 ตุลาคม 2026 โปรเจกต์ `coursehub-db` เป็น **18.6**)
2. ติดตั้ง PostgreSQL client tools **major version เดียวกับ Neon** (ตอนนี้คือ 18) จากตัวติดตั้งของ EDB (https://www.enterprisedb.com/downloads/postgres-postgresql-downloads → Windows x86-64)
   - ห้ามใช้ client ที่ต่ำกว่า server (สคริปต์จะหยุดให้) และไม่ควรใช้สูงกว่า เพราะไฟล์จาก `pg_dump` รุ่นใหม่ไม่รับประกันว่าจะ restore ลง server รุ่นเก่าได้
   - ตอนเลือก components ให้ติ๊กเฉพาะ **Command Line Tools** (ไม่ต้องติดตั้ง PostgreSQL Server, pgAdmin, Stack Builder)
3. เพิ่ม `C:\Program Files\PostgreSQL\18\bin` เข้า PATH แล้วเปิด PowerShell ใหม่ ตรวจด้วย

   ```powershell
   pg_dump --version
   psql --version
   ```

## 4. เตรียมฐานทดสอบบน Neon

1. Neon Console → Databases → **New database** ชื่อ `coursehub_restore` (อยู่ใน branch เดียวกับ `neondb` แต่เป็นฐานแยก ว่างเปล่า)
2. กด **Connect** แล้วคัดลอก connection string 2 ชุด โดย**ปิด Connection pooling** (pg_dump/pg_restore ควรต่อแบบ direct ไม่ผ่าน pooler)
   - เลือกรูปแบบ **Connection string** ที่ขึ้นต้นด้วย `postgresql://` ห้ามใช้แบบ Java/JDBC (`jdbc:postgresql://...`) ซึ่งเป็นรูปแบบที่ Render ใช้ เพราะ psql/pg_dump อ่านไม่ได้
   - database `neondb` → ใช้เป็นต้นทาง
   - database `coursehub_restore` → ใช้เป็นปลายทาง

## 5. ขั้นตอน backup → restore → verify

เปิด PowerShell ที่โฟลเดอร์โปรเจกต์ แล้วตั้งค่าตัวแปรในหน้าต่างนั้น (ค่าจะหายเมื่อปิดหน้าต่าง)

```powershell
cd C:\Principles\Project
$env:COURSEHUB_SOURCE_DB_URL  = 'postgresql://<user>:<password>@<host>/neondb?sslmode=require'
$env:COURSEHUB_RESTORE_DB_URL = 'postgresql://<user>:<password>@<host>/coursehub_restore?sslmode=require'
```

Windows ปิดการรันสคริปต์ไว้โดยปริยาย จึงเรียกผ่าน `-ExecutionPolicy Bypass` เฉพาะคำสั่งนี้

```powershell
# 1) backup จาก neondb ได้ไฟล์ backups\coursehub-<วันเวลา>.dump พร้อม SHA256
powershell -ExecutionPolicy Bypass -File .\code\scripts\db\backup-restore.ps1 backup

# 2) restore ไฟล์นั้นลง coursehub_restore (ต้องเป็นฐานว่าง)
powershell -ExecutionPolicy Bypass -File .\code\scripts\db\backup-restore.ps1 restore -DumpFile backups\coursehub-<วันเวลา>.dump

# 3) เทียบจำนวนแถวทุกตารางและ flyway_schema_history ระหว่าง neondb กับ coursehub_restore
powershell -ExecutionPolicy Bypass -File .\code\scripts\db\backup-restore.ps1 verify
```

ผลที่ต้องได้จาก `verify`: ทุกแถวในตารางมี `Match = True`, `Flyway history ตรงกัน: True` และบรรทัดสุดท้าย `ผ่าน: ข้อมูลครบทั้ง 13 ตาราง` (12 ตารางของระบบ + `flyway_schema_history`) ถ้าไม่ตรง สคริปต์จะจบด้วย exit code 1

> ถ้ามีคนใช้งานเว็บระหว่าง backup กับ verify จำนวนแถวของ `neondb` อาจเพิ่มขึ้นจนไม่ตรง ให้ทำในช่วงที่ไม่มีคนใช้ หรือ backup ใหม่แล้ว restore ลงฐานว่างอีกครั้ง

ภาพหน้าจอผล `backup` และ `verify` ใช้เป็นหลักฐานใน `doc/test-reports/task24-backup-restore.md`

## 6. ตรวจว่าข้อมูลไม่หายเมื่อ backend restart

1. เรียก `https://coursehub-backend-ahz2.onrender.com/api/v1/courses?size=48` (API จำกัด `size` ไม่เกิน 48) แล้วจด `totalElements`
2. Render Dashboard → `coursehub-backend` → **Manual Deploy → Restart service** (หรือ Deploy latest commit)
3. รอสถานะ Live แล้วเรียก URL เดิมอีกครั้ง `totalElements` ต้องเท่าเดิม และ Log ของ Render ต้องไม่มีการ migrate ซ้ำ (Flyway แจ้งว่า schema up to date)

ข้อมูลอยู่ใน Neon ไม่ได้อยู่ใน filesystem ของ Render จึงไม่หายเมื่อ restart หรือ redeploy

## 7. Migration rehearsal ก่อนเพิ่ม migration ใหม่ (เช่น V5)

ทำทุกครั้งก่อน merge PR ที่เพิ่มไฟล์ใน `code/backend/src/main/resources/db/migration/` เพราะ Render จะ migrate `neondb` อัตโนมัติเมื่อ deploy

1. CI ต้องผ่าน `FlywayMigrationIntegrationTests` (migrate ฐานว่าง) และ `BackupRestoreRehearsalIntegrationTests` (backup → restore → Flyway validate โดยไม่ migrate ซ้ำ)
2. backup `neondb` ตามข้อ 5 ก่อน merge และเก็บไฟล์ไว้จนกว่า deploy ใหม่จะใช้งานได้
3. ซ้อมกับข้อมูลจริง: restore ลง `coursehub_restore` แล้วรัน backend จาก branch ใหม่บนเครื่องโดยชี้ไปฐานนี้ (ต้องมี Java 21)

   ```powershell
   cd code\backend
   $env:DATABASE_URL = 'jdbc:postgresql://<host>/coursehub_restore?sslmode=require'
   $env:DATABASE_USERNAME = '<user>'
   $env:DATABASE_PASSWORD = '<password>'
   .\mvnw.cmd spring-boot:run
   ```

   Log ต้องมี `Successfully applied 1 migration` ของเวอร์ชันใหม่ และแอปเริ่มทำงานได้ (Hibernate `validate` ผ่าน)
4. ถ้าผ่านค่อย merge; ถ้าไม่ผ่านแก้ migration ก่อน ห้ามแก้ไฟล์ migration ที่เคยรันบน production แล้ว ให้เพิ่มเวอร์ชันใหม่แทน

## 8. กู้ระบบเมื่อ production มีปัญหา

ห้าม `pg_restore` ทับ `neondb` ขณะที่ระบบยังใช้งานอยู่ ให้กู้ลงฐานใหม่แล้วสลับ backend ไปใช้

1. หยุดการเขียนข้อมูล: แจ้งทีม และ Suspend service ใน Render ถ้าจำเป็น
2. เลือกแหล่งข้อมูล
   - ถ้าเหตุเกิดไม่นานและยังอยู่ในช่วงที่ Neon เก็บประวัติไว้ ใช้ Neon Console → **Backup & Restore / Branches** สร้าง branch จากเวลาก่อนเกิดปัญหา (ดูระยะเวลาที่แพ็กเกจปัจจุบันรองรับใน Console)
   - ถ้าเกินช่วงนั้น ใช้ไฟล์ `.dump` ล่าสุด: สร้าง database ว่างใหม่ แล้วรัน `restore` และ `verify` ตามข้อ 5 โดยให้ `COURSEHUB_RESTORE_DB_URL` ชี้ฐานใหม่
3. เปลี่ยน `DATABASE_URL` (และ username/password ถ้าเปลี่ยน) ใน Render → Environment ให้ชี้ฐานที่กู้แล้ว แล้ว Deploy
4. ตรวจ `GET /api/v1/system/liveness`, `GET /api/v1/courses` และ login ด้วยบัญชีทดสอบ
5. บันทึกเวลาเกิดเหตุ ไฟล์/branch ที่ใช้กู้ และผลตรวจไว้ใน test report

## 9. เก็บกวาดหลังทดสอบ

- ลบ database `coursehub_restore` ใน Neon Console (Free plan มีพื้นที่จำกัด)
- ลบไฟล์ใน `backups/` ที่ไม่ต้องใช้แล้ว
- ปิดหน้าต่าง PowerShell เพื่อล้างตัวแปรที่มีรหัสผ่าน
- PowerShell บันทึกคำสั่งที่พิมพ์ไว้ในไฟล์ประวัติ (รวมบรรทัดที่ตั้ง `$env:COURSEHUB_..._DB_URL`) ให้เปิด `(Get-PSReadLineOption).HistorySavePath` แล้วลบบรรทัดที่มี connection string ออก

## 10. Linux / macOS

ใช้คำสั่งเดียวกับที่สคริปต์เรียก (ต้องมี `postgresql-client` เวอร์ชันไม่ต่ำกว่า server)

```bash
pg_dump --format=custom --no-owner --no-acl --file=backups/coursehub.dump --dbname="$COURSEHUB_SOURCE_DB_URL"
pg_restore --no-owner --no-acl --exit-on-error --dbname="$COURSEHUB_RESTORE_DB_URL" backups/coursehub.dump
```

SQL ที่ใช้นับแถวทุกตารางอยู่ในสคริปต์ PowerShell (`$RowCountSql`) และในเทสต์ `BackupRestoreRehearsalIntegrationTests`
