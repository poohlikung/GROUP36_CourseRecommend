# Task 27 — UAT บนเว็บที่ deploy จริง

## รอบตรวจ 9 ตุลาคม 2026

ตรวจหลัง merge PR #33 เข้า `develop` ที่ commit `2135110` และหลัง [GitHub Actions run](https://github.com/poohlikung/GROUP36_CourseRecommend/actions/runs/37960156470) ผ่านทั้ง CI และงาน deploy ของ Render/Vercel เว็บที่ตรวจคือ <https://group36-coursehub.vercel.app/> และ API ผ่านโดเมนเดียวกัน ผลรอบนี้ครอบคลุมผู้เยี่ยมชมและเส้นทางที่ไม่สร้างข้อมูลในฐาน production เท่านั้น

| สิ่งที่ตรวจ | ผล |
| --- | --- |
| Production GET smoke ของ Render, Vercel, catalog, Swagger, guest permission และ CSRF cookie | ผ่าน 14/14; [ผลรายกรณี](evidence/task27-production-readonly.json) |
| Chromium เปิดหน้าแรก, `/match` โดยตรง และ refresh `/match` | ผ่าน 3/3; [ผลจาก browser](evidence/task27-production-browser.json) |
| เปิดหน้ารายการคอร์สแล้วกด “อ่านรีวิว” | ไปหน้า `/courses/6/reviews` ได้; แสดงชื่อคอร์สจริง, รายการรีวิวตอบ HTTP 200 และผู้เยี่ยมชมเห็นปุ่มเข้าสู่ระบบ ไม่มี JavaScript error; [ภาพหน้าจอจริง](evidence/task27-reviews-desktop.png) |
| แบบทดสอบแนะนำคอร์สบน browser | เลือกหมวด UI/UX, ระดับเริ่มต้น, ภาษาไทย, งบ 2,000 บาท, เวลา 10 ชม./สัปดาห์; `POST /api/v1/course-matches` ตอบ HTTP 200 และหน้าเว็บแสดงคอร์ส ID 6 “UI/UX Design Masterclass: From Wireframe to Prototype” ตรงกับผล API |

ชุด smoke GET ไม่บันทึก token หรือค่า cookie ลงไฟล์ ส่วนแบบทดสอบใช้ matcher ที่อ่านข้อมูลอย่างเดียว (`CourseMatcherService` เป็น transaction `readOnly`) ไม่สร้างหรือแก้คอร์ส ผู้ใช้ หรือรีวิว

## E2E บนฐานข้อมูลทดสอบแยก — 10 ตุลาคม 2026

รัน `npm run test:e2e --prefix code/frontend` ในเครื่องบน source commit `279d55f` ด้วย Chromium, backend และ PostgreSQL ใน Docker Compose ที่สร้างใหม่ ผล **15/15 ผ่าน**, ไม่มี failed/skipped/flaky ครอบคลุมสมัคร/ล็อกอิน/ออกจากระบบ, สิทธิ์ learner/provider/admin, bookmark, รีวิวและ moderation, การเผยแพร่คอร์ส, matcher และการฟื้นตัวหลัง startup error [สรุปผลรัน](evidence/task27-local-e2e.json) ชุดทดสอบลบ container กับ network ของตนหลังรันสำเร็จ ผลนี้ยืนยันระบบในสภาพแวดล้อมแยก ไม่ใช่การทดสอบบัญชีบน production

## บัญชี UAT บน production — 10 ตุลาคม 2026

หลังได้รับอนุญาตจากผู้รับผิดชอบงาน สร้างบัญชีทดสอบ 3 บัญชีผ่าน `https://group36-coursehub.vercel.app/`: ผู้เรียน (user ID 8), เจ้าของ Provider (user ID 9) และบัญชีตรวจฟอร์มสมัครหน้าเว็บ (user ID 10) ทั้งหมดมี role `LEARNER` ตามระบบปัจจุบัน บัญชีที่สองสร้าง Provider ทดสอบ ID 7 สถานะ `PENDING` และเห็นรายการนี้ผ่าน `/api/v1/providers/me` ส่วนบัญชีผู้เรียนไม่เห็น Provider ของอีกคน

สองบัญชีแรก login ตอบ 200, `/api/v1/me` ระบุบัญชีถูกต้อง, endpoint admin ตอบ 403, logout ตอบ 204 และ `/api/v1/me` หลัง logout ตอบ 401; session cookie มี `Secure`, `HttpOnly` และ `SameSite=Lax` ไม่บันทึกรหัสผ่านหรือค่า cookie ใน repo หลักฐานรหัสอยู่ในไฟล์ส่วนตัวบนเครื่องผู้รับผิดชอบงาน บัญชีและ Provider ทดสอบยังคงอยู่สำหรับ UAT รอบถัดไป การลบ Provider ทำได้ผ่าน API โดยเจ้าของ แต่การลบบัญชีต้องประสานผู้ดูแลฐานข้อมูล เพราะยังไม่มี endpoint ลบบัญชี

