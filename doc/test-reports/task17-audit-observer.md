# Task 17 — AuditLog transaction + Observer metrics: test report

- วันที่รัน: 6 ตุลาคม 2026 (Asia/Bangkok)
- Branch: `supawat_6733800622_01`
- ฐานงาน: `9f6f2b6` ซึ่งรวม Task 15 แล้ว
- Revision โค้ด/เทสต์ที่ตรวจ: `fc73ce8` (รวม commits `3bc990a`, `b07457a`, `69db7d6`); commit ถัดไปแก้เอกสารเท่านั้น
- เครื่องที่รัน: Windows, Temurin Java 25.0.3, Maven 3.9.16; compilation target Java 21 ตาม `pom.xml`
- ฐานข้อมูล: H2 สำหรับ tests ทั่วไป และ PostgreSQL 16 Alpine ผ่าน Docker/Testcontainers 1.21.4 พร้อม Flyway V1–V3 สำหรับ integration tests

## ผลการตรวจ

| ชุดตรวจ | ผล | สิ่งที่ยืนยัน |
| --- | --- | --- |
| `AuditTransactionPostgresIntegrationTests` | 22/22 ผ่าน | ธุรกิจ/audit atomicity ของ 4 workflow, audit insert failure, outer rollback, counter ก่อน/หลัง commit, moderation ทั้ง 6 transitions, stale version, concurrent API requests และ metrics failure สองแบบ |
| `CourseEventPublicationIntegrationTests` | 23/23 ผ่าน | Event payload ตรง audit, ส่งครั้งเดียวเมื่อสถานะเปลี่ยนจริง, immutable snapshot, คำสั่งที่ไม่ส่ง event และ MANDATORY transaction |
| `CourseMetricsTransactionIntegrationTests` | 3/3 ผ่าน | Spring AFTER_COMMIT callback จริง, rollback ไม่เพิ่ม counter และ event นอก transaction ถูกละเว้น |
| `CourseMetricsListenerTests` | 4/4 ผ่าน | รวมข้อมูลต่าง course/actor ใน tags ชุดเดิม, แยก transition และจับ/log registry กับ increment failures |
| `MetricsConfigTests` | 2/2 ผ่าน | ใช้ SimpleMeterRegistry โดยปริยายและใช้ registry ที่มีอยู่โดยไม่สร้างซ้ำ |
| Backend `verify` ทั้งหมด | **236/236 ผ่าน**, 0 failures, 0 errors, 0 skipped | รวม tests Task 17 ทั้ง 54 กรณี, regression ของระบบเดิม และสร้าง Spring Boot executable JAR สำเร็จ |
| `git diff --check` | ผ่าน | ไม่มี whitespace errors ในการแก้ไข |

## คำสั่งที่รันจริง

รันใน `code/backend` หลัง Docker engine พร้อม:

```powershell
mvn -o -B --no-transfer-progress '-Dtest=AuditTransactionPostgresIntegrationTests,CourseMetricsTransactionIntegrationTests,CourseMetricsListenerTests,MetricsConfigTests' test
mvn -o -B --no-transfer-progress verify
```

คำสั่งแรกผ่าน 31 กรณี ส่วน `verify` ผ่าน 236 กรณีและ BUILD SUCCESS ใช้เวลาประมาณ 54 วินาที โหมด `-o` ใช้ dependency cache ที่เตรียมไว้แล้ว เครื่องที่ยังไม่มี cache ให้เอา `-o` ออก

Maven logs อยู่ในไฟล์ ignored `code/backend/target/step17-commit4-tests.log` และ `code/backend/target/step17-full-verify.log`; JUnit XML/text reports อยู่ใน `code/backend/target/surefire-reports/` ไฟล์เหล่านี้สร้างใหม่ได้จากคำสั่งด้านบน

## หลักฐานสำคัญ

- ไม่ใช้ test-managed `@Transactional` ใน PostgreSQL contract tests: fixture commit จริง และอ่านผลจาก transaction ใหม่หลัง service จบ
- จำลอง audit failure ด้วย CHECK constraint ชั่วคราวบน PostgreSQL ซึ่งปฏิเสธ audit INSERT ของ actor ใน test จริง ลบ constraint ใน `finally`; ไม่ mock repository แทนฐานข้อมูล
- Outer rollback test flush ธุรกิจและ audit แล้วตรวจว่าทั้งสองอยู่ใน transaction ก่อนโยน exception หลัง rollback ทั้งข้อมูลเดิม, version, timestamp, reason และ content กลับเป็นเดิม Counter ยังไม่ถูกสร้าง
- Concurrency test ใช้ barrier ให้สอง transaction cache Course version 0 ก่อนเรียก MockMvc ผ่าน transaction เดิม ไม่มี sleep เพื่อหวังให้เกิด race ได้ response 200/409 และหลังจบเหลือสถานะ PUBLISHED, version 1, audit หนึ่งรายการ และ counter หนึ่งครั้ง
- Metrics failure tests ใช้ spy registry เพื่อจำลอง failure ของ registry/counter เท่านั้น ส่วน service, transaction, audit และ PostgreSQL ทำงานจริง API ตอบ 200 หลัง commit และมี error log พร้อม stack trace
- SQL constraint error และ metrics error log ในชุดทดสอบเป็นความล้มเหลวที่ตั้งใจจำลอง ทุก test assert ผลลัพธ์แล้วผ่าน

## ขอบเขตผลทดสอบ

รอบนี้ตรวจ backend และ API ผ่าน MockMvc รวมทั้ง build JAR ไม่มีการแก้ frontend และไม่ได้รัน browser E2E สถิติเป็น process-local best-effort ไม่รับประกันการกู้คืนหลัง process crash การรวม counters จากหลาย instance หรือ retry/replay; AuditLog เป็นข้อมูลถาวรสำหรับตรวจประวัติ
