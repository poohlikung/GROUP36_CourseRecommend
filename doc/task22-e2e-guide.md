# Task 22 — End-to-end learner/provider/admin

ชุดทดสอบนี้เปิด Chromium และเรียก React → Spring Boot → PostgreSQL จริง ไม่มีการ mock API ของ CourseHub โดยใช้ Playwright 1.61.1 และ Flyway V1–V4 สร้างฐานข้อมูลใหม่ในแต่ละรอบ

## เตรียมเครื่องและรัน

ต้องมี Docker Desktop ที่เปิด Linux engine, Docker Compose v2 และ Node.js 22 หรือรุ่นที่ Playwright/Vite รองรับ Backend build และ runtime ใช้ Java 21 ใน Docker จึงไม่ต้องติดตั้ง Java เพื่อรัน E2E

จาก root repository:

```powershell
npm ci --prefix code/frontend
npm ci --prefix test/e2e
cd test/e2e
npx playwright install chromium
cd ../../code/frontend
npm run test:e2e
```

บน Linux/CI ให้ติดตั้ง browser dependencies ด้วย `npx playwright install --with-deps chromium` แทนคำสั่งติดตั้ง browser ข้างต้น

จาก `code/frontend`:

```powershell
npm run test:e2e:headed
npm run test:e2e:list
npm run test:e2e -- --grep "provider registers"
npm run typecheck --prefix ../../test/e2e
```

`test:e2e:list` ตรวจการค้นพบ tests โดยไม่เปิด Docker หรือ browser ส่วน `--grep` ใช้ตรวจบาง scenario ระหว่างพัฒนา ก่อนส่งงานต้องรันทั้ง suite

## การแยก environment และข้อมูล

- Runner สร้าง Compose project ชื่อ `coursehub-e2e-<random>` ให้ PostgreSQL มีฐานข้อมูล `coursehub_e2e` อยู่บน tmpfs และไม่มี host database port
- Backend เปิดเฉพาะ loopback `18080`; Vite เปิด `15173` แบบ strict port และ proxy ไป backend ของ E2E หากพอร์ตถูกใช้งานอยู่ให้หยุด process ที่ใช้พอร์ตนั้นก่อนรัน
- Environment ของ backend ระบุ database credentials สำหรับ test โดยตรงและตั้ง `SESSION_COOKIE_SECURE=false` เพื่อใช้ HTTP ในเครื่อง
- รอ `/api/v1/catalog/categories` ตอบข้อมูลสำเร็จก่อนเปิด browser เพื่อยืนยันทั้ง backend และฐานข้อมูลที่ migrate แล้ว
- แต่ละ test ใช้บัญชีเฉพาะรอบและ browser contexts แยกกัน บทบาท Provider หมายถึงบัญชี LEARNER ที่เป็น OWNER ของสถาบัน
- Fixture สมัครบัญชีผ่าน API แล้วเปลี่ยนเฉพาะบัญชี Admin ของ test เป็น ADMIN ด้วย SQL ในฐานข้อมูล E2E จากนั้น login ใหม่ ไม่มี test-only endpoint เพิ่มในแอป
- UI actions ใช้ session/CSRF จริง API helpers ขอ token ใหม่ก่อน mutation และ API รีวิวใช้ cookies ของ browser context ผู้เรียน
- API fixture อ่าน Course ใหม่หลัง create/submit commit ก่อนใช้ version ในคำขอถัดไป เพราะ mutation DTO ในระบบเดิมอาจคืน version ก่อน JPA flush; Admin UI อ่าน version ปัจจุบันจาก queue
- Runner เก็บ service logs และสั่ง `down --volumes --remove-orphans` เฉพาะ Compose project ที่ตนสร้างเมื่อจบหรือผิดพลาด หาก cleanup ล้มเหลวจะคืน exit code ที่ไม่สำเร็จและแสดงชื่อ project
- E2E backend Dockerfile มี Maven cache เพื่อให้ build ซ้ำได้เร็วขึ้น โดย cache เก็บ dependencies ไม่ใช่ข้อมูลฐานข้อมูล

## Scenarios

