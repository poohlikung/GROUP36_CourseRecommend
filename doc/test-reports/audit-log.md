# ผลทดสอบ UC19 ดู Audit Log

## ผลรอบแรก

- วันที่รัน: 10 ตุลาคม 2026 เวลา 18:43–18:55 ตามนาฬิกาเครื่อง ซึ่งเป็นเวลาไทยโดยประมาณ (ขณะนั้น Windows ตั้งเขตเวลาผิดเป็น `America/Montevideo`)
- Branch: `sorawit_6733800648_01`
- สภาพแวดล้อม: Windows, Java 21, Docker Desktop Engine 29.8.2, PostgreSQL 16 Alpine ผ่าน Testcontainers และ E2E Compose, Flyway V1–V4, Chromium ผ่าน Playwright
- ชุดสรุปผลที่สร้างจากไฟล์ทดสอบจริง: [audit-log-results.json](evidence/audit-log-results.json)

| คำสั่ง | ผลจริง | หลักฐาน |
| --- | --- | --- |
| จาก `code/backend`: `.\mvnw.cmd -B --no-transfer-progress verify` | **317 ผ่าน, 0 ล้มเหลว, 0 errors, 0 ข้าม**; BUILD SUCCESS | `code/backend/target/surefire-reports/TEST-*.xml`, `test/reports/audit-backend-verify.log` |
| จาก `code/frontend`: `npm run typecheck` | ผ่าน | `test/reports/audit-frontend-typecheck.log` |
| จาก `code/frontend`: `npm test` | **74 ผ่าน, 0 ล้มเหลว, 0 ข้าม** | `test/reports/audit-frontend-test.log` |
| จาก `code/frontend`: `npm run build` | ผ่าน; Vite production build สำเร็จ | `test/reports/audit-frontend-build.log` |
| จาก `test/e2e`: `npm run typecheck` | ผ่าน | `test/reports/audit-e2e-typecheck.log` |
| จาก `code/frontend`: `npm run test:e2e` | **17 ผ่าน, 0 ล้มเหลว, 0 ข้าม, 0 flaky**; Chromium ใช้ backend/PostgreSQL จริงใน Compose project แยก `coursehub-e2e-988c8e5f` | `test/reports/e2e/coursehub-e2e-988c8e5f/results.json`, `test/reports/e2e/coursehub-e2e-988c8e5f/junit.xml`, `test/reports/audit-e2e-final.log` |
| จาก root: `pwsh -File test/scripts/backup-restore.Tests.ps1` | **8 ผ่าน, 0 ล้มเหลว** | `test/reports/audit-backup-restore.log` |

ไฟล์ใต้ `target/` และ `test/reports/` เป็นหลักฐานที่สร้างจริงใน workspace นี้และถูก `.gitignore` ไว้ สามารถรันคำสั่งเดิมเพื่อสร้างใหม่ได้ สรุป JSON ที่ commit ไว้อ้างตัวเลขจาก JUnit XML และ Playwright `results.json` รอบสุดท้าย

## สิ่งที่ตรวจใน UC19

- `AuditLogQueryServiceTests`: ตัวกรองร่วมกัน ลำดับ `createdAt DESC, id DESC`, หน้าที่เกินจำนวนจริง, เวลาเริ่ม/สิ้นสุด, ชื่อสำรองเมื่อไม่มี profile, ค่า null และ entity ID ที่ไม่มีต้นทาง
- `AdminAuditLogControllerTests`: Admin อ่านได้, guest 401, learner/stale Admin role 403, บัญชีถูกระงับ 401, ค่าตัวกรองผิด 400, response ไม่มี password hash และ GET ไม่เพิ่ม Audit Log
- `AuditLogQueryPostgresIntegrationTests`: Spring Boot + Flyway + PostgreSQL จริง ตรวจ 12 แถวเวลาเดียวกัน, หน้า 10/2, ตัวกรองร่วม, เหตุผล/ผู้กระทำ, เวลาแบบช่วงครึ่งเปิด และประวัติที่ไม่มีแถวคอร์สต้นทาง
- `audit-logs.spec.ts`: สร้าง Provider/คอร์ส ส่งตรวจ อนุมัติ ระงับพร้อมเหตุผล เพิ่ม/ลบสมาชิก ตรวจรีวิว สร้างและลบคอร์สดราฟต์ผ่าน business API จริง; Admin ตรวจประวัติผ่าน API และหน้าเว็บ กรอง เปลี่ยนหน้า ตรวจจอเล็กและค้นหาด้วยคีย์บอร์ด รวมทั้งตรวจสิทธิ์ learner
- Full backend verify ครอบคลุม transaction/Observer เดิมและ workflow อื่น; full E2E ครอบคลุมเส้นทางผู้เรียน Provider Admin และการเริ่มระบบ

