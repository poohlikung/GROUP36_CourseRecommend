# Test Plan — CourseHub

## ข้อมูลเอกสาร

- ชื่อระบบ: CourseHub (คอร์สดีบอกต่อ)
- ทีมพัฒนา: กลุ่ม 36
- เอกสาร: Test Plan และ Acceptance Criteria
- สถานะ: Draft
- วันที่ปรับปรุงล่าสุด: 6 ตุลาคม 2026 (เพิ่มหลักฐาน Task 19 backend)

## วัตถุประสงค์

เอกสารนี้ใช้กำหนดขอบเขตการทดสอบ วิธีการทดสอบ และเกณฑ์ยอมรับของระบบ CourseHub เพื่อให้ทีมตรวจสอบได้ว่า Backend, Frontend และฐานข้อมูลทำงานตรงตามข้อกำหนด

## ขอบเขตการทดสอบ

ฟีเจอร์ที่อยู่ในขอบเขตการทดสอบประกอบด้วย:

1. การสมัครสมาชิกและเข้าสู่ระบบ
2. การออกจากระบบและจัดการ Session
3. การดูและแก้ไขโปรไฟล์
4. การค้นหา กรอง เรียง และแบ่งหน้ารายการคอร์ส
5. การบันทึกและยกเลิกบันทึกคอร์ส
6. การจัดการ Provider และสมาชิกของ Provider
7. การสร้างและจัดการ Course
8. การเขียนและตรวจสอบ Review
9. การตรวจสอบและเปลี่ยนสถานะ Course
10. ระบบแนะนำคอร์สและแบบทดสอบ Matcher
11. การตรวจสอบสิทธิ์ของผู้ใช้งาน
12. การทำงานร่วมกันระหว่าง Frontend, Backend และ Database

## 4. ระดับการทดสอบ

### 4.1 Unit Test

ใช้ทดสอบ business logic ของ Service, validation, permission และกฎการเปลี่ยนสถานะ โดยแยกจากฐานข้อมูลและระบบภายนอก

เครื่องมือ Test
- JUnit 5
- Mockito

### Integration Test

ใช้ทดสอบ Controller, Service, Repository, Spring Security และ PostgreSQL ร่วมกัน รวมถึง HTTP status และรูปแบบ response ของ API

เครื่องมือ Test การเชื่อมกันของหลายระบบจ้า

- Spring Boot Test
- MockMvc
- Testcontainers PostgreSQL

### Frontend Test

ใช้ทดสอบการแสดงผล การกรอกแบบฟอร์ม การกดปุ่ม และการตอบสนองต่อผลลัพธ์จาก API

เครื่องมือทดสอบฟ้อนเอ็น

- Vitest
- React Testing Library

### End-to-End Test

ใช้ทดสอบเส้นทางการใช้งานจริงตั้งแต่หน้าเว็บ ส่งคำขอไปยัง Backend และบันทึกข้อมูลลงฐานข้อมูล

ตัวอย่างเส้นทางสำคัญ:

- ผู้ใช้สมัครสมาชิกและเข้าสู่ระบบ
- ผู้ให้บริการสร้างคอร์ส
- Admin อนุมัติคอร์ส
- ผู้เรียนค้นหาและบันทึกคอร์ส
- ผู้เรียนเขียนรีวิวและ Admin อนุมัติรีวิว

## Test Environment

### Backend

- Java 21
- Spring Boot
- Maven Wrapper
- PostgreSQL 16
- Docker และ Docker Compose

### Frontend

- Node.js
- npm
- React
- TypeScript
- Vite

### Browser

- Google Chrome รุ่นปัจจุบัน
- Microsoft Edge รุ่นปัจจุบัน

## 6. คำสั่งสำหรับรันทดสอบ

### Backend

Linux กับ MacOS
```bash
cd code/backend
./mvnw test

```

Windows:

```powershell
cd code/backend
.\mvnw.cmd test
```

### Frontend

