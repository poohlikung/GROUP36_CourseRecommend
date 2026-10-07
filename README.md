# กลุ่ม 36 **คอร์สดีบอกต่อ(ระบบแนะนำคอร์สเรียน) SEC.1**

# รายชื่อสมาชิกกลุ่ม
| ลำดับ | รหัสนักศึกษา | ชื่อ-นามสกุล | Emaill | Branch | หน้าที่รับผิดชอบ |
| :---: | :---: | :--- | :--- | :---: | :--- |
| 1 | 673380054-1 | นายภาคิน เมฆสุวรรณ  | phakin.m@kkumail.com | | |
| 2 | 673380072-9 | นายเกียรติศักดิ์ นันทรัตน์ | keattisak.n@kkumail.com | keattisak_6733800729_01 | Provider & Course CRUD Backend + UI, Database Schema (Flyway) |
| 3 | 673380062-2 |  นายศุภวัฒน์ ข่ายทอง | supawat.kh@kkumail.com | supawat_6733800622_01 | Auth/User/Profile Backend + UI |
| 4 | 673380064-8 | นายสรวิชญ์ วันเสน | sorawit.wan@kkumail.com | sorawit_6733800648_01 | Admin Course Moderation & Provider Verification Backend + UI |

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
| `GET /api/v1/providers/{id}` | `200` ข้อมูล Provider | ทุกคนดูได้เมื่อ Provider `ACTIVE`; สถานะอื่นดูได้เฉพาะ `OWNER`/`EDITOR` หรือ Admin (คนอื่นได้ `404`) |
| `GET /api/v1/providers/slug/{slug}` | `200` ข้อมูล Provider | เงื่อนไขเดียวกับ `GET /api/v1/providers/{id}` |
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

## การจัดการคอร์สเรียน (Course CRUD - UC12, UC13, UC14)

สมาชิกทีมผู้ให้บริการที่เป็น `OWNER` หรือ `EDITOR` สามารถจัดการคอร์สเรียนของสถาบันตนเองได้ โดยมี Use Cases และเงื่อนไขทางธุรกิจดังนี้:
- **สร้างคอร์สใหม่ (UC12 - Create Course Draft)**: บันทึกข้อมูลคอร์สเรียนโดยเริ่มต้นที่สถานะ `DRAFT` เสมอ พร้อมกำหนดราคาลงตาราง `course_prices` (รองรับ `FREE`, `ONE_TIME`, `SUBSCRIPTION`) และเชื่อมโยงหมวดหมู่ (`categories`)
- **แก้ไขคอร์สเรียน (UC12 - Edit Course)**: สมาชิกที่เป็น `OWNER` หรือ `EDITOR` สามารถปรับปรุงข้อมูลทั่วไป แพลตฟอร์ม ราคา และหมวดหมู่ของคอร์สในสถาบันตนเองได้ โดย Slug ต้องไม่ซ้ำกับคอร์สอื่นในระบบ คอร์สที่ `PUBLISHED` หรือ `PENDING` จะกลับเป็น `DRAFT` หลังแก้ไขเพื่อให้ต้องส่งตรวจใหม่ (หน้าเว็บแสดงคำเตือนก่อนบันทึก) และแก้ไขคอร์ส `SUSPENDED` หรือ `ARCHIVED` ไม่ได้ (ตอบ `409`) ถ้าคำขอไม่ส่ง `paymentType` ระบบจะคงราคาเดิมไว้
- **ส่งคอร์สให้ตรวจสอบ (UC13 - Submit Course for Moderation)**: ผู้สร้างหรือผู้ดูแลสามารถส่งคอร์สที่อยู่ในสถานะ `DRAFT` หรือ `REVISION_REQUESTED` เข้าสู่กระบวนการตรวจอนุมัติ โดย Provider ต้องมีสถานะ `ACTIVE` (ได้รับการอนุมัติตาม UC16) ระบบจะเปลี่ยนสถานะเป็น `PENDING` เพื่อรอการตรวจสอบจากผู้ดูแลระบบ หาก Provider ยัง `PENDING` หรือถูก `SUSPENDED` จะตอบ `409 Conflict`
- **ลบคอร์สดราฟต์ (UC14 - Delete Course Draft)**: สามารถลบได้เฉพาะคอร์สที่อยู่ในสถานะ `DRAFT` ไม่เคยเผยแพร่ (ตรวจจาก `audit_logs`) และต้องไม่มีรีวิวในระบบเท่านั้น หากคอร์สเคยเผยแพร่แล้วหรือมีรีวิวค้างอยู่ ระบบจะปฏิเสธคำขอลบด้วยสถานะ `409 Conflict`
- ทุกการสร้าง แก้ไข ส่งตรวจ และลบคอร์ส จะถูกบันทึกประวัติการกระทำลงในตาราง `audit_logs` เสมอ

