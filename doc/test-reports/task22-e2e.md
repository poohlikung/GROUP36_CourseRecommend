# Task 22 — รายงาน End-to-end learner/provider/admin

วันที่ทดสอบ: **7 ตุลาคม 2026** (Asia/Bangkok)

Branch: `supawat_6733800622_01` · develop ที่ pull ก่อนเริ่ม: `a953c3316ce852203e689453c48222ecb87205eb`

Code commit ของ E2E สองรอบยืนยัน: **`4707fda4f55d7be71bc11656e1642c272759c17e`** การแก้หลัง commit นี้เป็นเอกสารรายงาน/คู่มือเท่านั้น

## Environment

| ส่วน | เวอร์ชัน/การตั้งค่าที่ใช้จริง |
| --- | --- |
| OS | Windows (`win32`) |
| Node.js | 24.19.0; CI กำหนด Node 22 แต่ยังไม่มี remote CI run ในรายงานนี้ |
| Browser | Chromium / Chrome for Testing 149.0.7827.55 (Playwright build v1228) |
| Playwright | 1.61.1, headless, หนึ่ง worker, retries 0 |
| E2E backend | Spring Boot 3.5.16, Java 21.0.12.1 ใน Docker |
| E2E database | PostgreSQL 16.15, Flyway V1–V4, ฐานข้อมูลใหม่บน tmpfs ทุกครั้ง |
| Docker Server | 29.8.0 |
| Frontend | React 18.3.1, Vite 6.4.3, ผ่าน proxy `/api` ไป backend ของ E2E |
| Backend regression suite | Maven Wrapper, Java 25.0.3 บนเครื่อง, compile target Java 21, รวม Testcontainers PostgreSQL |

## คำสั่งและผลจริง

จาก `code/frontend` รัน `npm run test:e2e` สองครั้งต่อเนื่องโดย runner สร้าง/ลบ stack ของตนเองทุกครั้ง:

| รอบ | เวลาเริ่ม Playwright (Bangkok) | Compose project | Passed | Failed | Skipped | Flaky | เวลา Playwright |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 22:02:24 | `coursehub-e2e-11df3565` | 10 | 0 | 0 | 0 | 50.17 วินาที |
| 2 | 22:03:36 | `coursehub-e2e-04806770` | 10 | 0 | 0 | 0 | 63.56 วินาที |

ทั้งสองรอบคืน exit code 0 และไม่มี container ของสอง project เหลือหลัง cleanup เวลาในตารางไม่รวม Docker build/startup/cleanup

หลักฐาน local ที่ runner สร้างไว้และถูก `.gitignore` ไม่ commit:

- `test/reports/e2e/coursehub-e2e-11df3565/`
- `test/reports/e2e/coursehub-e2e-04806770/`

แต่ละ directory มี `environment.json`, `results.json`, `junit.xml`, `html/index.html` และ `services.log` ผลยืนยันอ่านจาก JSON stats ไม่ใช่เพียง exit code

| การตรวจเพิ่มเติม | คำสั่ง | ผล |
| --- | --- | --- |
| Backend regression | `code/backend/mvnw.cmd -B --no-transfer-progress verify` | 308 tests, failures/errors/skipped 0; BUILD SUCCESS |
| Frontend regression | `npm test` จาก `code/frontend` | 31 tests ใน 8 files ผ่านทั้งหมด |
| Frontend types | `npm run typecheck` | ผ่าน |
| Frontend production build | `npm run build` | ผ่าน |
| E2E types | `npm run typecheck --prefix ../../test/e2e` จาก `code/frontend` | ผ่าน |
| Test discovery | `npm run test:e2e:list` | ค้นพบ 10 tests ใน 4 files |
| Compose configuration | `docker compose -f test/e2e/compose.yml -p coursehub-e2e-config config --quiet` | ผ่าน |

Backend regression รันหลังแก้ audit assertions ใน `2e202e6`; ไม่มีการเปลี่ยน backend source/test หลังจากนั้น ผล frontend รวม regression ใหม่สำหรับ platform selection ซึ่งเป็น source เดียวกับ code commit ที่ยืนยัน E2E ข้างต้น