การรัน E2E ครั้งแรกพบเทสต์ใหม่เรียกหน้า login ขณะ session Admin ยัง active ทำให้หน้า login redirect และเทสต์ล้มเหลว แก้ fixture flow ให้เปิดหน้า Audit Log ด้วย session เดิม จากนั้น targeted E2E ผ่าน 2/2 และ full E2E รอบสุดท้ายผ่าน 17/17 ผลในตารางเป็นผลรอบสุดท้าย

## หมายเหตุเรื่องเขตเวลาในหลักฐาน

Windows เดิมแสดงเวลาหน้าปัดใกล้เคียงเวลาไทย แต่ตั้งเขตเวลาเป็น `America/Montevideo` (UTC−03:00) ทำให้ `generatedAt` ในหลักฐานเดิมเป็น `2026-10-10T18:54:43.6661165-03:00` และถูกตีความผิดเป็น `21:54 UTC` ทั้งที่เวลาจริงของเหตุการณ์อยู่ราว `11:53–11:55 UTC` (`18:53–18:55` เวลาไทย) ค่า offset เดิมจึงใช้ยืนยันเวลาจริงไม่ได้ เช่นเดียวกับ `e2e.startTime` ในไฟล์นั้น และ timestamp ของรอบแก้ไขก่อนหน้านี้ GitHub บันทึกว่า PR #42 เปิดเมื่อ `2026-10-10T12:01:53Z` ซึ่งสอดคล้องกับการสร้างหลักฐานรอบแรกก่อนเปิด PR ไม่ใช่หลังเปิด PR เกือบ 10 ชั่วโมง

เปลี่ยนเขตเวลา Windows เป็น `SE Asia Standard Time` (UTC+07:00) และซิงก์นาฬิกากับ NTP แล้ว โดยตรวจซ้ำพบ `2026-10-10T19:32:38+07:00` ตรงกับ `2026-10-10T12:32:38Z` ใน HTTP `Date` ของ GitHub และ NTP ต่างกันประมาณ 0.014 วินาที หลักฐานรอบเดิมเก็บ timestamp ดิบไว้เพื่อการตรวจสอบ แต่ไม่ใช้เป็นเวลา UTC ที่ถูกต้อง ผลทดสอบรอบใหม่ด้านล่างสร้างหลังแก้เวลาเครื่อง

## ทดสอบซ้ำหลังแก้ข้อเสนอแนะใน PR

ผลรอบใหม่บันทึกใน [audit-log-review-fixes.json](evidence/audit-log-review-fixes.json) โดยระบุเวลาสร้างสรุปทั้ง UTC และ `Asia/Bangkok` จากเวลาเดียวกันหลังซิงก์นาฬิกา พร้อมผล E2E ที่สร้างใหม่โดย Playwright

| คำสั่ง | ผลจริง | หลักฐานใน workspace |
| --- | --- | --- |
| จาก `code/backend`: `.\mvnw.cmd -B --no-transfer-progress verify` | **317 ผ่าน, 0 ล้มเหลว, 0 errors, 0 ข้าม**; BUILD SUCCESS | `code/backend/target/surefire-reports/TEST-*.xml`, `test/reports/audit-timefix-backend-verify.log` |
| จาก `code/frontend`: `npm run typecheck`, `npm test`, `npm run build` | typecheck/build ผ่าน; **106 เทสต์ผ่าน** | `test/reports/audit-timefix-frontend-typecheck.log`, `audit-timefix-frontend-test.log`, `audit-timefix-frontend-build.log` |
| จาก `test/e2e`: `npm run typecheck`; จาก `code/frontend`: `npm run test:e2e` | typecheck ผ่าน; **20 ผ่าน, 0 ล้มเหลว, 0 ข้าม, 0 flaky** ใน Compose project `coursehub-e2e-340bb210` | `test/reports/audit-timefix-e2e-typecheck.log`, `test/reports/e2e/coursehub-e2e-340bb210/results.json`, `test/reports/audit-timefix-e2e.log` |
| จาก root: `pwsh -File test/scripts/backup-restore.Tests.ps1` | **8 ผ่าน, 0 ล้มเหลว** | `test/reports/audit-timefix-backup-restore.log` |

เทสต์ frontend เพิ่มกรณีแก้ตัวกรองขณะอยู่หน้า 3 แล้วไม่ยิงคำขอก่อนกดค้นหา และกรณีช่วงเวลาผิดที่ยังแสดงผลเดิมพร้อมข้อความเตือนในฟอร์ม

## ขอบเขต

ผลนี้ยืนยันการทำงานบนเครื่อง local และฐานทดสอบที่แยกไว้ ไม่ได้ deploy branch นี้ไป production ส่วน Task 17 เรื่องการเขียน Audit Log ใน transaction และ Observer metrics มี [รายงานเดิม](task17-audit-observer.md) แยกต่างหาก
