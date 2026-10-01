# Task 09 — Provider CRUD backend และ UI: Test report

- วันที่รัน: 1 ตุลาคม 2026
- Branch: `keattisak_6733800729_01`
- Backend: Spring Boot 3.5.16, Java 21, JUnit 5, Mockito, MockMvc
- Frontend: React 18, TypeScript, Vite, Vitest, React Testing Library

## 1. ผลทดสอบ Backend (19/19 ผ่านทั้งหมด)

รันจากโฟลเดอร์ `code/backend` ด้วยคำสั่ง:
```bash
./mvnw.cmd test -Dtest="ProviderServiceTests,ProviderControllerTests"
```

| ชุดทดสอบ | จำนวนเคส | ผลลัพธ์ | ความครอบคลุม |
| --- | :---: | :---: | --- |
| `ProviderServiceTests` | 10 | ผ่าน 10/10 (0 failures, 0 errors) | การสร้าง Provider พร้อมบทบาท Owner, ตรวจสอบ Slug ซ้ำ (409), ดึงรายการสถาบันของผู้ใช้, การค้นหาตาม ID และ Slug, การแก้ไขข้อมูลพร้อมตรวจสิทธิ์ Owner/Editor, การลบ Provider แบบไม่มีคอร์ส (204) และการปฏิเสธลบเมื่อมีคอร์สเปิดสอน (409 Conflict), การบันทึก AuditLog |
| `ProviderControllerTests` | 9 | ผ่าน 9/9 (0 failures, 0 errors) | การป้องกัน Unauthorized (401), สถานะ 201 พร้อม Header Location, การตรวจสอบความถูกต้องของ Slug (@Valid Pattern/Length 400), การตรวจสอบสิทธิ์การแก้ไขและลบ (403/404/409), CSRF protection |

## 2. ผลทดสอบ Frontend (3/3 ผ่านทั้งหมด)

รันจากโฟลเดอร์ `code/frontend` ด้วยคำสั่ง:
```bash
npm test
npm run typecheck
npm run build
```

| รายการทดสอบ | ผลลัพธ์ | รายละเอียด |
| --- | :---: | --- |
| `provider-flow.test.tsx` | ผ่าน 3/3 | 1. แสดงรายชื่อสถาบันที่สังกัดพร้อม Badge สถานะและบทบาท<br>2. เปิด Modal ลงทะเบียน Provider ใหม่ (UC09) และส่งข้อมูลสำเร็จ<br>3. เปิด Modal แก้ไขข้อมูล Provider (UC10) และลบสถาบันพร้อมจัดการข้อผิดพลาด Conflict |
| Vitest Full Suite | ผ่าน 4 files / 7 tests | ครอบคลุมทั้ง auth, bookmark และ provider flows |
| TypeScript Typecheck | ผ่าน 100% | `tsc --noEmit` ไม่พบข้อผิดพลาดด้าน Type |
| Vite Production Build | ผ่าน 100% | Bundle สำเร็จใน 1.78 วินาที |

## 3. ผลการตรวจสอบบน GitHub Actions (CI)

- **Workflow**: `.github/workflows/ci.yml` (Pull Request #15)
- **Backend tests**: ผ่าน (53s)
- **Frontend tests and build**: ผ่าน (18s)
- **สถานะ**: All checks have passed