## สิ่งที่ตรวจผ่าน

- Auth (3): สมัครและเข้า profile, refresh session, logout, login ผิด/ถูก, guest ถูก redirect จากหน้าส่วนตัว, Learner ถูกปฏิเสธ Admin UI/API และ mutation ที่ไม่มี CSRF
- Learner (3): save/refresh/remove bookmark, บันทึกซ้ำไม่เพิ่มรายการ, ไม่เห็น bookmark ข้ามบัญชี, นอกทีมอ่าน draft/แก้/ส่งตรวจไม่ได้และข้อมูล/version ไม่เปลี่ยน, review moderation และคะแนนจากรีวิวที่เผยแพร่
- Matcher (2): anonymous quiz ใช้ CSRF จริง ได้ seeded course ที่ตรง category/level/language/budget พร้อม score/reasons และแสดง empty state โดยไม่ผ่อนเงื่อนไข
- Publishing (2): Provider สมัคร/สร้าง draft/ส่งตรวจ → Admin รับรอง/เผยแพร่ → Learner ค้นหาและกรองคอร์ส; อีก flow ตรวจขอแก้/เหตุผล/แก้ไข/ส่งใหม่/เผยแพร่

ไม่มีการ mock API ของระบบ ช่วงสร้าง/แก้รีวิวผู้เรียนใช้ API จริงกับ cookies ของ browser context ส่วน Admin ตรวจรีวิวและ Catalog แสดงคะแนนผ่าน UI

## Bugs ที่พบและแก้พร้อมหลักฐาน

1. สมัครผ่าน browser แล้ว PublicOnlyRoute redirect ไป `/` แข่งกับ `/profile`: ให้ guard ใช้ปลายทางของหน้าสมัครหรือหน้าที่ต้องการกลับหลัง login; `auth.spec.ts` ยืนยันสมัคร/refresh/logout/login กลับ profile ผ่าน
2. Catalog options request เก่าที่เสร็จช้าเขียนทับ platform ที่เลือก ทำให้ URL Coursera ถูกตรวจด้วย platform Chula MOOC: abort request เก่าและตั้งค่า default เฉพาะเมื่อยังไม่มีค่าที่เลือก; มี frontend regression สำหรับ late response และ browser publishing flow ผ่านซ้ำ
3. Backend tests เดิม 2 กรณีนับ audit ของ feature อื่นที่อยู่ใน shared database: จำกัด assertions ตาม entity type/id ของรีวิวที่ทดสอบ โดยยังตรวจ action/status/reason และทั้ง 308 tests ผ่าน

## ข้อจำกัดและสถานะ CI

- ยังไม่มี UI ผู้เรียนเขียน/แก้รีวิว ใช้ API จริงเฉพาะช่วงนั้นตามขอบเขตที่ตกลง ไม่ถือว่ามีหน้ารีวิวของผู้เรียนแล้ว
- ตรวจ Chromium desktop/local stack; cloud cold start, load, mobile และ browser อื่นยังไม่อยู่ในหลักฐานนี้
- Course mutation DTO ในระบบเดิมอาจคืน version ก่อน transaction flush; fixtures อ่าน Course ใหม่หลัง commit ก่อนใช้ version กับคำขอถัดไป เช่นเดียวกับ Admin UI ที่อ่าน queue การทดสอบนี้ไม่ได้แก้สัญญา response ของ Course API
- ไม่มี coverage percentage สำหรับ E2E และไม่ได้เพิ่ม coverage gate
- CI job พร้อมรันบน PR เข้า develop/main และ push develop/main พร้อม upload artifacts 7 วัน แต่ยังไม่อ้างว่า remote CI ผ่าน เพราะผู้ใช้จะเปิด PR เอง

วิธีติดตั้ง รันเฉพาะ scenario และเปิดรายงานอยู่ใน [คู่มือ Task 22](../task22-e2e-guide.md)