| ไฟล์ | สิ่งที่ตรวจ | วิธีทดสอบ |
| --- | --- | --- |
| `auth.spec.ts` | สมัคร, refresh session, logout, login ผิด/ถูก, protected routes, Admin และ CSRF permissions | UI + API assertions |
| `publishing.spec.ts` | ลงทะเบียน Provider, ปิดปุ่มส่งตรวจก่อนรับรอง, สร้าง draft, รับรอง Provider, ส่งตรวจ, อนุมัติ, ค้นหา/กรอง/ลิงก์ต้นทาง | flow หลักผ่าน UI ทุกบทบาท |
| `publishing.spec.ts` | ขอแก้พร้อมเหตุผล, Provider อ่านเหตุผล แก้และส่งใหม่, Admin เผยแพร่ | API เตรียม draft; ขั้นตอนที่ตรวจผ่าน UI |
| `learner.spec.ts` | bookmark อยู่หลัง refresh, ไม่ซ้ำ, ไม่ข้ามบัญชี และลบได้ | UI + API ตรวจข้อมูล |
| `learner.spec.ts` | นอกทีมอ่าน draft/แก้/ส่งตรวจไม่ได้ และข้อมูล/version ไม่เปลี่ยน | UI + API จริง |
| `learner.spec.ts` | รีวิว pending ไม่คิดคะแนน, อนุมัติแล้วคิดคะแนน, แก้แล้วกลับ pending, ปฏิเสธพร้อมเหตุผล, รีวิวซ้ำ 409 | ผู้เรียนสร้าง/แก้ผ่าน API; Admin/Catalog ผ่าน UI |
| `matcher.spec.ts` | guest ส่ง quiz พร้อม CSRF ได้คอร์สที่ตรงเงื่อนไข คะแนนและเหตุผล; empty state และแก้คำตอบ | UI + response assertions |

Matcher ใช้คอร์สตัวอย่าง `Data Analytics and Python for Everyone` ที่ seed ด้วย Flyway เป็น oracle ของผลสำเร็จ ส่วนคอร์สของ fixtures อื่นอยู่ในหมวด programming และแต่ละ scenario ไม่ต้องพึ่งผลของ test ก่อนหน้า

## หลักฐานและ CI

แต่ละรอบเก็บไว้ใน `test/reports/e2e/coursehub-e2e-<random>/`:

- `environment.json`: commit, เวลาเริ่ม, Node/OS, Playwright และคำสั่ง
- `results.json`, `junit.xml` และ `html/index.html`: ผล test และ HTML report
- `services.log`: backend/PostgreSQL logs
- `results/`: screenshot, trace และ video ของ contexts เมื่อ test ล้มเหลว รวม contexts ของทุกบทบาท

เปิด HTML report จาก `test/e2e`:

```powershell
npx playwright show-report ../reports/e2e/coursehub-e2e-<random>/html
```

CI เพิ่ม job `Learner provider admin E2E` บน PR เข้า develop/main และ push develop/main ใช้ Node 22, Chromium และ stack เดียวกัน เก็บ artifacts 7 วันแม้ test ล้มเหลว ผล CI ต้องดูจาก run จริงหลัง push/เปิด PR

ตั้งหนึ่ง worker และ retries เป็นศูนย์ ไม่มีเวลารอคงที่ใน browser scenarios Runner ถือว่าผ่านเมื่อมี test สำเร็จอย่างน้อยหนึ่งกรณีและไม่มี failed/skipped/flaky test; ชุดเต็มมี 10 tests

## ขอบเขตหลักฐาน

หน้าเขียน/แก้รีวิวของผู้เรียนยังไม่มีใน develop จึงใช้ API จริงเฉพาะช่วงนั้นตามขอบเขต Task 22 ผลทดสอบนี้ไม่ใช่หลักฐานว่ามี UI เขียนรีวิวแล้ว Chromium desktop เป็น browser ที่ตรวจในรอบนี้ การทดสอบ cloud cold start, load และ browser/mobile อื่นอยู่นอกชุดนี้ ลิงก์ออกไปเรียนตรวจ href/target โดยไม่ต้องเรียกเว็บไซต์ภายนอก

ผลการรันจริงอยู่ใน [รายงาน Task 22](test-reports/task22-e2e.md)
