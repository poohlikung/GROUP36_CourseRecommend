# 0002: การเลือกใช้ฐานข้อมูลเชิงสัมพันธ์ PostgreSQL และ Flyway Migration

- **สถานะ:** ยอมรับ (Accepted)
- **วันที่:** 15 กันยายน 2026
- **ผู้ตัดสินใจ:** ทีมพัฒนา กลุ่ม 36

---

## 1. บริบทและปัญหา (Context)
ระบบ CourseHub ต้องจัดเก็บข้อมูลคอร์ส ผู้เรียน สถาบัน รีวิว และประวัติการทำงาน ซึ่งมีโครงสร้างข้อมูลที่มีความสัมพันธ์ซับซ้อนตามเกณฑ์ของรายวิชา CP353002:
1. กำหนดให้ใช้ฐานข้อมูลแบบ SQL เท่านั้น (เช่น PostgreSQL, MySQL, MariaDB)
2. บังคับให้มีอย่างน้อย 6 ตาราง โดยต้องมีความสัมพันธ์ครบทั้ง **One-to-One** และ **One-to-Many** พร้อม Foreign Key Constraint, Indexes และ Fetch/Cascade Type ที่มีเหตุผล
3. บังคับให้มีระบบ Database Migration (เช่น Flyway หรือ Liquibase) เพื่อให้สามารถรันชุดคำสั่งสร้างฐานข้อมูลซ้ำได้อย่างถูกต้อง

---

## 2. การตัดสินใจ (Decision)
ทีมตัดสินใจเลือกใช้ **PostgreSQL** เป็นฐานข้อมูลหลัก และใช้ **Flyway** สำหรับการทำ Database Migration โดยมีรายละเอียดดังนี้:

1. **การออกแบบตาราง (Schema Core 12 ตาราง):**
   - **One-to-One:** ความสัมพันธ์ระหว่าง `users` และ `user_profiles` โดยใช้ Shared Primary Key (`@MapsId`) เพื่อบังคับให้ 1 User มีได้เพียง 1 Profile อย่างแท้จริง
   - **One-to-Many:** `providers` -> `courses`, `courses` -> `reviews` เป็นต้น
   - **Many-to-Many:** `courses` <-> `categories` ผ่าน Join Table `course_categories`
   - ตารางประกอบอื่น ๆ: `provider_members`, `platforms`, `course_prices`, `saved_courses`, `audit_logs`

2. **การจัดการ Migration ด้วย Flyway:**
   - เก็บไฟล์ SQL Script ไว้ที่ `src/main/resources/db/migration/` ในรูปแบบ `V1__...sql`, `V2__...sql`
   - ควบคุมการสร้าง Tables, Constraints, Indexes และ Foreign Keys ผ่านไฟล์ Migration จริง แทนการพึ่งพา Hibernate Auto-DDL ใน Production

3. **Cloud Database Provider:**
   - เลือกใช้ **Neon Free Serverless PostgreSQL** สำหรับ Cloud Environment
   - ใช้ **H2 In-memory Database** สำหรับการรัน Unit & Integration Test เฉพาะที่เครื่อง Local/CI เพื่อความสะดวกรวดเร็ว

---

## 3. ผลลัพธ์และข้อพิจารณา (Consequences)

### ข้อดี:
- มีประวัติ Schema Versioning ที่ตรวจสอบย้อนหลังได้ชัดเจน ไม่เกิดปัญหาตารางไม่ตรงกันในทีม
- ความสัมพันธ์แบบ One-to-One และ One-to-Many เป็นไปตามเกณฑ์ประเมินของวิชา
- Neon Serverless ช่วยประหยัดค่าใช้จ่าย (Free Tier) เหมาะสำหรับการส่งงาน

### ข้อจำกัด / สิ่งที่ต้องระวัง:
- Neon มีฟังก์ชัน Scale-to-Zero (หลับเมื่อไม่มีการใช้งาน) ดังนั้นแอปพลิเคชันต้องออกแบบให้ทนทานต่อช่วง Wake-up / Reconnect
- ต้องปิด Flyway ระหว่างรัน Test บน H2 เพื่อป้องกัน Syntax Error จาก Dialect ที่แตกต่างกัน