```bash
cd code/frontend
npm install
npm test
npm run typecheck
npm run build
```

## 7. Acceptance Criteria

Acceptance Criteria คือเงื่อนไขขั้นต่ำที่แต่ละฟีเจอร์ต้องทำได้ จึงจะถือว่าฟีเจอร์นั้นผ่านการตรวจรับ

| ฟีเจอร์ | เกณฑ์การผ่าน |
| --- | --- |
| สมัครสมาชิก | ผู้ใช้สมัครด้วยข้อมูลที่ถูกต้องได้ ระบบสร้างบัญชีและเข้าสู่ระบบให้อัตโนมัติ |
| เข้าสู่ระบบ | ผู้ใช้เข้าสู่ระบบด้วยอีเมลและรหัสผ่านที่ถูกต้องได้ หากรหัสผ่านผิดต้องได้รับ HTTP 401 |
| ออกจากระบบ | เมื่อออกจากระบบ Session ต้องถูกยกเลิก และไม่สามารถเข้าถึงหน้าส่วนตัวได้ |
| CSRF Protection | คำขอ POST, PUT และ DELETE ที่ไม่มี CSRF token ต้องถูกปฏิเสธ |
| โปรไฟล์ผู้ใช้ | ผู้ใช้ที่เข้าสู่ระบบสามารถดูและแก้ไขโปรไฟล์ของตนเองได้ แต่ไม่สามารถแก้ไขข้อมูลของผู้ใช้อื่น |
| Catalog | แสดงเฉพาะคอร์สสถานะ PUBLISHED จาก Provider ที่ ACTIVE |
| ค้นหาและกรองคอร์ส | ผู้ใช้ค้นหา กรองหมวดหมู่ แพลตฟอร์ม ระดับ ภาษา และราคาได้ |
| เรียงและแบ่งหน้า | ระบบเรียงลำดับและแบ่งหน้ารายการคอร์สได้ โดยจำนวนข้อมูลและจำนวนหน้าต้องถูกต้อง |
| Bookmark | ผู้ใช้ที่เข้าสู่ระบบสามารถบันทึกและยกเลิกบันทึกคอร์สได้ การบันทึกซ้ำต้องไม่สร้างข้อมูลซ้ำ |
| รายการ Bookmark | ผู้ใช้เห็นเฉพาะ Bookmark ของตนเอง และไม่เห็นคอร์สที่ถูกซ่อนหรือ Provider ที่ไม่ Active |
| Provider | ผู้ใช้ที่มีสิทธิ์สามารถสร้าง อ่าน แก้ไข และลบ Provider ตามเงื่อนไขของระบบ |
| Provider Member | Owner และ Editor ใช้งานได้ตามสิทธิ์ และไม่สามารถแก้ Provider ที่ไม่ได้เป็นสมาชิก |
| Course CRUD | ผู้ใช้ที่มีสิทธิ์สามารถสร้าง อ่าน แก้ไข และลบ Course ตามสถานะและเงื่อนไขที่กำหนด |
| Review | ผู้ใช้สามารถเขียนและแก้ไขรีวิวของตนเองได้ โดยหนึ่งคนมีรีวิวต่อหนึ่งคอร์สได้ไม่เกินหนึ่งรายการ |
| Course Moderation | Admin สามารถอนุมัติ ขอแก้ไข ระงับ และ Archive คอร์สตามลำดับสถานะที่อนุญาต |
| Review Moderation | Admin สามารถอนุมัติหรือปฏิเสธรีวิว และคะแนนเฉลี่ยต้องใช้เฉพาะรีวิวที่อนุมัติแล้ว |
| Matcher | ระบบกรองคอร์สตามงบประมาณ ภาษา และระดับ ก่อนนำคอร์สที่ผ่านมาจัดอันดับ |
| Permission | ผู้ใช้ทั่วไปต้องไม่ได้รับสิทธิ์ของ Admin และต้องไม่สามารถเข้าถึงข้อมูลส่วนตัวของผู้อื่น |
| Error Response | API ส่ง error ในรูปแบบเดียวกัน โดยมี status, code, message, path และ fieldErrors |
| ข้อมูลลับ | API response ต้องไม่มีรหัสผ่าน, password hash, CSRF token หรือข้อมูลลับอื่น |


