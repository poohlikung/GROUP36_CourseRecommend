# กลุ่ม 36 **คอร์สดีบอกต่อ(ระบบแนะนำคอร์สเรียน) SEC.1**

# รายชื่อสมาชิกกลุ่ม
| ลำดับ | รหัสนักศึกษา | ชื่อ-นามสกุล | Emaill | Branch | หน้าที่รับผิดชอบ |
| :---: | :---: | :--- | :--- | :---: | :--- |
| 1 | 673380054-1 | นายภาคิน เมฆสุวรรณ  | phakin.m@kkumail.com | | |
| 2 | 673380072-9 | นายเกียรติศักดิ์ นันทรัตน์ | keattisak.n@kkumail.com | | |
| 3 | 673380062-2 |  นายศุภวัฒน์ ข่ายทอง | supawat.kh@kkumail.com | supawat_6733800622_01 | Auth/User/Profile Backend + UI |
| 4 | 673380064-8 | นายสรวิชญ์ วันเสน | sorawit.wan@kkumail.com | | |

## เริ่มระบบบนเครื่อง

1. คัดลอก `.env.example` เป็น `.env` แล้วตั้ง `POSTGRES_PASSWORD` เป็นรหัสผ่านสำหรับเครื่องตนเอง
2. รัน `docker compose up --build`
3. ตรวจ backend ที่ `http://localhost:8080/api/v1/system/liveness` และ Swagger ที่ `http://localhost:8080/swagger-ui.html`

สำหรับ local ที่ใช้ HTTP ให้ตั้ง `SESSION_COOKIE_SECURE=false` ใน `.env` (มีตัวอย่างใน `.env.example`) เพื่อให้เบราว์เซอร์รับ session cookie ได้ เมื่อ deploy ผ่าน HTTPS ให้ตั้ง `SESSION_COOKIE_SECURE=true` หรือไม่กำหนดตัวแปรนี้เพื่อใช้ค่าเริ่มต้น `true` และอย่าปิด Secure ใน production

ฐานข้อมูลสร้างด้วย Flyway migration เท่านั้น โดย JPA ใช้ `validate` เพื่อป้องกัน schema ถูกแก้โดยอัตโนมัติ

## Auth และโปรไฟล์

- สมัครสมาชิก: `POST /api/v1/auth/register` (เข้าสู่ระบบอัตโนมัติ)
- เข้าสู่ระบบ/ออกจากระบบ: `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`
- ผู้ใช้ปัจจุบัน: `GET /api/v1/me`
- อ่าน/แก้ไขโปรไฟล์: `GET /api/v1/me/profile`, `PUT /api/v1/me/profile`
- ทุกคำขอที่เปลี่ยนข้อมูลต้องขอ CSRF token จาก `GET /api/v1/auth/csrf` ก่อน

Frontend ใช้ Vite proxy เรียก `/api` ไปยัง backend ในเครื่อง:

```powershell
cd code/frontend
npm install
npm run dev
```

รันการตรวจสอบ frontend ด้วย `npm run typecheck`, `npm test` และ `npm run build` ส่วน backend ใช้ `code/backend/mvnw.cmd test` โดย integration test ของ PostgreSQL ต้องมี Docker ทำงาน
