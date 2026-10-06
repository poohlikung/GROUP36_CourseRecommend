# Task 18: Concurrency และสิทธิ์ในการแก้คอร์ส

ตรวจวันที่ 7 ตุลาคม 2026 ด้วย PostgreSQL 16 ผ่าน Testcontainers

| กรณี | สิ่งที่ตรวจ | ผล |
| --- | --- | --- |
| ถอนสมาชิก | เจ้าของแก้คอร์สได้ก่อนถอนสิทธิ์ หลังถอนแล้วสร้าง แก้ ส่งตรวจ และลบผ่าน API ไม่ได้; ข้อมูลและ audit ไม่เปลี่ยน | ผ่าน |
| แก้พร้อมกัน | สอง transaction อ่าน version เดียวกันแล้วแก้ชื่อกับราคา; สำเร็จเพียงหนึ่งรายการ และ audit ตรงกับข้อมูลที่บันทึก | ผ่าน |
| สร้างแล้ว audit ล้มเหลว | ฐานข้อมูลปฏิเสธ audit INSERT; คอร์ส ราคา และความสัมพันธ์หมวดหมู่ rollback ทั้งหมด | ผ่าน |

รัน `mvn test` ใน `code/backend`: 239 tests, 0 failures, 0 errors, 0 skipped

เทสต์อยู่ใน `AuditTransactionPostgresIntegrationTests` และใช้ service/API จริงกับ PostgreSQL ไม่ได้จำลอง transaction หรือ repository
