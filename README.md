# กลุ่ม 36 **คอร์สดีบอกต่อ(ระบบแนะนำคอร์สเรียน) SEC.1**

# รายชื่อสมาชิกกลุ่ม
| ลำดับ | รหัสนักศึกษา | ชื่อ-นามสกุล | Emaill | Branch | หน้าที่รับผิดชอบ |
| :---: | :---: | :--- | :--- | :---: | :--- |
| 1 | 673380054-1 | นายภาคิน เมฆสุวรรณ  | phakin.m@kkumail.com | | |
| 2 | 673380072-9 | นายเกียรติศักดิ์ นันทรัตน์ | keattisak.n@kkumail.com | keattisak_6733800729_01 | Provider CRUD Backend + UI, Database Schema (Flyway) |
| 3 | 673380062-2 |  นายศุภวัฒน์ ข่ายทอง | supawat.kh@kkumail.com | supawat_6733800622_01 | Auth/User/Profile Backend + UI |
| 4 | 673380064-8 | นายสรวิชญ์ วันเสน | sorawit.wan@kkumail.com | | |

## เริ่มระบบบนเครื่อง

1. คัดลอก `.env.example` เป็น `.env` แล้วตั้ง `POSTGRES_PASSWORD` เป็นรหัสผ่านสำหรับเครื่องตนเอง
2. รัน `docker compose up --build`
3. ตรวจ backend ที่ `http://localhost:8080/api/v1/system/liveness` และ Swagger ที่ `http://localhost:8080/swagger-ui.html`

สำหรับ local ที่ใช้ HTTP ให้ตั้ง `SESSION_COOKIE_SECURE=false` ใน `.env` (มีตัวอย่างใน `.env.example`) เพื่อให้เบราว์เซอร์รับ session cookie ได้ เมื่อ deploy ผ่าน HTTPS ให้ตั้ง `SESSION_COOKIE_SECURE=true` หรือไม่กำหนดตัวแปรนี้เพื่อใช้ค่าเริ่มต้น `true` และอย่าปิด Secure ใน production

ฐานข้อมูลสร้างด้วย Flyway migration เท่านั้น โดย JPA ใช้ `validate` เพื่อป้องกัน schema ถูกแก้โดยอัตโนมัติ

ถ้าใช้ PostgreSQL ที่ติดตั้งในเครื่องแทน Docker ให้สร้างฐานข้อมูลว่างก่อน แล้วเพิ่ม `DATABASE_URL=jdbc:postgresql://localhost:5432/<ชื่อฐานข้อมูลว่าง>` ใน `.env` ที่ root จากนั้นรัน `mvn spring-boot:run` ใน `code/backend` ได้โดยตรง Backend จะอ่าน `.env` ของ root สำหรับการรันแบบนี้ด้วย; ค่า `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` ที่ตั้งใน environment จะมีลำดับสูงกว่า หากฐานข้อมูลเดิมมีตารางแต่ไม่มี `flyway_schema_history` ให้ใช้ฐานข้อมูลว่างใหม่เพื่อให้ Flyway สร้าง schema ครบ อย่า baseline schema ที่ยังไม่ครบ

## Auth และโปรไฟล์

- สมัครสมาชิก: `POST /api/v1/auth/register` (เข้าสู่ระบบอัตโนมัติ)
- เข้าสู่ระบบ/ออกจากระบบ: `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`
- ผู้ใช้ปัจจุบัน: `GET /api/v1/me`
- อ่าน/แก้ไขโปรไฟล์: `GET /api/v1/me/profile`, `PUT /api/v1/me/profile`
- บันทึกคอร์ส: `PUT /api/v1/me/bookmarks/{courseId}` และยกเลิกด้วย `DELETE /api/v1/me/bookmarks/{courseId}` (ทำซ้ำได้)
- รายการคอร์สที่บันทึก: `GET /api/v1/me/bookmarks?page=0&size=12`; ตรวจสถานะคอร์สใน catalog ด้วย `GET /api/v1/me/bookmarks/ids?courseIds=1&courseIds=2` (สูงสุด 48 รหัส)
- หน้าเว็บส่วนตัว: `/bookmarks` แสดงเฉพาะคอร์สที่ยังเผยแพร่และผู้ให้บริการยัง active
- ทุกคำขอที่เปลี่ยนข้อมูลต้องขอ CSRF token จาก `GET /api/v1/auth/csrf` ก่อน

