# Task 26 — Smoke tests + test report

## ฐานงานและขอบเขตหลักฐาน

- วันที่ตรวจ: **9 ตุลาคม 2026 เวลา 20:46–20:50 America/Montevideo (UTC−03:00)**
- Branch: `sorawit_6733800648_01`; working tree ก่อนเริ่มสะอาดที่ `8451702ffdbeb86cd2a3239cc9ccbe932d72f570`
- Source/test revision ที่ใช้รัน local: `4a36b18ee58d6ec9674467bedc205c12a2713e9b` (ไม่มีการแก้ `code/` หรือ `test/e2e/` ระหว่างรัน; commit ถัดมาแก้เอกสารเท่านั้น) E2E runner บันทึก SHA นี้ใน `environment.json` ส่วน backend/frontend เริ่มก่อน commit นี้เสร็จ จึงอ้าง **source tree** เดียวกับฐาน `8451702` และ `4a36b18` ซึ่งต่างกันเพียงสคริปต์ smoke ใหม่
- Production ที่ทีมบันทึกไว้: [Vercel](https://group36-coursehub.vercel.app/) และ [Render](https://coursehub-backend-ahz2.onrender.com/); Vercel deployment ใน [Task 25](task25-deployment.md) มาจาก `d1e8512` ไม่ใช่ branch นี้ (`git diff d1e8512 HEAD -- code/frontend` มีความต่าง) จึง **ห้ามตีความ production smoke ว่าเป็นการทดสอบ revision ของ branch นี้**
- CI ก่อนเริ่ม: [run 37937944725](https://github.com/poohlikung/GROUP36_CourseRecommend/actions/runs/37937944725) ผ่านสำหรับ `8451702` เท่านั้น ไม่ใช่หลักฐานของ commit Task 26 ผล CI ของ commit สุดท้ายต้องตรวจจาก [PR #33 checks](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/33/checks) พร้อม SHA ที่ run ระบุ

## สภาพแวดล้อมและคำสั่ง

| ส่วน | ค่าที่ตรวจจริง |
| --- | --- |
| เครื่อง local | Windows, Java Temurin 21.0.12.1, Node 26.10.0, npm 11.19.1, Docker Server 29.8.2 / Compose 5.5.1 |
| Browser | Chromium 149.0.7827.55; Playwright 1.61.1, headless, 1 worker, retries 0 |
| E2E database | PostgreSQL 16.15 ใน Docker tmpfs; runner สร้าง project ใหม่และ `down --volumes` หลังรัน |
| CI configuration | Ubuntu runner, Java 21, Node 22, Chromium; CD jobs มีเงื่อนไข `CD_ENABLED=true` และ push `develop` |

| ชุด | คำสั่งจากราก repo (ยกเว้นระบุ) | Passed | Failed | Skipped | หลักฐาน |
| --- | --- | ---: | ---: | ---: | --- |
| Backend | `cd code/backend; ./mvnw -B --no-transfer-progress verify` (`.\\mvnw.cmd` บน Windows) | 308 | 0 | 0 | Surefire summary `Tests run: 308, Failures: 0, Errors: 0, Skipped: 0`, `BUILD SUCCESS`; local `test/reports/task26-backend.log` |
| Frontend | `cd code/frontend; npm test` | 61 ใน 10 files | 0 | 0 | Vitest summary `Test Files 10 passed`, `Tests 61 passed`; local `test/reports/task26-frontend-test.log` |
| Build | `cd code/frontend; npm run build` | ผ่าน | 0 | — | `tsc -b && vite build`, 72 modules, `built in 1.50s`; local `test/reports/task26-frontend-build.log` |
| E2E discovery | `npm run test:e2e:list --prefix code/frontend` | 14 ใน 5 files | 0 | — | Playwright `Total: 14 tests in 5 files` |
| E2E | `npm run test:e2e --prefix code/frontend` | 14 | 0 | 0 | `results.json`: expected 14, unexpected 0, skipped 0, flaky 0; `environment.json` SHA `4a36b18`; local `test/reports/e2e/coursehub-e2e-9f3efd6e/` มี JSON, JUnit, HTML และ services log; `test/reports/task26-e2e-run.log` |

Local logs และ Playwright artifacts ใน `test/reports/` ไม่ commit เพราะอาจมีรายละเอียดของ fixture; CI อัปโหลด E2E artifacts 7 วันตาม `.github/workflows/ci.yml` ตัวเลขข้างต้นอ่านจาก test summary และ JSON stats ไม่ใช่ exit code อย่างเดียว

## Production smoke รายกรณี

รัน `node test/smoke/production-readonly.mjs doc/test-reports/evidence/production-readonly.json` ซึ่งส่ง **GET เท่านั้น** หลัง Render ตื่นจึงตรวจ endpoint อื่น; จากนั้นรัน `node test/smoke/production-browser.mjs doc/test-reports/evidence/production-browser.json` เพื่อยืนยันการ render/refresh จริง (ต้องติดตั้ง `npm ci --prefix test/e2e` และ Chromium ของ Playwright ก่อน) หลักฐานที่ commit: [GET JSON](evidence/production-readonly.json), [browser JSON](evidence/production-browser.json) ไม่มี token หรือ cookie value

| กรณี / เกณฑ์ผ่าน | ผล | หลักฐานและขอบเขต |
| --- | --- | --- |
| หน้าแรก HTML 200 และ hero WebP 200 | **pass** | GET `home`, `hero-asset`; browser เห็น heading หน้าแรก |
| เปิด `/match` โดยตรงและ refresh, HTML 200 และ heading ปรากฏ | **pass** | GET สองรอบและ browser `match-direct-browser`/`match-refresh-browser` HTTP 200 |
| Render liveness JSON `status: UP` | **pass** | HTTP 200; คำขอแรกใช้ 107,073 ms จึงเป็นหลักฐาน cold start/liveness เท่านั้น |
| Vercel proxy liveness JSON `status: UP` | **pass** | HTTP 200 ผ่าน `/api/v1/system/liveness` |
| Swagger UI HTML 200 | **pass** | Render `/swagger-ui/index.html` HTTP 200 |
| Catalog courses paged JSON, categories/platforms array | **pass** | GET ผ่าน Vercel ทั้ง 3 endpoint HTTP 200 และ schema ขั้นต้นถูกต้อง |
| Matcher route ใน OpenAPI | **pass** | GET `/v3/api-docs` HTTP 200 พบ `POST /api/v1/course-matches` |
| Matcher quiz ให้ผลจริงบน production | **blocked** | Endpoint ใช้ POST+CSRF; GET smoke ไม่เรียก workflow นี้ ผล local E2E matcher 2 tests ผ่านแต่ไม่แทน production |
| สมัคร/เข้าสู่ระบบ/ออกจากระบบบน production | **blocked** | ยังไม่มีบัญชี disposable ที่ทีมกำหนดและวิธีล้างข้อมูล จึงไม่ส่ง mutation |
| CSRF `XSRF-TOKEN` cookie มี `Secure` บน HTTPS | **pass** | GET `/api/v1/auth/csrf` HTTP 200 JSON และ Set-Cookie มี `Secure`; ไม่เก็บ token |
| Session cookie มี `Secure` และ session คงอยู่หลัง refresh | **blocked** | ต้อง login ด้วยบัญชีทดสอบ production; local auth E2E ผ่าน แต่ไม่พิสูจน์ cookie production |
| Guest เข้า `/me` และ admin API ไม่ได้ | **pass** | Vercel GET ทั้งสอง endpoint ตอบ 401 |
| Learner, provider, admin permission บน production | **blocked** | ไม่มีบัญชีทดสอบแต่ละ role; local E2E ตรวจ learner/admin/provider flow บน DB แยก |
| Cold start UI/retry บน production และไม่มี mutation ซ้ำ | **blocked** | Render liveness ใช้ 107 วินาที; local startup E2E 2 tests จำลอง 503/403 แล้ว recovery แต่ไม่ได้พิสูจน์ production UI ระหว่าง cold start หรือการไม่ยิง mutation ซ้ำ |
| Backup/restore และ CD บน production | **blocked** | ไม่มีหลักฐาน rehearsal หรือ deploy jobs ที่ทำงานจริง; CI เดิม skip deploy jobs |

## ข้อสรุปและรายการค้าง

Local backend 308/308, frontend 61/61, build และ E2E 14/14 ผ่านโดยไม่มี failed/skipped/flaky ตามหลักฐานข้างต้น Production GET smoke 14/14 และ browser navigation 3/3 ผ่าน แต่เป็น deployment ที่ยังไม่พิสูจน์ว่าใช้ SHA ของ branch นี้ **Task 26 ยังไม่ปิด** เพราะ production auth/session/role/matcher/cold-start retry, backup/restore และ CD ค้าง รวมทั้งต้องตรวจ CI ของ commit สุดท้าย

ก่อนตรวจ production auth ให้ทีมระบุบัญชีทดสอบเฉพาะและเจ้าของข้อมูล, กำหนดวิธีลบบัญชี/ข้อมูลที่สร้าง, และตรวจ cookie/CSRF ผ่าน HTTPS โดยไม่บันทึกค่าลับ การทดสอบ local Playwright ใช้ฐานข้อมูลแยกและไม่เป็นหลักฐาน production