## 8. Test Cases แบบ Given–When–Then

### TC-01 สมัครสมาชิกสำเร็จ

- **Given:** ผู้ใช้ยังไม่มีบัญชีและกรอกอีเมล รหัสผ่าน และชื่อที่แสดงถูกต้อง
- **When:** ผู้ใช้ส่งคำขอสมัครสมาชิก
- **Then:** ระบบสร้างบัญชี เข้าสู่ระบบให้อัตโนมัติ และคืน HTTP 201

### TC-02 ไม่สามารถสมัครด้วยอีเมลซ้ำ

- **Given:** มีบัญชีที่ใช้อีเมลนี้อยู่แล้ว
- **When:** ผู้ใช้สมัครสมาชิกด้วยอีเมลเดิม
- **Then:** ระบบไม่สร้างบัญชีซ้ำและคืน HTTP 409

### TC-03 เข้าสู่ระบบด้วยรหัสผ่านผิด

- **Given:** ผู้ใช้มีบัญชีอยู่ในระบบ
- **When:** ผู้ใช้เข้าสู่ระบบด้วยรหัสผ่านที่ไม่ถูกต้อง
- **Then:** ระบบไม่สร้าง Session และคืน HTTP 401

### TC-04 ป้องกันคำขอที่ไม่มี CSRF Token

- **Given:** ผู้ใช้เข้าสู่ระบบแล้ว
- **When:** ผู้ใช้ส่งคำขอ POST, PUT หรือ DELETE โดยไม่มี CSRF token
- **Then:** ระบบปฏิเสธคำขอและคืน HTTP 403

### TC-05 ผู้ใช้ดูและแก้ไขโปรไฟล์ของตนเอง

- **Given:** ผู้ใช้เข้าสู่ระบบแล้ว
- **When:** ผู้ใช้เปิดหน้าโปรไฟล์และแก้ไขชื่อหรือประวัติส่วนตัว
- **Then:** ระบบบันทึกข้อมูลและแสดงข้อมูลใหม่ของผู้ใช้คนนั้น

### TC-06 ผู้ใช้ที่ยังไม่เข้าสู่ระบบเปิดหน้าส่วนตัว

- **Given:** ผู้ใช้ยังไม่ได้เข้าสู่ระบบ
- **When:** ผู้ใช้เปิดหน้าโปรไฟล์หรือหน้าคอร์สที่บันทึก
- **Then:** Frontend พาไปหน้าเข้าสู่ระบบ และ API คืน HTTP 401

### TC-07 Catalog แสดงเฉพาะคอร์สที่เผยแพร่

- **Given:** ระบบมีคอร์ส PUBLISHED, DRAFT และ SUSPENDED
- **When:** ผู้ใช้เปิดหน้า Catalog
- **Then:** ระบบแสดงเฉพาะคอร์ส PUBLISHED ของ Provider ที่มีสถานะ ACTIVE

### TC-08 ค้นหาและกรองคอร์ส

- **Given:** ระบบมีคอร์สหลายหมวดหมู่ ระดับ ภาษา และราคา
- **When:** ผู้ใช้เลือกตัวกรองหรือพิมพ์คำค้นหา
- **Then:** ระบบแสดงเฉพาะคอร์สที่ตรงกับเงื่อนไขและแสดงจำนวนผลลัพธ์ถูกต้อง

### TC-09 บันทึกคอร์สซ้ำ

- **Given:** ผู้ใช้เข้าสู่ระบบและมีคอร์สที่เผยแพร่แล้ว
- **When:** ผู้ใช้ส่งคำขอบันทึกคอร์สเดิมมากกว่าหนึ่งครั้ง
- **Then:** ระบบคืน HTTP 204 และมี Bookmark ในฐานข้อมูลเพียงหนึ่งรายการ

