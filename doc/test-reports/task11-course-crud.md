# Task 11 — Course CRUD backend และ UI: Test report

- วันที่รัน: 5 ตุลาคม 2026
- Branch: `keattisak_6733800729_01` (ฐานจาก commit `33ef556` พร้อมการแก้ไขรอบรีวิวล่าสุดของ PR)
- Backend: Spring Boot 3.5.16, Java 21, JUnit 5, Spring Boot Test, MockMvc, Spring Security Test, H2 (in-memory)
- Frontend: React 18, TypeScript, Vite, Vitest, React Testing Library

> หมายเหตุ: เทสต์ backend ของ Task 11 เป็นเทสต์แบบ `@SpringBootTest` ที่รันกับ H2 และ rollback ทุกเคสด้วย `@Transactional` ไม่ได้ใช้ Mockito mock

## 1. ผลทดสอบ Backend

รันจากโฟลเดอร์ `code/backend`:

```bash
./mvnw test -Dtest="CourseServiceTests,CourseControllerTests"
```

| ชุดทดสอบ | จำนวนเคส | ผลลัพธ์ |
| --- | :---: | :---: |
| `CourseServiceTests` | 34 | ผ่าน 34/34 |
| `CourseControllerTests` | 19 | ผ่าน 19/19 |

ครอบคลุม:
- UC12 สร้าง/แก้ไขคอร์ส: ราคา FREE/ONE_TIME/SUBSCRIPTION, ราคาไม่ระบุคงเป็น `null`, **ไม่ส่ง `paymentType` ตอนแก้ไขแล้วคงราคาเดิม**, Platform/Category ไม่ถูกต้องตอบ 400 และไม่ล้างหมวดหมู่เดิม, URL ต้องตรงโดเมนของ Platform, Slug ซ้ำตอบ 409, **`currency` ยาวเกิน 10 ตัวอักษรตอบ 400**, แก้คอร์ส PUBLISHED/PENDING แล้วกลับเป็น DRAFT, **แก้คอร์ส SUSPENDED/ARCHIVED ตอบ 409**
- UC13 ส่งตรวจ: DRAFT/REVISION_REQUESTED → PENDING, สถานะอื่นตอบ 409, **Provider ที่ `PENDING` หรือ `SUSPENDED` ตอบ 409 และคอร์สยังเป็น DRAFT**
- UC14 ลบ: ลบ DRAFT สำเร็จ (204), คอร์สไม่ใช่ DRAFT / เคยเผยแพร่ / มีรีวิว ตอบ 409
- การมองเห็นและสิทธิ์: คนทั่วไปเห็นเฉพาะคอร์ส PUBLISHED ของ Provider ที่ ACTIVE, คนนอกทีมได้ 403/404, ไม่ล็อกอินได้ 401
- บันทึก `audit_logs` ทุกการสร้าง แก้ไข ส่งตรวจ และลบ

รันชุดเต็ม `./mvnw test` บนเครื่องที่ไม่มี Docker: 128 เคส ผ่าน 123 ส่วน 5 เคสที่ error คือเทสต์ Testcontainers ที่ต้องใช้ Docker (`FlywayMigrationIntegrationTests`, `ProviderMemberPostgresIntegrationTests`, `BookmarkIntegrationTests`, `CatalogCourseIntegrationTests`, `ReviewControllerIntegrationTests`) ไม่ได้เกิดจากโค้ด ชุดนี้รันใน CI ของ GitHub Actions ซึ่งมี Docker

## 2. ผลทดสอบ Frontend

รันจากโฟลเดอร์ `code/frontend`:

```bash
npm test
npm run typecheck
npm run build
```

| รายการทดสอบ | ผลลัพธ์ |
| --- | :---: |
| `course-flow.test.tsx` | ผ่าน 13/13 |
| Vitest ทั้งหมด (5 ไฟล์) | ผ่าน 23/23 |
| `tsc --noEmit` | ผ่าน |
| `vite build` | ผ่าน |

`course-flow.test.tsx` ครอบคลุม:
1. แสดงรายการคอร์สพร้อม Badge สถานะ
2. สร้างคอร์สดราฟต์ (UC12)
3. ส่งตรวจคอร์ส DRAFT และ REVISION_REQUESTED (UC13)
4. ลบคอร์สดราฟต์ (UC14)
5. ล้างคำอธิบายแล้วส่งค่าว่าง
6. แก้คอร์สที่ไม่ระบุราคา ช่องจำนวนเงินยังว่างและไม่ส่ง 0
7. การ์ดคอร์สเสียเงินที่ไม่ระบุราคาแสดง "ดูราคาที่เว็บไซต์"
8. ป้ายราคา Subscription และ Free
9. **ส่งตรวจไม่สำเร็จแล้วรายการคอร์สยังแสดงอยู่ พร้อมข้อความ error**
10. **Provider ที่ยังไม่ ACTIVE: ปุ่ม "ส่งตรวจ" ถูกปิดพร้อมข้อความอธิบาย**
11. **คอร์ส SUSPENDED/ARCHIVED ไม่มีปุ่มแก้ไข**
12. **แก้คอร์ส PUBLISHED มีคำเตือนว่าจะกลับเป็น Draft**

## 3. การแก้ไขตามรีวิว PR รอบล่าสุด

1. `CourseService.submitCourse` ตรวจว่า Provider ต้อง `ACTIVE` ตาม UC16 ก่อนส่งคอร์สเข้าตรวจ
2. `CourseService.updateCourse` ไม่เขียนทับราคาเป็น FREE/0 เมื่อคำขอไม่ส่ง `paymentType`
3. หน้า `CourseManagementSection` แยก error ของปุ่มออกจาก error ตอนโหลดรายการ และปิดปุ่มส่งตรวจเมื่อ Provider ยังไม่ ACTIVE
4. เพิ่ม validation `currency` (ไม่เกิน 10 ตัวอักษรตามคอลัมน์ฐานข้อมูล), แก้คอร์ส SUSPENDED/ARCHIVED ตอบ 409 ให้สอดคล้องกับ submit/delete, ซ่อนปุ่มแก้ไขของสองสถานะนี้ และเตือนก่อนแก้คอร์สที่เผยแพร่แล้ว
