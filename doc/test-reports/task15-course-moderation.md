# Task 15 — Course moderation: test report

- วันที่รัน: 6 ตุลาคม 2026
- Branch: `sorawit_6733800648_01` (อัปเดตแบบ fast-forward จาก `develop` ก่อนเริ่ม Task 15)
- Java: Temurin 21, Maven 3.9.16, H2 สำหรับ controller/service tests
- ตรวจซ้ำหลังแยก Task 15 เป็น service ตามงาน: 6 ตุลาคม 2026

| ชุดตรวจ | ผล |
| --- | --- |
| `CourseWorkflowTests` | 2/2 ผ่าน: transition ที่อนุญาตและที่ต้องปฏิเสธ |
| `AdminModerationControllerTests` | 9/9 ผ่าน: สิทธิ์ Admin ใน session/ฐานข้อมูล, อนุมัติ, เหตุผล, stale version, Provider ไม่ active, AuditLog; เพิ่มเคสระงับ Provider ต้องมีเหตุผลและ stale version ไม่เพิ่ม AuditLog |
| `CourseControllerTests` | 19/19 ผ่าน: Course API เดิม |
| `CourseServiceTests` | 34/34 ผ่าน: กฎ Course เดิม |
| Frontend Vitest | รอบเดิม 25/25 ผ่าน รวม `admin-moderation.test.tsx` 2 เคส; รอบ refactor ไม่ได้แก้ frontend |
| Frontend TypeScript และ production build | รอบเดิมผ่าน; รอบ refactor ไม่ได้แก้ frontend |
| `FlywayMigrationIntegrationTests` สำหรับ V3 | เพิ่มเคสตรวจคอลัมน์และประวัติ migration แล้ว; ยังไม่ได้รันในเครื่องนี้เพราะไม่มี Docker |

ยังไม่ได้รัน Flyway V3 กับ PostgreSQL จริงหรือทดสอบผ่าน browser แบบ end-to-end ในรอบนี้ Migration เพิ่ม `VARCHAR(1000)` สองคอลัมน์; CI/Testcontainers ต้องผ่านก่อน merge หรือ deploy