### TC-10 ผู้ใช้เห็นเฉพาะ Bookmark ของตนเอง

- **Given:** ผู้ใช้สองคนบันทึกคอร์สคนละรายการ
- **When:** ผู้ใช้คนแรกเปิดหน้าคอร์สที่บันทึก
- **Then:** ระบบแสดงเฉพาะคอร์สที่ผู้ใช้คนแรกบันทึกไว้

### TC-11 Owner แก้ไข Provider ของตนเอง

- **Given:** ผู้ใช้เป็น Owner ของ Provider
- **When:** ผู้ใช้แก้ไขข้อมูล Provider
- **Then:** ระบบบันทึกข้อมูลใหม่และคืน HTTP 200

### TC-12 ผู้ใช้แก้ไข Provider ที่ไม่มีสิทธิ์

- **Given:** ผู้ใช้ไม่ได้เป็น Owner หรือ Editor ของ Provider
- **When:** ผู้ใช้ส่งคำขอแก้ไข Provider
- **Then:** ระบบไม่แก้ไขข้อมูลและคืน HTTP 403

### TC-13 สร้าง Course Draft

- **Given:** ผู้ใช้เป็นสมาชิกของ Provider และมีสิทธิ์สร้างคอร์ส
- **When:** ผู้ใช้กรอกข้อมูลคอร์สถูกต้องและกดบันทึก
- **Then:** ระบบสร้างคอร์สสถานะ DRAFT และคืน HTTP 201 พร้อม Location header

### TC-14 Admin อนุมัติ Course

- **Given:** คอร์สอยู่ในสถานะ PENDING และผู้ใช้เป็น Admin
- **When:** Admin อนุมัติคอร์ส
- **Then:** คอร์สเปลี่ยนเป็น PUBLISHED และระบบบันทึก Audit Log

### TC-15 ผู้เรียนเขียนรีวิวซ้ำในคอร์สเดิม

- **Given:** ผู้เรียนมีรีวิวของคอร์สนี้อยู่แล้ว
- **When:** ผู้เรียนพยายามสร้างรีวิวใหม่ในคอร์สเดิม
- **Then:** ระบบไม่สร้างรีวิวซ้ำและคืน HTTP 409

### TC-16 คะแนนเฉลี่ยใช้เฉพาะรีวิวที่เผยแพร่

- **Given:** คอร์สมีรีวิวสถานะ PUBLISHED, PENDING และ REJECTED
- **When:** ผู้ใช้เปิดดูคอร์ส
- **Then:** คะแนนเฉลี่ยคำนวณจากรีวิวสถานะ PUBLISHED เท่านั้น

### TC-17 Matcher กรองคอร์สก่อนจัดอันดับ

- **Given:** ผู้ใช้ระบุงบประมาณ ภาษา และระดับที่ต้องการ
- **When:** ผู้ใช้ส่งคำตอบแบบทดสอบ Matcher
- **Then:** ระบบตัดคอร์สที่ไม่ตรงเงื่อนไขออกก่อนจัดอันดับ และแสดงเหตุผลของคอร์สที่แนะนำ
- **และ:** ใช้เฉพาะ PUBLISHED/Provider ACTIVE; หมวดหมู่ ภาษา และระดับตรงค่าเลือก; FREE หรือ ONE_TIME ราคา THB ที่ทราบและไม่เกินงบ; subscription/ไม่ทราบราคา/ต่างสกุลไม่ผ่าน
- **และ:** ใช้คะแนนเฉลี่ยจาก Strategy 3 ตัว ให้เวลาเป้าหมาย 4 สัปดาห์และใช้เฉพาะรีวิว PUBLISHED; effort ไม่ทราบ/ไม่มีรีวิวใช้ 50 พร้อมเหตุผล
- **และ:** คิดคะแนนทุกคอร์สก่อนเลือกสูงสุด 3 อันดับ เรียงคะแนนจริงมากไปน้อยและ ID น้อยไปมากเมื่อคะแนนเท่ากัน ปัดสองตำแหน่งเฉพาะ response
- **กรณีว่าง:** คืน 200, matches ว่างพร้อม constraint counts ที่อาจทับซ้อน ไม่ผ่อนเงื่อนไข; anonymous ต้องส่ง CSRF cookie/header และข้อมูลผิดตอบ error contract เดิม