| คำขอ | ผลสำเร็จ | เงื่อนไข / สิทธิ์ |
| --- | --- | --- |
| `POST /api/v1/providers/{providerId}/courses` | `201` พร้อม `Location: /api/v1/courses/{id}` | เฉพาะ `OWNER` หรือ `EDITOR` ของ Provider นั้น (สร้างคอร์สดราฟต์ใหม่) |
| `GET /api/v1/providers/{providerId}/courses` | `200` รายการคอร์สทั้งหมดของ Provider | เฉพาะ `OWNER` หรือ `EDITOR` ของ Provider นั้น |
| `GET /api/v1/courses/{id}` | `200` รายละเอียดคอร์ส | ทุกคนดูได้เมื่อคอร์ส `PUBLISHED` และ Provider `ACTIVE`; กรณีอื่นดูได้เฉพาะ `OWNER`/`EDITOR` หรือ Admin (คนอื่นได้ `404`) |
| `PUT /api/v1/courses/{id}` | `200` ข้อมูลคอร์สที่แก้ไขแล้ว | เฉพาะ `OWNER` หรือ `EDITOR` ของ Provider เจ้าของคอร์ส |
| `POST /api/v1/courses/{id}/submissions` | `200` ข้อมูลคอร์ส (สถานะเปลี่ยนเป็น `PENDING`) | เฉพาะคอร์สสถานะ `DRAFT` หรือ `REVISION_REQUESTED` และ Provider ต้อง `ACTIVE` (กรณีอื่นตอบ `409`) |
| `DELETE /api/v1/courses/{id}` | `204` ไม่มี body | เฉพาะคอร์สสถานะ `DRAFT` ที่ไม่เคยเผยแพร่และไม่มีรีวิว (กรณีอื่นตอบ `409`) |

### ส่วนต่อประสาน Course Management บนเว็บ
- เข้าใช้งานได้ผ่านหน้า `/providers` โดยคลิกปุ่ม **"จัดการคอร์สเรียน"** บนการ์ดของสถาบันที่ผู้ใช้เป็น Owner หรือ Editor
- แสดงรายการคอร์สของสถาบันพร้อม Badge สถานะ (`Draft`, `Pending`, `Published`, `Revision Requested`) รายละเอียดระดับความยาก ภาษา ระยะเวลาเรียน และรูปแบบราคา
- มี Modal สำหรับสร้างคอร์สดราฟต์ใหม่ (UC12) พร้อม dropdown แพลตฟอร์มและปุ่มเลือกหมวดหมู่
- มี Modal สำหรับแก้ไขคอร์สเรียน (UC12)
- มีปุ่ม **"ส่งตรวจ"** (UC13) สำหรับคอร์สดราฟต์เพื่อเปลี่ยนสถานะเป็น Pending โดยปุ่มจะถูกปิดพร้อมข้อความอธิบายเมื่อ Provider ยังไม่ `ACTIVE`
- มีปุ่ม **"ลบ"** (UC14) สำหรับคอร์สดราฟต์ พร้อมระบบยืนยัน และแจ้งเตือนข้อผิดพลาดหากติดเงื่อนไข


Frontend ใช้ Vite proxy เรียก `/api` ไปยัง backend ในเครื่อง:

```powershell
cd code/frontend
npm install
npm run dev
```

รันการตรวจสอบ frontend ด้วย `npm run typecheck`, `npm test` และ `npm run build` ส่วน backend ใช้ `code/backend/mvnw.cmd test` โดย integration test ของ PostgreSQL ต้องมี Docker ทำงาน

