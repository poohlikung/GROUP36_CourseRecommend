# Task 09 — Provider CRUD backend และ UI: Test report

- วันที่รัน: 2 ตุลาคม 2026 (อัปเดตผลล่าสุด 5 ตุลาคม 2026)
- Branch: `keattisak_6733800729_01`
- Backend: Spring Boot 3.5.16, Java 21, JUnit 5, Spring Boot Test, MockMvc, H2 (in-memory)
- Frontend: React 18, TypeScript, Vite, Vitest, React Testing Library

## 1. ผลทดสอบ Backend (รอบแรก 22/22, ล่าสุด 34/34 ผ่านทั้งหมด)

รันจากโฟลเดอร์ `code/backend` ด้วยคำสั่ง:
```bash
./mvnw.cmd test -Dtest="ProviderServiceTests,ProviderControllerTests"
```

| ชุดทดสอบ | จำนวนเคส | ผลลัพธ์ | ความครอบคลุม |
| --- | :---: | :---: | --- |
| `ProviderServiceTests` | 11 | ผ่าน 11/11 (0 failures, 0 errors) | การสร้าง Provider พร้อมบทบาท Owner, ตรวจสอบ Slug ซ้ำ (409), ดึงรายการสถาบันของผู้ใช้, การค้นหาตาม ID และ Slug, การแก้ไขข้อมูลพร้อมตรวจสิทธิ์ Owner/Editor, การแก้ไขเพื่อล้างค่าคำอธิบายและเว็บไซต์เป็น null ในฐานข้อมูล, การลบ Provider แบบไม่มีคอร์ส (204) และการปฏิเสธลบเมื่อมีคอร์สเปิดสอน (409 Conflict), การบันทึก AuditLog |
| `ProviderControllerTests` | 11 | ผ่าน 11/11 (0 failures, 0 errors) | การป้องกัน Unauthorized (401), สถานะ 201 พร้อม Header Location, การตรวจสอบความถูกต้องของ Slug (@Valid Pattern/Length 400), การตรวจสอบความปลอดภัยของ websiteUrl ปฏิเสธ scheme ที่ไม่ปลอดภัยเช่น javascript: (400 Bad Request), การล้างค่าคำอธิบาย/เว็บไซต์ผ่าน API สำเร็จ, การตรวจสอบสิทธิ์การแก้ไขและลบ (403/404/409), CSRF protection |

## 2. ผลทดสอบ Frontend (5/5 ผ่านทั้งหมด)

รันจากโฟลเดอร์ `code/frontend` ด้วยคำสั่ง:
```bash
npm test
npm run typecheck
npm run build
```

| รายการทดสอบ | ผลลัพธ์ | รายละเอียด |
| --- | :---: | --- |
| `provider-flow.test.tsx` | ผ่าน 5/5 | 1. แสดงรายชื่อสถาบันที่สังกัดพร้อม Badge สถานะและบทบาท<br>2. เปิด Modal ลงทะเบียน Provider ใหม่ (UC09) และส่งข้อมูลสำเร็จ<br>3. เปิด Modal แก้ไขข้อมูล Provider (UC10) และลบสถาบันพร้อมจัดการข้อผิดพลาด Conflict<br>4. แก้ไขข้อมูลโดยล้างค่าคำอธิบายและเว็บไซต์เพื่อส่งค่าว่างไปบันทึกบน Backend<br>5. กรองไม่เรนเดอร์ลิงก์คลิกได้สำหรับ scheme ที่ไม่ปลอดภัย เช่น javascript:alert(1) |
| Vitest Full Suite | ผ่าน 4 files / 9 tests | ครอบคลุมทั้ง auth, bookmark และ provider flows |
| TypeScript Typecheck | ผ่าน 100% | `tsc --noEmit` ไม่พบข้อผิดพลาดด้าน Type |
| Vite Production Build | ผ่าน 100% | Bundle สำเร็จเรียบร้อย |

## 3. สรุปการแก้ไขตามข้อเสนอแนะจากการรีวิวโค้ด (PR #15 Review Follow-up)