## ผู้ให้บริการ (Provider CRUD - UC09, UC10)

ผู้ใช้ที่เข้าสู่ระบบสามารถลงทะเบียนเป็นผู้ให้บริการ (Provider Registration - UC09) โดยกรอกชื่อ, Slug, คำอธิบาย และเว็บไซต์ เมื่อสร้างสำเร็จระบบจะกำหนดสถานะเริ่มต้นเป็น `PENDING` และแต่งตั้งผู้สร้างเป็น `OWNER` ของทีมผู้ให้บริการนั้นทันที พร้อมบันทึกประวัติลง `audit_logs`

สำหรับการจัดการข้อมูลสถาบัน (Provider Profile Management - UC10) สมาชิกทีมที่เป็น `OWNER` หรือ `EDITOR` สามารถดูและแก้ไขข้อมูลของสถาบันตนเองได้ ส่วนการลบ Provider ทำได้เฉพาะ `OWNER` และระบบจะไม่อนุญาตให้ลบหากสถาบันนั้นยังมีคอร์สเปิดสอนอยู่ (ตอบกลับ `409 Conflict`)

| คำขอ | ผลสำเร็จ | เงื่อนไข / สิทธิ์ |
| --- | --- | --- |
| `POST /api/v1/providers` | `201` พร้อม `Location: /api/v1/providers/{id}` | ผู้ใช้ล็อกอิน (สร้าง Provider ใหม่, ได้รับบทบาท `OWNER`) |
| `GET /api/v1/providers/me` | `200` รายการ Provider ที่เป็นสมาชิก | ผู้ใช้ล็อกอิน (แสดง Provider ที่ตนเป็น Owner หรือ Editor) |
| `GET /api/v1/providers/{id}` | `200` ข้อมูล Provider | ทุกคน / สมาชิก |
| `GET /api/v1/providers/slug/{slug}` | `200` ข้อมูล Provider | ทุกคน / สมาชิก |
| `PUT /api/v1/providers/{id}` | `200` ข้อมูลที่แก้ไขแล้ว | เฉพาะ `OWNER` หรือ `EDITOR` ของ Provider นั้น |
| `DELETE /api/v1/providers/{id}` | `204` ไม่มี body | เฉพาะ `OWNER` และต้องไม่มีคอร์สค้างอยู่ (หากมีคอร์สจะตอบ `409`) |

### หน้าจอ Provider Management บนเว็บ
- เข้าใช้งานได้ที่เส้นทาง `/providers`
- แสดงรายชื่อสถาบันที่ผู้ใช้สังกัด พร้อมแสดง Badge สถานะ (`Pending`, `Approved`) และบทบาทสมาชิก (`Owner`, `Editor`)
- มี Modal สำหรับลงทะเบียนสถาบันใหม่ (UC09)
- มี Modal สำหรับแก้ไขข้อมูลสถาบันเดิม (UC10)
- มีปุ่มลบสถาบัน พร้อมระบบยืนยัน และแจ้งเตือนหากติด Conflict

## สมาชิกทีม Provider (UC11)

