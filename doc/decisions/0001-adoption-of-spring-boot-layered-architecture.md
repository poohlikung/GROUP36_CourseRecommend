# 0001: การเลือกใช้ Java Spring Boot และสถาปัตยกรรม Layered Architecture

- **สถานะ:** ยอมรับ (Accepted)
- **วันที่:** 15 กันยายน 2026
- **ผู้ตัดสินใจ:** ทีมพัฒนา กลุ่ม 36

---

## 1. บริบทและปัญหา (Context)
ตามข้อกำหนดของรายวิชา **CP353002 Principles of Software Design and Development** โครงงานต้องพัฒนาด้วยเทคโนโลยีที่ตอบสนองเกณฑ์การเรียนรู้ด้านการออกแบบเชิงวัตถุ (OOP), หลักการ SOLID และ Design Patterns โดยมีข้อบังคับเฉพาะดังนี้:
1. ฝั่ง Backend ต้องใช้ Java 17+ ร่วมกับ Spring Boot 3.x+ (หรือ 4.x)
2. โครงสร้างโปรเจคต้องเป็นสถาปัตยกรรมแบบหลายชั้น (Layered Architecture) อย่างชัดเจน และห้ามเรียกข้าม Layer (Strict Layer Separation)
3. ต้องรองรับการทำ Dependency Injection และแยกสัดส่วนความรับผิดชอบอย่างเคร่งครัด

เดิมทีทีมมีการพิจารณาภาษา Rust แต่ขัดกับข้อกำหนดของรายวิชา จึงจำเป็นต้องบันทึกการตัดสินใจปรับเปลี่ยนเป็นทางการ

---

## 2. การตัดสินใจ (Decision)
ทีมตัดสินใจเลือกใช้ **Java 21 LTS ร่วมกับ Spring Boot** และวางโครงสร้างแบบ **Layered Architecture (3-Tier)** ดังนี้:

1. **Presentation Layer (`controller`):**
   - ใช้ `@RestController` จัดการ HTTP Request / Response ตามมาตรฐาน RESTful API
   - กำหนด Prefix มาตรฐานเป็น `/api/v1/*`
   - ตรวจสอบความถูกต้องของข้อมูลนำเข้าด้วย `@Valid` (Bean Validation)
   - จัดการ Error กลางด้วย `@RestControllerAdvice`
   - **ข้อห้าม:** Controller ห้ามเรียก Repository โดยตรง และห้ามมี Business Logic

2. **Service Layer (`service` & `service/impl`):**
   - แยก Interface และ Implementation ออกจากกันเพื่อรองรับ Dependency Inversion (SOLID-D)
   - บรรจุ Business Rules, Transaction Management (`@Transactional`) และการตรวจสอบสิทธิ์ความเป็นเจ้าของ (Ownership)

3. **Repository Layer (`repository`):**
   - ใช้งาน Spring Data JPA ในการติดต่อฐานข้อมูล (Data Access)
   - ปฏิบัติตาม Repository Pattern เพื่อซ่อนรายละเอียดการสืบค้นข้อมูล

4. **Domain / Entity Layer (`domain`):**
   - นิยาม JPA Entities, Enums และ Invariants
   - ใช้งาน Request/Response DTO แยกขาดจาก Entity โดยใช้ Mapper แปลงข้อมูลเสมอ

---

## 3. ผลลัพธ์และข้อพิจารณา (Consequences)

### ข้อดี:
- เป็นไปตามข้อกำหนดวิชา CP353002 ครบถ้วน 100%
- โครงสร้างโค้ดอ่านง่าย แยกหน้าที่ชัดเจน (Single Responsibility Principle)
- ง่ายต่อการเขียน Unit Test และ Mocking ในระดับ Service โดยไม่ต้องเปิดเซิร์ฟเวอร์จริง
- รองรับการขยายไปสู่ GoF Design Patterns ได้อย่างลงตัว

### ข้อจำกัด / สิ่งที่ต้องระวัง:
- ต้องเขียนโค้ดเพิ่มขึ้นสำหรับการแปลงข้อมูลระหว่าง DTO และ Entity
- สมาชิกในทีมต้องระมัดระวังไม่ให้ Controller เรียกหา Repository โดยตรงเด็ดขาด