1. **ความปลอดภัยของ URL เว็บไซต์ (`websiteUrl`)**:
   - เพิ่ม `@Pattern(regexp = "^(https?://.*)?$", message = "URL เว็บไซต์ต้องขึ้นต้นด้วย http:// หรือ https://")` ใน [CreateProviderRequest.java](../../code/backend/src/main/java/com/example/courserecommend/provider/dto/CreateProviderRequest.java) และ [UpdateProviderRequest.java](../../code/backend/src/main/java/com/example/courserecommend/provider/dto/UpdateProviderRequest.java)
   - เพิ่มฟังก์ชัน `isSafeHttpUrl` ใน [ProviderPage.tsx](../../code/frontend/src/pages/ProviderPage.tsx) เพื่อกรองก่อนเรนเดอร์แท็ก `<a>`
   - เพิ่มเทสต์ตรวจสอบการปฏิเสธ scheme อันตรายใน [ProviderControllerTests.java](../../test/backend/unit/com/example/courserecommend/provider/ProviderControllerTests.java) และ [provider-flow.test.tsx](../../test/frontend/provider-flow.test.tsx)
2. **การล้างค่าข้อมูล (`null` normalization)**:
   - ปรับปรุง [ProviderService.java](../../code/backend/src/main/java/com/example/courserecommend/provider/ProviderService.java) ให้แปลงค่าว่าง (`isBlank()`) เป็น `null` สำหรับฟิลด์ description และ websiteUrl
   - ปรับปรุง [ProviderPage.tsx](../../code/frontend/src/pages/ProviderPage.tsx) ให้ส่งค่าว่าง `""` แทน `undefined` เมื่อผู้ใช้ล้างข้อมูลในฟอร์ม
   - เพิ่มเทสต์ตรวจสอบการล้างค่าใน [ProviderServiceTests.java](../../test/backend/unit/com/example/courserecommend/provider/ProviderServiceTests.java) และ [ProviderControllerTests.java](../../test/backend/unit/com/example/courserecommend/provider/ProviderControllerTests.java)

## 4. ปรับการมองเห็น Provider ให้สอดคล้องกับกฎของคอร์ส (5 ตุลาคม 2026)

`GET /api/v1/providers/{id}` และ `GET /api/v1/providers/slug/{slug}` เดิมคืนข้อมูล Provider ทุกสถานะให้ทุกคน ซึ่งไม่ตรงกับกฎที่ซ่อนคอร์สของ Provider ที่ไม่ `ACTIVE` จากผู้ใช้ทั่วไป จึงปรับดังนี้:

1. [ProviderService.java](../../code/backend/src/main/java/com/example/courserecommend/provider/ProviderService.java) คืน `404` เมื่อ Provider ไม่ใช่ `ACTIVE` และผู้เรียกไม่ใช่ `OWNER`/`EDITOR` ของ Provider นั้นหรือ Admin (ตรวจผ่าน `ProviderOwnershipService.isEditorOrOwner`) ใช้ `404` แทน `403` เพื่อไม่เปิดเผยว่ามี Provider นี้อยู่
2. ลบบทบาท `VIEWER` ออกจาก type และหน้า Provider ฝั่ง frontend เพราะ backend มีเพียง `OWNER` และ `EDITOR`

| ชุดทดสอบ | จำนวนเคส | ผลลัพธ์ | เคสที่เพิ่ม |
| --- | :---: | :---: | --- |
| `ProviderServiceTests` | 18 | ผ่าน 18/18 | Provider `PENDING`/`SUSPENDED` เป็น 404 สำหรับคนไม่ล็อกอินและคนนอกทีม, สมาชิกและ Admin ยังดูได้ |
| `ProviderControllerTests` | 16 | ผ่าน 16/16 | คนไม่ล็อกอินได้ 404 ทั้ง by id และ by slug, Owner ดู Provider `PENDING` ของตนได้ (200) |
| Vitest ทั้งหมด | 23 | ผ่าน 23/23 | — |
