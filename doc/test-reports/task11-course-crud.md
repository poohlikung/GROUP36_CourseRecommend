# Task 11 — Course CRUD backend และ UI: Test report

- วันที่รัน: 1 ตุลาคม 2026
- Branch: `keattisak_6733800729_01`
- Backend: Spring Boot 3.5.16, Java 21, JUnit 5, Mockito, MockMvc
- Frontend: React 18, TypeScript, Vite, Vitest, React Testing Library

## 1. ผลทดสอบ Backend (28/28 ผ่านทั้งหมด)

รันจากโฟลเดอร์ `code/backend` ด้วยคำสั่ง:
```bash
./mvnw.cmd test -Dtest="CourseServiceTests,CourseControllerTests"
```

| ชุดทดสอบ | จำนวนเคส | ผลลัพธ์ | ความครอบคลุม |
| --- | :---: | :---: | --- |
| `CourseServiceTests` | 17 | ผ่าน 17/17 (0 failures, 0 errors) | การสร้าง Course Draft พร้อมราคา CoursePrice (UC12), ตรวจสอบความถูกต้องของ Platform และ Category, ตรวจสอบโดเมน URL ตรงกับ Platform allowedHost, ตรวจสอบ Slug ซ้ำ (409 Conflict), การดึงข้อมูลคอร์สเดี่ยวและคอร์สของ Provider, การแก้ไขคอร์ส (UC12), การ normalize คำอธิบายที่เป็นค่าว่างให้เป็น null, การจัดการราคาคอร์สแบบเสียเงินที่ไม่มี fixed amount (null amount), การส่งตรวจเปลี่ยนสถานะเป็น Pending (UC13) พร้อมตรวจเงื่อนไข Draft/Revision, การลบคอร์สดราฟต์ (UC14), การปฏิเสธลบคอร์สที่มีรีวิวหรือไม่ได้เป็น Draft (409 Conflict), การตรวจสิทธิ์การเข้าถึง (403 Forbidden สำหรับ non-member), การบันทึก AuditLog ทุกขั้นตอน |
| `CourseControllerTests` | 11 | ผ่าน 11/11 (0 failures, 0 errors) | ป้องกันคำขอไม่ยืนยันตัวตน (401 Unauthorized), อนุญาตให้ผู้ใช้ทั่วไปเข้าถึงรายละเอียดคอร์สแบบ Anonymous (200 OK), ตอบกลับ 201 Created พร้อม Location header, ตรวจสอบ @Valid validation errors (400 Bad Request พร้อม fieldErrors format), ตรวจสอบโดเมน URL ไม่ตรงกับ Platform (400 Bad Request), ดึงรายการคอร์ส (200 OK), แก้ไขคอร์ส (200 OK), ส่งตรวจคอร์ส (200 OK), ลบคอร์ส (204 No Content), ปฏิเสธลบคอร์สที่มีรีวิว (409 Conflict) |

- **ผลการทดสอบ Backend Unit Tests ทั้งหมดในระบบ**: ผ่าน **86/86 tests** (0 failures, 0 errors)

## 2. ผลทดสอบ Frontend (5/5 ผ่านทั้งหมด)

รันจากโฟลเดอร์ `code/frontend` ด้วยคำสั่ง:
```bash
npm test
npm run typecheck
npm run build
```

| รายการทดสอบ | ผลลัพธ์ | รายละเอียด |
| --- | :---: | --- |
| `course-flow.test.tsx` | ผ่าน 5/5 | 1. นำทางไปยังส่วนจัดการคอร์สของ Provider และแสดงรายการคอร์สพร้อม Badge สถานะ (Draft, Pending, Published)<br>2. เปิด Modal สร้างคอร์สดราฟต์ใหม่ (UC12) พร้อมกรอกข้อมูล แพลตฟอร์ม และบันทึกสำเร็จ<br>3. เปิด Modal แก้ไขข้อมูลคอร์สเรียน พร้อมทดสอบล้างค่าคำอธิบายคอร์สให้ส่งค่าว่างไปแปลงเป็น null บน Backend<br>4. กดปุ่มส่งตรวจ (UC13) เพื่อเปลี่ยนสถานะคอร์สเป็น Pending พร้อมแสดงข้อความสำเร็จ<br>5. เปิด Modal ยืนยันการลบคอร์สดราฟต์ (UC14) และลบออกจากรายการสำเร็จ |
| Vitest Full Suite | ผ่าน 5 files / 15 tests | ครอบคลุม api-client, auth-flow, bookmark-flow, provider-flow และ course-flow |
| TypeScript Typecheck | ผ่าน 100% | `tsc --noEmit` ไม่พบข้อผิดพลาดด้าน Type |
| Vite Production Build | ผ่าน 100% | Bundle สำเร็จเรียบร้อย |

