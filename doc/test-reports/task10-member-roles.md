# Task 10 — Member roles และ ownership backend: Test report

- วันที่รัน: 29 กันยายน 2026
- Branch: `supawat_6733800622_01`
- Backend: Spring Boot 3.5.16, Java 25 (compile target 17), PostgreSQL Testcontainers `postgres:16-alpine`

## คำสั่งและผลจริง

รันจาก `code/backend` ด้วย Maven ที่ติดตั้งในเครื่องและ cache เดิม:

| คำสั่ง | ผล |
| --- | --- |
| `mvn '-Dmaven.repo.local=C:\Users\supaw\.m2\repository' '-Dtest=ProviderMemberPostgresIntegrationTests' test` | ผ่าน 6/6, failures 0, errors 0 |
| `mvn '-Dmaven.repo.local=C:\Users\supaw\.m2\repository' test` | ผ่านทั้ง backend suite 57/57, failures 0, errors 0 |

ชุด PostgreSQL ใช้ Flyway migrations จริงและ `spring.jpa.hibernate.ddl-auto=validate` ทดสอบ session, CSRF, สิทธิ์ Owner/Admin, response ที่ไม่เปิดเผย password hash, audit rollback, การเพิ่มสมาชิกซ้ำสองคำขอพร้อมกัน (ได้ `201` และ `409`; สมาชิก/audit เพิ่มรายการเดียว) และการลบ Owner สองคำขอพร้อมกัน (ได้ `204` และ `409`; เหลือ Owner หนึ่งคน)

ชุด H2 ตรวจ service และ API รวมถึง Editor, member ID ข้าม Provider, validation, error format, OpenAPI ที่สร้างจาก annotations, audit และ rollback ตอนเพิ่ม/ลบสมาชิก ผลเหล่านี้แยกจากหลักฐาน PostgreSQL ข้างต้น

## ข้อจำกัดและเหตุการณ์ระหว่างรัน

- เครื่องนี้ไม่พบคำสั่ง `docker` ใน PATH และไม่พบ Docker Desktop ในตำแหน่งติดตั้งมาตรฐาน แต่ Testcontainers เชื่อม container runtime ได้จริง: PostgreSQL tests และ Flyway migration test ผ่านใน full suite จึงยืนยัน PostgreSQL จากผลทดสอบ ไม่ใช้ H2 แทน
- full suite รอบแรกไม่ผ่าน 5 tests เพราะ fixture ใหม่สร้าง `users` โดยไม่มี `user_profiles` ทำให้ login ล้ม แก้ fixture แล้วรัน PostgreSQL tests และ full suite ซ้ำจนผ่านทั้งหมด
- Maven wrapper ของ repo เริ่มไม่ขึ้นใน PowerShell บนเครื่องนี้ จึงใช้ Maven 3.9.16 ที่ติดตั้งไว้พร้อม local dependency cache คำสั่งและผลด้านบนเป็นผลจากวิธีนี้
- งานนี้ยังไม่เพิ่ม Provider registration, Provider/Course CRUD, UI หรือ API เปลี่ยนบทบาทสมาชิกเดิม ตามขอบเขต Task 10
