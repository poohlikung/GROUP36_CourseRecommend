# Task 15: ตรวจและเปลี่ยนสถานะคอร์ส

## ภาพรวมแบบง่าย

1. สมาชิก Provider สร้างคอร์สเป็น `DRAFT` แล้วกดส่งตรวจ → `PENDING` (Provider ต้อง `ACTIVE`)
2. Admin เปิด `/admin` ดูข้อมูล ราคา และลิงก์ต้นทาง แล้วเลือกอนุมัติหรือขอแก้ไข
3. Backend ตรวจสิทธิ์ ตรวจว่า `version` ยังตรง และให้ State ของสถานะปัจจุบันตัดสินว่าคำสั่งนี้ทำได้หรือไม่
4. หากทำได้ ระบบเปลี่ยนสถานะและเขียน `audit_logs` ใน transaction เดียวกัน ถ้าขั้นตอนไหนผิด ข้อมูลทั้งสองส่วนไม่ถูกบันทึก
5. ถ้าขอแก้ไข Provider เห็นเหตุผลบนการ์ดคอร์ส แก้ข้อมูล แล้วส่งตรวจอีกครั้ง

สถานะหลัก: `DRAFT → PENDING → PUBLISHED`; อีกทางคือ `PENDING → REVISION_REQUESTED → PENDING` ส่วนคอร์สเผยแพร่แล้ว `PUBLISHED → SUSPENDED → PUBLISHED` หรือ `PUBLISHED/SUSPENDED → ARCHIVED` ซึ่งเป็นสถานะสุดท้าย

แผนภาพการเปลี่ยนสถานะอยู่ที่ `doc/diagrams/course-state.mmd`

## Backend: อ่านทีละไฟล์

| ไฟล์ | หน้าที่ |
| --- | --- |
| `course/workflow/CourseDecision.java` | ชื่อคำตัดสินที่ API ยอมรับ เช่น `APPROVE` และ `REQUEST_REVISION` |
| `course/workflow/CourseWorkflowState.java` | สัญญาว่าแต่ละสถานะต้องตอบคำสั่ง `submit`, `edit`, `moderate` และ `canDelete` อย่างไร; คำสั่งที่ไม่รองรับตอบ 409 |
| `course/workflow/CourseWorkflow.java` | เก็บ State object ของทั้ง 6 สถานะ พฤติกรรมของแต่ละสถานะอยู่ในคลาสของมัน เช่น `PendingState` อนุมัติหรือขอแก้ไขได้ |
| `course/CourseService.java` | งานเดิมของสมาชิก Provider เรียก State ก่อนแก้/ส่งตรวจ/ลบ และล้างหมายเหตุเก่าเมื่อส่งตรวจใหม่ |
| `course/dto/CourseModerationRequest.java` | ตรวจรูปคำขอตัดสินคอร์ส: ต้องมีคำตัดสินและ `expectedVersion`; เหตุผลยาวไม่เกิน 1,000 ตัวอักษร |
| `course/dto/ProviderVerificationRequest.java` | รูปคำขอรับรอง/ระงับ/คืนสถานะ Provider |
| `course/dto/AdminProviderResponse.java` | ข้อมูล Provider สำหรับหน้า Admin รวม `version` |
| `course/dto/CourseDetailResponse.java` | เพิ่ม `version` กับ `moderationReason` ในข้อมูลคอร์สที่ส่งให้ frontend |
| `course/AdminModerationController.java` | รับ HTTP สำหรับรายการรอตรวจและคำตัดสิน แล้วส่งต่อให้ Service |
| `course/AdminModerationService.java` | ตรวจบทบาท Admin ทั้งใน session และฐานข้อมูล รวมถึง version, กฎสถานะ และเหตุผล; เปลี่ยนสถานะพร้อมเขียน AuditLog ใน transaction เดียว |
| `repository/ProviderRepository.java` | ดึง Provider ตามสถานะเพื่อแสดงคิวในหน้า Admin |
| `domain/entity/Course.java` | เก็บเหตุผลล่าสุดที่ Provider ต้องเห็น; `@Version` เดิมใช้กันการเขียนทับข้อมูลเก่า |
| `domain/entity/AuditLog.java` | เพิ่มเหตุผลลงประวัติถาวรของการตัดสินใจ |
| `resources/db/migration/V3__audit_log_reason.sql` | เพิ่มคอลัมน์เหตุผลใน PostgreSQL โดยไม่ลบข้อมูลเดิม |
| `security/SecurityConfig.java` | บังคับว่า `/api/v1/admin/**` ใช้ได้เฉพาะบทบาท `ADMIN` |
| `exception/GlobalExceptionHandler.java` | แปลงกรณี version ชนกันเป็น HTTP 409 ที่ frontend อ่านได้ |

## Frontend: อ่านทีละไฟล์

| ไฟล์ | หน้าที่ |
| --- | --- |
| `features/admin/adminApi.ts` | เรียก API คิวและส่งคำตัดสินพร้อม `expectedVersion`; `apiRequest` เติม CSRF token ให้ POST |
| `pages/AdminPage.tsx` | แสดงคอร์ส/Provider ตามสถานะ รายละเอียด ลิงก์ เหตุผล และปุ่มที่ใช้ได้; โหลดรายการใหม่หลังตัดสิน |
| `components/RouteGuards.tsx` | `AdminRoute` ไม่ให้ผู้ใช้ทั่วไปเปิดหน้า `/admin` |
| `app/App.tsx` | ลงทะเบียนเส้นทาง `/admin` |
| `components/AppLayout.tsx` | แสดงเมนูงานตรวจเฉพาะ Admin |
| `features/course/types.ts` | เพิ่มชนิดข้อมูล `version` และ `moderationReason` ให้ตรงกับ API |
| `features/course/CourseManagementSection.tsx` | แสดงเหตุผลจาก Admin ให้สมาชิก Provider เห็น |

## เอกสารและเทสต์

`doc/api-contract.md` ระบุ path และ payload; `README.md` ระบุวิธีเข้าใช้งาน ส่วน `CourseWorkflowTests.java` ตรวจเส้นทางสถานะ, `AdminModerationControllerTests.java` ตรวจสิทธิ์/เหตุผล/version/AuditLog, `FlywayMigrationIntegrationTests.java` ตรวจคอลัมน์ V3 บน PostgreSQL ใน CI และ `admin-moderation.test.tsx` ตรวจปุ่มกับการส่งคำตัดสินจากหน้าเว็บ

ตัวอย่างคำขอ (หลัง login เป็น Admin และส่ง CSRF token):

```json
{
  "decision": "REQUEST_REVISION",
  "expectedVersion": 0,
  "reason": "ลิงก์คอร์สเปิดไม่ได้"
}
```

`expectedVersion` คือเลขที่ API ส่งมาพร้อมคอร์ส Admin คนที่สองซึ่งถือเลขเก่าจะได้ 409 และต้องโหลดข้อมูลใหม่ก่อนตัดสินอีกครั้ง