### TC-18 API ไม่เปิดเผยข้อมูลลับ

- **Given:** ผู้ใช้เรียก API สมัครสมาชิก เข้าสู่ระบบ หรือดูโปรไฟล์
- **When:** ระบบส่งข้อมูลผู้ใช้กลับมา
- **Then:** Response ต้องไม่มี password, password hash หรือข้อมูลลับอื่น

### TC-19 สถานะกับ AuditLog commit/rollback พร้อมกัน

- **Given:** คำสั่ง moderation, submit, edit Course หรือ verification Provider ที่ผ่านกฎธุรกิจ
- **When:** transaction สำเร็จ, PostgreSQL ปฏิเสธ audit INSERT หรือ outer caller ล้มเหลวหลัง flush
- **Then:** สำเร็จแล้วสถานะ/version และ audit ถูกบันทึก; เมื่อ rollback ค่าธุรกิจทั้งหมดกลับเป็นเดิมและไม่มี audit ของคำสั่งนั้น ตรวจจาก transaction ใหม่

### TC-20 Observer นับเฉพาะ transition ที่ commit สำเร็จ

- **Given:** course status-change event ที่ส่งหลัง service เขียน audit
- **When:** transaction ยังไม่ commit, commit สำเร็จ, rollback หรือส่ง event นอก transaction
- **Then:** counter เพิ่มหนึ่งครั้งเฉพาะหลัง commit; ไม่เพิ่มก่อน commit/หลัง rollback/นอก transaction และไม่ส่ง event เมื่อแก้ข้อมูลที่สถานะเดิม

### TC-21 คำขออนุมัติพร้อมกันไม่เพิ่ม audit/metrics ซ้ำ

- **Given:** สอง transaction โหลดคอร์ส version เดียวกันก่อนแก้ไข
- **When:** ทั้งสองเรียก API อนุมัติคอร์สพร้อมกัน
- **Then:** ได้ 200 และ 409, สถานะใหม่บันทึกครั้งเดียว และมี audit กับ counter เพียงครั้งเดียว

### TC-22 Metrics failure ไม่เปลี่ยนผลสำเร็จของธุรกิจ

- **Given:** คำขออนุมัติผ่าน API ที่ธุรกิจ commit สำเร็จ
- **When:** registry สร้าง counter ไม่ได้หรือ increment โยน RuntimeException
- **Then:** API ตอบ 200, สถานะกับ audit ยังคงถูกบันทึก และมี error log พร้อม event context และ stack trace

### TC-23 ถอนสมาชิกแล้วแก้คอร์สต่อไม่ได้

- **Given:** เจ้าของแก้คอร์สผ่าน API สำเร็จ แล้วถูกถอนออกจาก Provider
- **When:** บัญชีเดิมพยายามสร้าง แก้ ส่งตรวจ หรือลบคอร์ส
- **Then:** ทุกคำสั่งได้ 403 และคอร์สกับ audit ไม่เปลี่ยน

### TC-24 แก้คอร์สพร้อมกันไม่ทับข้อมูลกัน

- **Given:** สอง transaction โหลดคอร์ส version เดียวกัน
- **When:** ทั้งสองแก้ชื่อและราคาในเวลาเดียวกัน
- **Then:** commit สำเร็จหนึ่งรายการ อีกหนึ่งรายการถูก optimistic locking ปฏิเสธ; ชื่อ ราคากับ audit เป็นของรายการที่สำเร็จเท่านั้น