## UAT โฟลผู้เรียนและ Provider ที่ไม่ต้องใช้ Admin บนเว็บจริง — 10 ตุลาคม 2026

| โฟล | ผล |
| --- | --- |
| ผู้เยี่ยมชมเข้าหน้า protected, กรอกรหัสผ่านผิด | ถูกส่งไปหน้า login; รหัสผิดตอบ 401 และแสดงข้อผิดพลาด |
| สมัครผ่าน UI, login, refresh, logout, login ใหม่ | ผ่าน; session ยังอยู่หลัง refresh และหมดหลัง logout |
| โปรไฟล์ผู้เรียน | อ่าน, แก้, โหลดกลับ และคืนค่าเดิมผ่าน |
| ค้นหา/กรองคอร์ส, matcher | ค้นหาและกรองภาษาได้; matcher แสดงทั้งผลที่พบและกรณีไม่พบ พร้อมกลับไปแก้คำตอบ |
| Bookmark | บันทึก, แสดงรายการ และลบผ่าน; อีกบัญชีมองไม่เห็น bookmark ของผู้เรียน |
| รีวิว | สร้างผ่าน UI, แก้ผ่าน UI/API ผ่าน; รีวิวใหม่เป็น `PENDING` และไม่ปรากฏในรายการสาธารณะ |
| Provider | สร้าง/แก้/ลบ Provider ชั่วคราวผ่าน UI; Provider หลัก ID 7 ยัง `PENDING` |
| สมาชิก Provider | Owner เพิ่ม Editor, Editor เห็นและแก้คอร์สร่างได้ แต่จัดการสมาชิกไม่ได้; เมื่อลบ Editor แล้วถูกปฏิเสธอีกครั้ง |
| คอร์สของ Provider | สร้าง/แก้/ลบ Draft ผ่าน UI/API; Draft ไม่ขึ้น catalog; ส่งตรวจถูกปฏิเสธ 409 เพราะ Provider ยังไม่ `ACTIVE` |

หลังทดสอบคืนค่าโปรไฟล์และลบ bookmark, Editor ชั่วคราว, คอร์สร่าง และ Provider ชั่วคราวแล้ว ตรวจซ้ำว่า Provider หลักไม่มีคอร์สและเหลือ Owner คนเดียว ข้อมูลที่ยังคงไว้สำหรับ UAT ต่อคือบัญชี 3 บัญชี, Provider ID 7 และรีวิว `PENDING` ID 4/5 บนคอร์ส ID 6 (มีข้อความระบุว่าเป็น UAT และห้ามอนุมัติ) ระบบไม่มี API ลบรีวิวหรือบัญชี จึงต้องให้ผู้ดูแลฐานข้อมูลจัดการเมื่องานจบ ไม่เผยแพร่รหัสผ่านหรือ cookie ในรายงาน

## งาน UAT ที่ยังต้องตรวจ

- รอ Admin สำหรับทดสอบการรับรอง Provider, ส่งตรวจ/เผยแพร่คอร์ส และอนุมัติ/ปฏิเสธรีวิวบน production; ระบบไม่เปิดสมัคร Admin ผ่านหน้าเว็บ
- ตรวจ bookmark หลังรีเฟรชหน้าเว็บซ้ำ: รอบตรวจเพิ่มหน้า login โหลดค้าง จึงยังไม่บันทึกว่าเคสนี้ผ่าน
- ตกลงวิธีลบบัญชีและรีวิว UAT ที่คงไว้หลังตรวจ Admin เสร็จ
- พฤติกรรมหน้าเว็บระหว่าง Render Free หลับและตื่น, รวมถึงการกด “ลองใหม่”: รอบนี้ backend ตอบทัน จึงยังไม่ได้ทดสอบ cold start จริง
- ตรวจร่วมกับทีมว่า `group36-coursehub.vercel.app` เป็นโดเมนหลักสำหรับส่งงานหรือไม่ แล้วค่อยปิดรายการ UAT ก่อน release เข้า `main`

**สถานะ Task 27: กำลังดำเนินการ** — เส้นทางสาธารณะที่ตรวจรอบนี้ไม่พบบั๊กขวางการใช้งาน แต่ยังไม่ถือว่า UAT ทุกบทบาทผ่าน