## งานตรวจของ Admin (Task 15)

บัญชี `ADMIN` เข้า `/admin` เพื่อดูคอร์สรอตรวจ อนุมัติ ขอให้แก้ไข ระงับ คืนสถานะ หรือเก็บถาวรคอร์ส และรับรอง/ระงับ Provider ได้ การขอแก้ไข ระงับ หรือเก็บถาวรต้องระบุเหตุผล เหตุผลล่าสุดจะแสดงในรายการคอร์สของ Provider ส่วนประวัติผู้ตรวจและเหตุผลเก็บใน `audit_logs` หากมีคนเปลี่ยนข้อมูลระหว่างที่เปิดหน้าไว้ ระบบตอบ `409` เพื่อให้โหลดข้อมูลใหม่

รายละเอียดคำขอและสถานะที่อนุญาตอยู่ใน `doc/api-contract.md` หัวข้อ Admin moderation

คำอธิบายการทำงานทีละไฟล์อยู่ใน `doc/task15-course-moderation-guide.md`

## งานตรวจรีวิว (Task 16)

ผู้เรียนที่เข้าสู่ระบบสร้างหรือแก้รีวิวของคอร์สที่เผยแพร่ได้ รีวิวใหม่และรีวิวที่แก้ไขจะกลับไปรอตรวจเสมอ รายการรีวิวสาธารณะและคะแนนเฉลี่ยนับเฉพาะรีวิวที่อนุมัติแล้ว

Admin เข้า `/admin` ส่วน **รีวิว** เพื่อดูคิวรอตรวจ เลือกอนุมัติหรือปฏิเสธ การปฏิเสธต้องระบุเหตุผล ผู้เขียนรีวิวดูเหตุผลได้ผ่าน `GET /api/v1/courses/{courseId}/reviews/me` ผลตรวจบันทึกใน `audit_logs` และหากข้อมูลถูกแก้ระหว่างตรวจ API จะตอบ `409` ให้โหลดคิวใหม่

คำอธิบาย API และการทดสอบอยู่ใน `doc/task16-review-moderation-guide.md`

## AuditLog และ Observer metrics (Task 17)

การเปลี่ยนสถานะกับ AuditLog บันทึกใน transaction เดียวกัน หากเขียน audit ไม่สำเร็จ ธุรกิจจะ rollback ส่วน Observer นับ counter `course.status.transitions` หลัง commit สำเร็จเท่านั้น แยกตาม `action`, `from`, `to` ถ้า metrics ล้มเหลวจะบันทึก error log และคำขอที่ commit แล้วตอบสำเร็จตามเดิม

สถิติเก็บภายใน process และ reset เมื่อ restart แอป ดูการทำงาน แผนภาพ และวิธีทดสอบได้ใน [คู่มือ Task 17](doc/task17-audit-observer-guide.md) และ [รายงานผลทดสอบ](doc/test-reports/task17-audit-observer.md)

## Matcher Strategy backend (Task 19)

`POST /api/v1/course-matches` รับ `categorySlug`, `level`, `language`, `budgetThb` และ `hoursPerWeek` ทุกคนเรียกได้หลังขอ CSRF token ระบบกรองคอร์สที่เผยแพร่จาก Provider active ตามหมวดหมู่/ระดับ/ภาษา/งบ แล้วใช้ Budget, Effort และ Review Quality Strategy จัดอันดับสูงสุด 3 คอร์สพร้อมคะแนนและเหตุผล

รองรับคอร์สฟรีและราคาจ่ายครั้งเดียวที่ทราบเป็น THB; ประเมินเวลารวมโดยตั้งเป้าจบใน 4 สัปดาห์ หากไม่มีคอร์สผ่านจะคืนรายการว่างพร้อมข้อจำกัดโดยไม่ผ่อนเงื่อนไข หน้าจอ quiz/results อยู่ใน Task 20 ดู payload, สูตร, ตัวอย่าง PowerShell และ diagrams ใน [คู่มือ Task 19](doc/task19-matcher-guide.md), [รายงานทดสอบ](doc/test-reports/task19-matcher.md) และ [หลักฐาน Design Patterns](doc/design-patterns.md)