### TC-25 สร้างคอร์สล้มเหลวแล้วไม่เหลือข้อมูลบางส่วน

- **Given:** การสร้างคอร์สใหม่พร้อมราคาและหมวดหมู่
- **When:** PostgreSQL ปฏิเสธการบันทึก audit
- **Then:** คอร์ส ราคา ความสัมพันธ์หมวดหมู่ และ audit ของคำสั่งนั้นไม่ถูกบันทึก

## 9. ผู้รับผิดชอบและสถานะการทดสอบ

ความหมายของสถานะ:

- มีแล้ว = มี Automated Test แล้ว
- ยังไม่แล้ว = มี Test รองรับบางส่วน
- ยังบ่เฮ็ด = รอพัฒนาฟีเจอร์และเพิ่ม Test

| Test Case | ส่วนงานรับผิดชอบ | ระดับ Test | หลักฐาน Test | สถานะ |
| --- | --- | --- | --- | --- |
| TC-01 สมัครสมาชิกสำเร็จ | Auth/Profile | Backend Integration, Frontend | `AuthControllerIntegrationTests`, `auth-flow.test.tsx` | มีแล้ว |
| TC-02 สมัครด้วยอีเมลซ้ำ | Auth/Profile | Backend Integration | `AuthControllerIntegrationTests` | มีแล้ว |
| TC-03 เข้าสู่ระบบด้วยรหัสผิด | Auth/Profile | Backend Integration | `AuthControllerIntegrationTests` | มีแล้ว |
| TC-04 ไม่มี CSRF Token | Security | Backend Integration, Frontend | `AuthControllerIntegrationTests`, `api-client.test.ts` | มีแล้ว |
| TC-05 ดูและแก้ไขโปรไฟล์ | Auth/Profile | Backend Integration | `ProfileControllerIntegrationTests` | มีแล้ว |
| TC-06 Guest เปิดหน้าส่วนตัว | Auth/Profile | Backend Integration, Frontend | `ProfileControllerIntegrationTests`, `auth-flow.test.tsx` | มีแล้ว |
| TC-07 Catalog แสดงคอร์สที่เผยแพร่ | Catalog | Backend Integration | `CatalogCourseIntegrationTests` | มีแล้ว |
| TC-08 ค้นหาและกรองคอร์ส | Catalog | Backend Integration | `CatalogCourseIntegrationTests` | มีแล้ว |
| TC-09 บันทึกคอร์สซ้ำ | Bookmark | Backend Integration, Frontend | `BookmarkIntegrationTests`, `bookmark-flow.test.tsx` | มีแล้ว |
| TC-10 เห็นเฉพาะ Bookmark ของตนเอง | Bookmark | Backend Integration | `BookmarkIntegrationTests` | มีแล้ว |
| TC-11 Owner แก้ไข Provider | Provider | Unit, Backend Integration | ยังไม่มี | ยังไม่แล้ว |
| TC-12 ปฏิเสธผู้ไม่มีสิทธิ์แก้ Provider | Provider/Security | Unit, Backend Integration | ยังไม่มี | ยังไม่แล้ว |
| TC-13 สร้าง Course Draft | Course | Backend Integration, Frontend | ยังไม่มี | ยังไม่แล้ว |
| TC-14 Admin อนุมัติ Course | Course/Admin | Backend Integration (H2/PostgreSQL) | `AdminModerationControllerTests`, `AuditTransactionPostgresIntegrationTests` | มีแล้ว |
| TC-15 ป้องกัน Review ซ้ำ | Review | Backend Integration | ยังไม่มี | ยังไม่แล้ว |
| TC-16 คะแนนเฉลี่ยจาก Review ที่เผยแพร่ | Review/Catalog | Backend Integration | `CatalogCourseIntegrationTests` ทดสอบคะแนนที่เผยแพร่ แต่ยังไม่ครอบคลุม PENDING และ REJECTED | ยังบ่เฮ็ด |
| TC-17 Matcher กรองก่อนจัดอันดับ | Matcher | Unit, Backend Integration, Frontend | `ScoringStrategyContractTests`, `CourseMatcherServiceTests`, `CourseMatcherControllerTests`, `CourseMatcherPostgresIntegrationTests`, `matcher-flow.test.tsx` | Backend มีแล้วใน Task 19; Frontend Task 20 ทดสอบ flow ด้วย API mock ผ่านแล้ว 2 กรณี ยังไม่มี browser E2E กับ backend จริง |
| TC-18 API ไม่เปิดเผยข้อมูลลับ | Backend/Security | Backend Integration | `AuthControllerIntegrationTests` ตรวจ password hash แล้ว แต่ยังไม่ครอบคลุมทุก API | ยังบ่เฮ็ด |
| TC-19 Audit atomicity | Course/Provider/Audit | PostgreSQL Integration | `AuditTransactionPostgresIntegrationTests` | มีแล้ว |
| TC-20 Observer หลัง commit | Course/Observer | Unit, H2/PostgreSQL Integration | `CourseMetricsTransactionIntegrationTests`, `CourseEventPublicationIntegrationTests`, `AuditTransactionPostgresIntegrationTests`, `CourseMetricsListenerTests` | มีแล้ว |
| TC-21 Concurrent moderation | Course/Admin | PostgreSQL Integration + MockMvc | `concurrentApiDecisionsOnSameVersionCommitExactlyOneAuditAndMetric` | มีแล้ว |
| TC-22 Metrics failure | Course/Observer | Unit, PostgreSQL Integration + MockMvc | `metricFailureAfterCommitStillReturnsSuccessfulApiResponse`, `CourseMetricsListenerTests` | มีแล้ว |
| TC-23 ถอนสิทธิ์แก้คอร์ส | Course/Security | PostgreSQL Integration + MockMvc | `revokedMemberCannotCreateEditSubmitOrDeleteCourse` | มีแล้ว |
| TC-24 Concurrent course edit | Course | PostgreSQL Integration | `concurrentCourseEditsCommitOnlyOnePriceAndAudit` | มีแล้ว |
| TC-25 Create rollback | Course/Audit | PostgreSQL Integration | `failedCreateAuditRollsBackCoursePriceAndCategories` | มีแล้ว |