ผู้ใช้ต้องเข้าสู่ระบบและเป็น `OWNER` ของ Provider ที่ระบุ จึงดู เพิ่ม หรือลบสมาชิกได้ แม้บัญชีเป็น `ADMIN` ก็ต้องเป็น Owner ของ Provider นั้นด้วย ส่วน `OWNER` และ `EDITOR` ผ่าน service ตรวจสิทธิ์สำหรับแก้ Provider/Course ของทีมตนเอง API ชุดนี้ไม่รวมการเปลี่ยนบทบาทสมาชิกเดิมหรือการสร้าง Owner คนแรก ซึ่งเป็นหน้าที่ของ Provider registration และใช้ได้ทุกสถานะ Provider

| คำขอ | ผลสำเร็จ | เงื่อนไข |
| --- | --- | --- |
| `GET /api/v1/providers/{providerId}/members` | `200` รายชื่อเรียงตาม member ID | Owner เท่านั้น |
| `POST /api/v1/providers/{providerId}/members` | `201` พร้อม `Location: /api/v1/providers/{providerId}/members/{memberId}` | Owner เพิ่มบัญชี ACTIVE ที่มีอยู่เป็น `OWNER` หรือ `EDITOR` |
| `DELETE /api/v1/providers/{providerId}/members/{memberId}` | `204` | Owner ลบสมาชิกในทีม; ลบตัวเองได้เมื่อยังมี Owner อื่น |

POST รับ JSON เช่น `{"email":"editor@example.com","memberRole":"EDITOR"}` อีเมลถูกแปลงเป็นตัวพิมพ์เล็กตามระบบสมัครสมาชิก Response สมาชิกมีเฉพาะ `{"id":12,"userId":34,"email":"editor@example.com","memberRole":"EDITOR"}` และทุก response ของ API ชุดนี้มี `Cache-Control: no-store`

ข้อผิดพลาดใช้รูปแบบ `{timestamp,status,code,message,path,fieldErrors}` ของระบบเดิม: `400` ข้อมูลผิด, `401` ไม่ได้เข้าสู่ระบบหรือ session หมดอายุ, `403` ไม่มีสิทธิ์หรือ CSRF ผิด, `404` ไม่พบ Provider/บัญชี/member ID ภายใต้ Provider, `409` สมาชิกซ้ำ/บัญชีถูกระงับ/กำลังลบ Owner คนสุดท้าย การเพิ่มหรือลบที่ไม่สำเร็จไม่เปลี่ยน membership หรือ audit

ตัวอย่าง PowerShell (เข้าสู่ระบบก่อน แล้วขอ CSRF token ใหม่หลัง login):

```powershell
$base = 'http://localhost:8080'
$csrf = Invoke-RestMethod "$base/api/v1/auth/csrf" -SessionVariable memberSession
$login = @{ email = 'owner@example.com'; password = 'your-password' } | ConvertTo-Json
Invoke-RestMethod "$base/api/v1/auth/login" -Method Post -WebSession $memberSession -ContentType 'application/json' -Headers @{ 'X-XSRF-TOKEN' = $csrf.token } -Body $login
$csrf = Invoke-RestMethod "$base/api/v1/auth/csrf" -WebSession $memberSession
$member = @{ email = 'editor@example.com'; memberRole = 'EDITOR' } | ConvertTo-Json
Invoke-RestMethod "$base/api/v1/providers/1/members" -Method Post -WebSession $memberSession -ContentType 'application/json' -Headers @{ 'X-XSRF-TOKEN' = $csrf.token } -Body $member
```

Swagger/OpenAPI ที่ `/swagger-ui.html` และ `/v3/api-docs` ระบุ session cookie, CSRF header, payload และสถานะตอบกลับของทั้งสาม endpoint

Frontend ใช้ Vite proxy เรียก `/api` ไปยัง backend ในเครื่อง:

```powershell
cd code/frontend
npm install
npm run dev
```

รันการตรวจสอบ frontend ด้วย `npm run typecheck`, `npm test` และ `npm run build` ส่วน backend ใช้ `code/backend/mvnw.cmd test` โดย integration test ของ PostgreSQL ต้องมี Docker ทำงาน
