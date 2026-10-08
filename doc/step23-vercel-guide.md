# Step 23 — Vercel proxy/session และ loading/retry

Frontend ใช้ config จาก PR #26 ต่อ: `/api/:path*` ส่งไป `https://coursehub-backend-ahz2.onrender.com/api/:path*` ก่อน fallback ไป `/index.html` สำหรับ React Router หน้า Home และเมนูเปิดได้ระหว่าง Backend ตื่น ส่วนหน้าที่ใช้ API รอ startup เสร็จก่อนโหลดข้อมูล

## การเตรียมระบบและ session

- Startup ตรวจ `GET /api/v1/system/liveness` (ไม่แตะ DB) แล้วอ่าน `GET /api/v1/me`; liveness สำเร็จไม่ได้รับประกันว่า query DB ของทุกหน้าจะสำเร็จ
- Startup timeout 15 วินาทีต่อ request; network/timeout/HTTP 502/503/504 จะรอ 5 วินาทีก่อนลองใหม่ตามลำดับ ไม่ส่ง probe ซ้อน เวลารวมสูงสุดรอบละ 180 วินาที
- `/me` ตอบ 401 หมายถึง guest ส่วน error อื่นไม่ถูกตีความว่า logout; 403/500 แสดง error ทันทีและให้กดลองใหม่
- เมื่อครบเวลาแสดงปุ่ม “ลองใหม่” ซึ่งเริ่มรอบใหม่โดยรักษา URL เดิม ปุ่มหายระหว่างกำลังเตรียมระบบ ยกเลิก request/timer เมื่อ unmount หรือเริ่มรอบใหม่และไม่รับผลจากรอบเก่า รองรับ React StrictMode
- API ทั่วไปและ CSRF timeout 30 วินาทีต่อ request; POST/PUT/DELETE ไม่ retry อัตโนมัติ หากการบันทึก timeout ให้ตรวจข้อมูลก่อนส่งใหม่ เพราะ Backend อาจบันทึกสำเร็จแล้ว
- Browser เรียก relative URL `/api/...` พร้อม `credentials: include`; ก่อน POST/PUT/DELETE ขอ `/api/v1/auth/csrf` และส่ง header ที่ Backend คืนมา (`X-XSRF-TOKEN`)
- HTTPS session cookie ใช้ HttpOnly, SameSite=Lax, Secure=true ตาม Backend ไม่ต้องเปิด CORS หรือเก็บ session/token ใน localStorage

## ตั้งค่า Vercel

1. ใช้ repository ของทีมและ Root Directory `code/frontend` เลือก Vite, Node.js 22, Install `npm ci`, Build `npm run build`, Output `dist` ค่าการ build อยู่ใน `vercel.json` ด้วย
2. กำหนด Production Branch `develop`; Production deploy ให้ GitHub Actions จัดการตาม [คู่มือ CD](deployment-cd.md) อย่าเปิด production auto-deploy ซ้ำกับ workflow
3. Preview จาก `supawat_6733800622_01` ทำได้เมื่อโปรเจกต์ Vercel พร้อม ใช้ Preview deploy ด้วย CLI จาก repository ที่ link กับโปรเจกต์ทีม หรือ Git preview ที่ทีมตั้งไว้ ไม่ใช้ `--prod` เพื่อตรวจ PR
4. ไม่ต้องตั้ง browser API base URL เป็น Render เพราะ `/api` ต้องผ่าน origin ของ Vercel; `COURSEHUB_API_TARGET` ใช้กับ Vite dev proxy สำหรับ local/E2E เท่านั้น
5. Secrets และ `CD_ENABLED` ตั้งที่ GitHub Actions ตามคู่มือ CD ห้ามใส่ใน source หรือ frontend environment variables

## Checklist บน Vercel HTTPS จริง

ใช้บัญชีทดสอบที่ทีมอนุญาตและเก็บ URL Preview/Production พร้อมผลจริงใน PR:

- เปิด `/`, `/login`, `/match`, `/courses` โดยตรงและ refresh deep link; CSS/JS assets ต้องตอบถูกชนิด ส่วน `/api/v1/system/liveness` ต้องเป็น JSON ไม่ใช่ `index.html`
- ตรวจ Network ว่า API ใช้ hostname เดียวกับหน้าเว็บ ไม่เรียก Render จาก browser โดยตรง และไม่มี CORS error
- Login → protected page → refresh → logout; ตรวจ `JSESSIONID` อยู่บนโดเมน Frontend และมี HttpOnly/Secure/SameSite=Lax อย่าเผยค่าของ cookie/token ในรายงาน
- ตรวจ CSRF header และ mutation ที่ได้รับอนุญาตผ่าน proxy; request ที่ไม่มี CSRF ยังถูกปฏิเสธ
- เมื่อ Backend หลับ Home ยังแสดง, หน้าที่ใช้ API แสดง loading แล้วใช้งานต่อได้ หากครบ 3 นาทีให้กดลองใหม่โดยรักษาปลายทาง
- HTTP 502/503/504 จาก proxy อาจเกิดก่อน Backend ตื่น จึง retry เป็น request ใหม่แทนการรอ request เดียวยาวเกินขีดจำกัด proxy

## ตรวจในเครื่อง

```powershell
npm run typecheck --prefix code/frontend
npm test --prefix code/frontend
npm run build --prefix code/frontend
npm run typecheck --prefix test/e2e
npm run test:e2e --prefix code/frontend
```

Vitest จำลอง timeout, cold start 150 วินาที, deadline 180 วินาที, cancellation และ retry; Playwright ตรวจ session/CSRF ด้วย Backend + PostgreSQL แยกสำหรับทดสอบ และจำลอง Backend ยังไม่พร้อมผ่าน request interception ไม่แก้ข้อมูล Neon จริง ดู [รายงาน Step 23](test-reports/step23-vercel.md)

Local/E2E ผ่าน Vite proxy ยืนยัน HTTPS cookie และ Vercel rewrites จริงไม่ได้ ต้องทำ checklist หลัง deploy ก่อนระบุว่า frontend บน Cloud ใช้งานได้
