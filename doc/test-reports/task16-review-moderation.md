# Task 16: ผลทดสอบการตรวจรีวิว

- วันที่รัน: 6 ตุลาคม 2026
- Branch: `sorawit_6733800648_01`
- Java 21, Maven 3.9.16 และ H2 สำหรับเทสต์ Backend ที่รันในเครื่อง

| ชุดตรวจ | ผล |
| --- | --- |
| `AdminReviewModerationControllerTests` | 6/6 ผ่าน: สิทธิ์, คิว, อนุมัติ, ปฏิเสธพร้อมเหตุผล, version, AuditLog, รายการสาธารณะ และแก้รีวิวเพื่อส่งตรวจใหม่ |
| `AdminModerationControllerTests` | 9/9 ผ่าน: หน้า Admin เดิมของ Task 15 หลังย้ายตัวตรวจสิทธิ์ร่วม |
| Frontend `review-moderation` และ `admin-moderation` | 4/4 ผ่าน |
| Frontend production build | ผ่าน |
| `FlywayMigrationIntegrationTests` สำหรับ V4 | เพิ่มเทสต์ตรวจคอลัมน์และประวัติ migration แล้ว; ยังไม่ได้รันในเครื่องนี้เพราะไม่มี Docker |

เทสต์ `ReviewControllerIntegrationTests` เดิมและ Flyway V4 กับ PostgreSQL จริงต้องรันในสภาพแวดล้อมที่มี Docker ก่อน merge หรือ deploy