## 3. ความครอบคลุม Use Cases

- **UC12 (Create Course Draft & Edit Course)**:
  - รองรับการกำหนด Platform, Level, Language, Effort Hours, รูปแบบราคา (FREE, ONE_TIME, SUBSCRIPTION) และหมวดหมู่
  - ตรวจสอบความถูกต้องของข้อมูล (Validation), ความสอดคล้องของโดเมน URL กับแพลตฟอร์ม และ Slug ซ้ำทั้งฝั่ง Backend และ Frontend Form
- **UC13 (Submit Course for Moderation)**:
  - รองรับการเปลี่ยนสถานะจาก `DRAFT` หรือ `REVISION_REQUESTED` เป็น `PENDING`
  - ตรวจสอบการปฏิเสธหากคอร์สอยู่ในสถานะอื่นที่ไม่ได้รับอนุญาต
- **UC14 (Delete Course Draft)**:
  - อนุญาตให้ลบได้เฉพาะคอร์สที่อยู่ในสถานะ `DRAFT` และไม่มีรีวิวในระบบเท่านั้น
  - ปฏิเสธด้วย `409 Conflict` หากคอร์สเผยแพร่แล้วหรือมีรีวิว
  - มีกล่องข้อความยืนยันการลบและแจ้งเตือนบนหน้าเว็บ

## 4. สรุปการปรับปรุงความสอดคล้องและความถูกต้อง (Follow-up Improvements)

1. **เปิด Public Endpoint สำหรับ `GET /api/v1/courses/{id}`**:
   - เพิ่ม `"/api/v1/courses/{id}"` ใน `SecurityConfig.java` ให้สอดคล้องกับข้อกำหนดใน `README.md`
   - เพิ่มเทสต์ `getCourse_AnonymousUser_Returns200` ใน `CourseControllerTests.java`
2. **การตรวจสอบ URL คอร์สกับโดเมนแพลตฟอร์ม (`allowedHost`)**:
   - เพิ่มการตรวจสอบใน `CourseService.java` ว่า Host ของ URL ต้องตรงกับ `Platform.getAllowedHost()` หากไม่ตรงจะตอบกลับ `400 Bad Request`
   - เพิ่มเทสต์ตรวจสอบใน `CourseServiceTests.java` และ `CourseControllerTests.java`
3. **การล้างค่าข้อมูล (`null` normalization)**:
   - ปรับปรุง `CourseService.java` ให้แปลงค่าว่าง (`isBlank()`) ของคำอธิบายคอร์สเป็น `null`
   - ปรับปรุง `CourseManagementSection.tsx` ให้ส่งค่าว่าง `""` เมื่อผู้ใช้ล้างข้อมูลในฟอร์ม
   - เพิ่มเทสต์ตรวจสอบใน `CourseServiceTests.java` และ `course-flow.test.tsx`
4. **ตรรกะราคา `CoursePrice`**:
   - หากเป็นคอร์ส `FREE` จะบันทึก amount เป็น `BigDecimal.ZERO`
   - หากเป็นคอร์สเสียเงิน (`ONE_TIME`, `SUBSCRIPTION`) ที่ไม่ระบุจำนวนเงิน จะคงค่าเป็น `null` เพื่อให้หน้าเว็บแสดงปุ่ม "ดูราคาที่เว็บไซต์" ได้อย่างถูกต้องตามสกีมา