ผลจริงของ Task 17: [รายงานทดสอบ](test-reports/task17-audit-observer.md) และ [คู่มือสาธิต](task17-audit-observer-guide.md) Tests ของ Task 17 ใช้ transaction ที่ commit/rollback จริง ส่วน browser E2E ไม่รวมอยู่ในหลักฐานรอบนี้

ผลจริงของ Task 18: [รายงานทดสอบ concurrency, permission และ rollback](test-reports/task18-concurrency-permissions.md)

ผลจริงของ Task 19: [รายงานทดสอบ](test-reports/task19-matcher.md) และ [คู่มือสาธิต](task19-matcher-guide.md) PostgreSQL tests ตรวจ top 3 จาก 53 คอร์ส, คอร์สหลายหมวดหมู่, รีวิว PENDING/REJECTED ไม่ถูกนับ และจำนวน query คงที่; controller tests ตรวจ cookie/header CSRF จริงและ Swagger

ผลจริงของ Task 20: [คู่มือหน้าแบบทดสอบ](task20-matcher-ui-guide.md) และ `matcher-flow.test.tsx` ตรวจการส่งคำตอบและแสดงผลผ่าน API mock; browser E2E กับ backend จริงยังไม่ได้ทำ

> หมายเหตุ: ให้ทีมแทนชื่อส่วนงานในคอลัมน์ “ส่วนงานรับผิดชอบ” ด้วยชื่อสมาชิกจริง เมื่อแบ่งเจ้าของ Provider, Course, Review และ Matcher เรียบร้อยแล้ว
