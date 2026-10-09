# Task 26 — Smoke tests + test report

## ฐานงานและขอบเขตหลักฐาน

- วันที่ตรวจซ้ำหลัง merge `develop`: **9 ตุลาคม 2026 เวลา 22:35 น. (UTC+07:00)**
- Branch: `sorawit_6733800648_01`; source/test tree ที่ตรวจคือ merge commit `019c643` ซึ่งรวม `origin/develop` ที่ `f4dd613` (PR #34, #38 และงาน Task 24)
- ผลรอบเดิมก่อน merge: `4a36b18` วันที่ 9 ตุลาคม 2026 เวลา 20:46–20:50 America/Montevideo มี backend 308, frontend 61 และ E2E 14 ผ่านในเครื่องเดิม ตัวเลขนี้เป็น **ประวัติของ source tree ก่อน merge** ไม่ใช่ผลของ `019c643`
- Production smoke ด้านล่างเป็นหลักฐานเก่าของ [Vercel](https://group36-coursehub.vercel.app/) และ [Render](https://coursehub-backend-ahz2.onrender.com/) จากก่อน merge; [Task 25](task25-deployment.md) ระบุ Vercel source commit `d1e8512` จึงไม่ใช้ยืนยัน deployment ของ branch นี้
- [CI run #94](https://github.com/poohlikung/GROUP36_CourseRecommend/actions/runs/37946736709) ของ `develop` commit `f4dd613` ผ่าน backend, frontend, E2E และ database script safety jobs; Render deploy job สำเร็จ แต่ Vercel deploy job ล้มเหลวที่ Pull production settings ผล CI นี้ตรวจ tree ของ `develop` ไม่ใช่ merge commit `019c643`
- [CI run #95](https://github.com/poohlikung/GROUP36_CourseRecommend/actions/runs/37953485913) ของ PR #33 ที่ source/test revision `8c92f69` ผ่าน backend, frontend, E2E และ database script safety jobs ทั้งหมด การแก้หลัง run นี้เป็นเอกสารเท่านั้น; ดู SHA ของผลตรวจที่ [PR #33 checks](https://github.com/poohlikung/GROUP36_CourseRecommend/pull/33/checks)

## สภาพแวดล้อมและคำสั่ง

| ส่วน | ค่าที่ตรวจจริง |
| --- | --- |
| เครื่อง local รอบหลัง merge | Windows, Node 24.19.0, npm 11.20.0, PowerShell 7.6.5; ไม่มี Java/JAVA_HOME และ Docker ใน PATH |
| E2E รอบหลัง merge | `--list` และ typecheck ผ่าน; ไม่ได้เริ่ม Chromium/PostgreSQL เพราะ `docker` ไม่อยู่ใน PATH (`spawn docker ENOENT`) |
| Backend รอบหลัง merge | `mvnw.cmd verify` เริ่มไม่ได้เพราะ JAVA_HOME ไม่ถูกกำหนด; ใช้ CI run #94 ของ backend source/test tree เดียวกันเป็นหลักฐานแทน local |
| CI configuration | Ubuntu runner, Java 21, Node 22, Chromium; CD jobs มีเงื่อนไข `CD_ENABLED=true` และ push `develop` |

| ชุด | คำสั่งจากราก repo (ยกเว้นระบุ) | Passed | Failed | Skipped | หลักฐาน |
| --- | --- | ---: | ---: | ---: | --- |
| Backend | `cd code/backend; .\\mvnw.cmd -B --no-transfer-progress verify` | — | — | — | local เริ่มไม่ได้เพราะไม่มี Java/JAVA_HOME; [CI run #95 ของ branch](https://github.com/poohlikung/GROUP36_CourseRecommend/actions/runs/37953485913) ผ่าน backend job จำนวนชุดคาดเป็น 312 จาก 308 เดิม + 4 tests ของ [Task 24](task24-backup-restore.md); ไม่ได้อ่าน Surefire summary ของรอบนี้ |
| Frontend | `npm test --prefix code/frontend` | 64 ใน 10 files | 0 | 0 | local Vitest: `Test Files 10 passed`, `Tests 64 passed` |
| Build | `npm run build --prefix code/frontend` | ผ่าน | 0 | — | local `tsc -b && vite build`, 72 modules, `built in 1.69s` |
| Database script safety | `pwsh -NoProfile -File test/scripts/backup-restore.Tests.ps1` | 8 | 0 | 0 | local ผ่านทุกเคสตาม [รายงาน Task 24](task24-backup-restore.md) |
| E2E typecheck | `npm run typecheck --prefix test/e2e` | ผ่าน | 0 | — | local TypeScript ผ่าน |
| E2E discovery | `npm run test:e2e:list --prefix code/frontend` | 15 ใน 5 files | 0 | — | local Playwright `Total: 15 tests in 5 files`; เพิ่ม matcher case จาก PR #34 |
| E2E execution | `npm run test:e2e --prefix code/frontend` | — | — | — | local เริ่มไม่ได้เพราะไม่มี Docker; [CI run #95 ของ branch](https://github.com/poohlikung/GROUP36_CourseRecommend/actions/runs/37953485913) ผ่าน E2E job บน source/test tree เดียวกัน |

ผล local รอบนี้อ่านจาก output ของคำสั่ง ไม่ได้สร้าง Playwright `results.json` ใหม่เพราะ Docker ไม่พร้อม CI อัปโหลด E2E artifacts 7 วันตาม `.github/workflows/ci.yml`; CI ของ PR #33 ผ่านทุก job บน source/test tree ของ branch นี้

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
| Matcher quiz ให้ผลจริงบน production | **blocked** | Endpoint ใช้ POST+CSRF; GET smoke ไม่เรียก workflow นี้ รอบเดิม local E2E matcher 2 tests ผ่าน; หลัง merge มี 3 tests ใน discovery และ CI E2E ของ `f4dd613` ผ่าน แต่ไม่แทน production |
| สมัคร/เข้าสู่ระบบ/ออกจากระบบบน production | **blocked** | ยังไม่มีบัญชี disposable ที่ทีมกำหนดและวิธีล้างข้อมูล จึงไม่ส่ง mutation |
| CSRF `XSRF-TOKEN` cookie มี `Secure` บน HTTPS | **pass** | GET `/api/v1/auth/csrf` HTTP 200 JSON และ Set-Cookie มี `Secure`; ไม่เก็บ token |
| Session cookie มี `Secure` และ session คงอยู่หลัง refresh | **blocked** | ต้อง login ด้วยบัญชีทดสอบ production; local auth E2E ผ่าน แต่ไม่พิสูจน์ cookie production |
| Guest เข้า `/me` และ admin API ไม่ได้ | **pass** | Vercel GET ทั้งสอง endpoint ตอบ 401 |
| Learner, provider, admin permission บน production | **blocked** | ไม่มีบัญชีทดสอบแต่ละ role; local E2E ตรวจ learner/admin/provider flow บน DB แยก |
| Cold start UI/retry บน production และไม่มี mutation ซ้ำ | **blocked** | Render liveness ใช้ 107 วินาที; local startup E2E 2 tests จำลอง 503/403 แล้ว recovery แต่ไม่ได้พิสูจน์ production UI ระหว่าง cold start หรือการไม่ยิง mutation ซ้ำ |
| Backup/restore และ CD บน production | **partial** | [Task 24](task24-backup-restore.md) มีหลักฐาน Neon backup/restore จริง 13/13 ตารางและ restart แล้วข้อมูลคงอยู่; [CI run #94 ของ `f4dd613`](https://github.com/poohlikung/GROUP36_CourseRecommend/actions/runs/37946736709) รัน deploy jobs แล้ว โดย Render job สำเร็จ แต่ Vercel job ล้มเหลว จึงยังต้องแก้ frontend CD และตรวจ SHA ที่ขึ้นจริงบน platform |

## ข้อสรุปและรายการค้าง

หลัง merge `develop` local frontend 64/64, build, database script safety 8/8, E2E typecheck และ discovery 15 tests ผ่าน Backend suite มี 4 tests ใหม่ของ Task 24 (จำนวนคาด 312) และ CI backend/E2E ของ branch ผ่านใน run #95 แต่ local ไม่มี Java และ Docker

Production GET smoke 14/14 และ browser navigation 3/3 เป็นหลักฐานก่อน merge ที่ไม่ยืนยัน SHA ของ branch นี้ **Task 26 ยังไม่ปิด** เพราะ production auth/session/role/matcher/cold-start retry, Vercel CD ที่ล้มเหลวใน run #94 และการยืนยัน SHA บน platform ค้างอยู่ Backup/restore มีหลักฐานแล้วใน [Task 24](task24-backup-restore.md)

ก่อนตรวจ production auth ให้ทีมระบุบัญชีทดสอบเฉพาะและเจ้าของข้อมูล, กำหนดวิธีลบบัญชี/ข้อมูลที่สร้าง, และตรวจ cookie/CSRF ผ่าน HTTPS โดยไม่บันทึกค่าลับ การทดสอบ local Playwright ใช้ฐานข้อมูลแยกและไม่เป็นหลักฐาน production
