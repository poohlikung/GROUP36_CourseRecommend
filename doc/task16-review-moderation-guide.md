# Task 16: ตรวจรีวิว

## ลำดับการทำงาน

1. ผู้เรียนสร้างหรือแก้รีวิวผ่าน API เดิม รีวิวมีสถานะ `PENDING` และไม่แสดงต่อสาธารณะ
2. Admin เปิด `/admin` ส่วนรีวิว เพื่อดูคิว เลือกอนุมัติหรือปฏิเสธ หากปฏิเสธต้องใส่เหตุผล
3. Backend ตรวจสิทธิ์ Admin จาก session และฐานข้อมูล ตรวจสถานะ `PENDING` กับ `expectedVersion`
4. ระบบเปลี่ยนสถานะและบันทึก `audit_logs` ใน transaction เดียวกัน
5. รีวิวที่อนุมัติจะแสดงในรายการสาธารณะและถูกนับในคะแนนเฉลี่ย ส่วนรีวิวที่ปฏิเสธ ผู้เขียนดูเหตุผลผ่าน `/reviews/me` และแก้เพื่อส่งตรวจใหม่ได้

## ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
| --- | --- |
| `review/ReviewController.java`, `ReviewService.java` | API เดิมสำหรับสร้าง แก้ และอ่านรีวิว; รายการสาธารณะกรองเฉพาะ `PUBLISHED` |
| `domain/entity/Review.java` | เก็บสถานะ เหตุผล และเลข version; การแก้รีวิวล้างเหตุผลและกลับเป็น `PENDING` |
| `db/migration/V4__review_moderation.sql` | เพิ่ม `version`, `moderation_reason` และดัชนีคิวตรวจ |
| `review/ReviewRepository.java` | ค้นรีวิวตามสถานะพร้อมข้อมูลคอร์สและผู้เขียน |
| `review/ReviewModerationService.java`, `ReviewModerationServiceImpl.java` | สัญญาและกฎคิว/การตัดสิน; บันทึกสถานะกับ AuditLog ใน transaction เดียว |
| `review/AdminReviewModerationController.java` | รับ HTTP ของคิวและคำตัดสินจาก Admin |
| `review/dto/AdminReviewResponse.java`, `AdminReviewPageResponse.java`, `ReviewModerationRequest.java` | ข้อมูลที่หน้า Admin อ่านและส่ง |
| `security/AdminActorResolver.java` | ตรวจว่า session และบัญชีจริงยังเป็น Admin; ย้ายมาใช้ร่วมกับ Task 15 |
| `frontend/features/admin/reviewApi.ts` | เรียก API คิวและส่งคำตัดสินพร้อม `expectedVersion` |
| `frontend/features/admin/ReviewModerationSection.tsx` | แสดงคิว คะแนน ข้อความ ปุ่มอนุมัติ/ปฏิเสธ และเหตุผล |
| `frontend/pages/AdminPage.tsx` | แสดงส่วนตรวจรีวิวบนหน้า Admin เดิม |

การเรียก API และข้อผิดพลาดดูที่ `doc/api-contract.md` ส่วนผลทดสอบอยู่ที่ `doc/test-reports/task16-review-moderation.md`
