# API Contract — Provider และ Course

เอกสารนี้สรุปสัญญาของ REST API ส่วน Provider (UC09, UC10) และ Course (UC12–UC14) ตามโค้ดใน `provider/` และ `course/` ของ backend รายละเอียดทุก endpoint (schema, ตัวอย่าง, การทดลองเรียก) ดูได้จาก Swagger UI ที่ `/swagger-ui.html` และ OpenAPI JSON ที่ `/v3/api-docs`

## 1. หลักการร่วม

- Base path: `/api/v1` ใช้ชื่อแบบ resource-based เช่น `/providers/{providerId}/courses`
- Layer: `Controller` รับ request และตรวจ `@Valid` → `Service` ตรวจสิทธิ์ กฎธุรกิจ และ `@Transactional` → `Repository` (Spring Data JPA) ไม่มี Controller เรียก Repository ตรง
- Controller ขึ้นกับ interface ของ service ไม่ใช่คลาสจริง: `ProviderController` → `ProviderService` (impl: `ProviderServiceImpl`), `CourseController` → `CourseQueryService` สำหรับการอ่าน และ `CourseCommandService` สำหรับการเปลี่ยนข้อมูล (impl: `CourseServiceImpl`)
- API รับและส่ง **DTO** (`*Request`, `*Response`) ไม่ serialize Entity โดยตรง การแปลง Entity → DTO อยู่ใน `ProviderMapper` และ `CourseMapper`
- กฎตรวจลิงก์คอร์สตามโดเมนของ Platform แยกอยู่ใน `CourseUrlPolicy`
- ยืนยันตัวตนด้วย session cookie (`JSESSIONID`) ของ Spring Security
- คำขอที่เปลี่ยนข้อมูล (`POST`, `PUT`, `DELETE`) ต้องส่ง CSRF token ที่ได้จาก `GET /api/v1/auth/csrf` ใน header ตามค่า `headerName` ที่ตอบกลับ (`X-XSRF-TOKEN`)
- ทุกการสร้าง แก้ไข ส่งตรวจ และลบ บันทึกลงตาราง `audit_logs` ใน transaction เดียวกับงานหลัก

## 2. รูปแบบ Error

ทุก error ใช้รูปแบบเดียวกัน (`common/ApiErrorResponse`) ทั้งจาก `GlobalExceptionHandler` และ security handler

```json
{
  "timestamp": "2026-10-05T05:25:03Z",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "ข้อมูลไม่ถูกต้อง",
  "path": "/api/v1/providers/1/courses",
  "fieldErrors": [
    { "field": "slug", "message": "Slug ต้องประกอบด้วยตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น" }
  ]
}
```

| Status | `code` | ใช้เมื่อ |
| :---: | --- | --- |
| 400 | `VALIDATION_ERROR` | ข้อมูลไม่ผ่าน Bean Validation หรือ JSON อ่านไม่ได้ (`fieldErrors` บอกฟิลด์ที่ผิด) |
| 400 | `REQUEST_ERROR` | กฎธุรกิจที่ข้อมูลผิด เช่น Platform/Category ไม่มีอยู่ หรือ URL ไม่ตรงโดเมนของ Platform |
| 401 | `UNAUTHORIZED` | ยังไม่ได้เข้าสู่ระบบ หรือ session หมดอายุ |
| 403 | `FORBIDDEN` | เข้าสู่ระบบแล้วแต่ไม่มีสิทธิ์ เช่น ไม่ใช่ Owner/Editor ของ Provider นั้น |
| 403 | `CSRF_INVALID` | ไม่ส่งหรือส่ง CSRF token ผิด |
| 404 | `NOT_FOUND` | ไม่พบข้อมูล หรือข้อมูลนั้นไม่เปิดให้ผู้เรียกเห็น (เช่น คอร์ส DRAFT หรือ Provider ที่ไม่ ACTIVE) |
| 409 | `CONFLICT` | Slug ซ้ำ, สถานะไม่อนุญาตคำสั่งนั้น, หรือมีข้อมูลอ้างอิงที่ต้องรักษาไว้ |
| 500 | — | ข้อผิดพลาดที่ไม่คาดคิด ไม่ส่ง stack trace |

## 3. Provider

### 3.1 Endpoints

| Method และ path | สิทธิ์ | สำเร็จ | Error ที่เป็นไปได้ |
| --- | --- | --- | --- |
| `POST /api/v1/providers` | ผู้ใช้ที่เข้าสู่ระบบ | `201` + `Location: /api/v1/providers/{id}` + `ProviderResponse` | 400, 401, 409 slug ซ้ำ |
| `GET /api/v1/providers/me` | ผู้ใช้ที่เข้าสู่ระบบ | `200` + `MyProviderResponse[]` | 401 |
| `GET /api/v1/providers/{id}` | ทุกคนเมื่อ Provider `ACTIVE`; สถานะอื่นเฉพาะ Owner/Editor หรือ Admin | `200` + `ProviderResponse` | 404 |
| `GET /api/v1/providers/slug/{slug}` | เหมือน `GET /{id}` | `200` + `ProviderResponse` | 404 |
| `PUT /api/v1/providers/{id}` | Owner หรือ Editor ของ Provider | `200` + `ProviderResponse` | 400, 401, 403, 404, 409 slug ซ้ำ |
| `DELETE /api/v1/providers/{id}` | Owner ของ Provider | `204` ไม่มี body | 401, 403, 404, 409 ยังมีคอร์สอยู่ |

Provider ใหม่มีสถานะ `PENDING` และผู้สร้างเป็น `OWNER` อัตโนมัติ

### 3.2 Request

`CreateProviderRequest` / `UpdateProviderRequest`

| ฟิลด์ | ชนิด | Create | Update | กติกา |
| --- | --- | :---: | :---: | --- |
| `name` | string | บังคับ | บังคับ | ไม่ว่าง, ≤ 100 ตัวอักษร |
| `slug` | string | บังคับ | ไม่บังคับ (ไม่ส่ง = ใช้ค่าเดิม) | 2–100 ตัวอักษร, `^[a-z0-9]+(?:-[a-z0-9]+)*$`, ไม่ซ้ำ |
| `description` | string | ไม่บังคับ | ไม่บังคับ | ≤ 2000 ตัวอักษร, ส่ง `""` ตอน update = ล้างเป็น `null` |
| `websiteUrl` | string | ไม่บังคับ | ไม่บังคับ | ≤ 255, ต้องขึ้นต้น `http://` หรือ `https://`, ส่ง `""` ตอน update = ล้างเป็น `null` |

### 3.3 Response

`ProviderResponse`: `id`, `name`, `slug`, `description`, `websiteUrl`, `status` (`PENDING` / `ACTIVE` / `SUSPENDED`), `createdAt`, `updatedAt`

`MyProviderResponse`: ฟิลด์เหมือนข้างบน (ไม่มี `updatedAt`) และเพิ่ม `role` (`OWNER` / `EDITOR`) ของผู้ใช้ใน Provider นั้น

## 4. Course

### 4.1 Endpoints

| Method และ path | สิทธิ์ | สำเร็จ | Error ที่เป็นไปได้ |
| --- | --- | --- | --- |
| `POST /api/v1/providers/{providerId}/courses` | Owner หรือ Editor ของ Provider | `201` + `Location: /api/v1/courses/{id}` + `CourseDetailResponse` (สถานะ `DRAFT`) | 400, 401, 403, 404, 409 slug ซ้ำ |
| `GET /api/v1/providers/{providerId}/courses` | Owner หรือ Editor ของ Provider | `200` + `CourseDetailResponse[]` (ทุกสถานะ) | 401, 403, 404 |
| `GET /api/v1/courses/{id}` | ทุกคนเมื่อคอร์ส `PUBLISHED` และ Provider `ACTIVE`; กรณีอื่นเฉพาะ Owner/Editor หรือ Admin | `200` + `CourseDetailResponse` | 404 |
| `PUT /api/v1/courses/{id}` | Owner หรือ Editor ของ Provider เจ้าของคอร์ส | `200` + `CourseDetailResponse` | 400, 401, 403, 404, 409 |
| `POST /api/v1/courses/{id}/submissions` | Owner หรือ Editor | `200` + `CourseDetailResponse` (สถานะ `PENDING`) | 401, 403, 404, 409 |
| `DELETE /api/v1/courses/{id}` | Owner หรือ Editor | `204` ไม่มี body | 401, 403, 404, 409 |

รายการคอร์สสาธารณะแบบแบ่งหน้าและเรียงลำดับอยู่ที่ `GET /api/v1/courses?page=&size=&sort=` (Catalog, Task 12)

### 4.2 กฎสถานะ (state rules)

| คำสั่ง | สถานะที่อนุญาต | ผลลัพธ์ | กรณีที่ได้ 409 |
| --- | --- | --- | --- |
| แก้ไข (`PUT`) | `DRAFT`, `REVISION_REQUESTED`, `PENDING`, `PUBLISHED` | `PUBLISHED`/`PENDING` กลับเป็น `DRAFT` เพื่อให้ส่งตรวจใหม่ | `SUSPENDED`, `ARCHIVED` |
| ส่งตรวจ (`POST /submissions`) | `DRAFT`, `REVISION_REQUESTED` และ Provider ต้อง `ACTIVE` | `PENDING` | สถานะอื่น หรือ Provider ยัง `PENDING`/`SUSPENDED` |
| ลบ (`DELETE`) | `DRAFT` ที่ไม่เคยเผยแพร่ (ตรวจจาก `audit_logs`) และไม่มีรีวิว | ลบคอร์ส ราคา และลิงก์หมวดหมู่ใน transaction เดียว | ไม่ใช่ `DRAFT`, เคย `PUBLISHED`, หรือมีรีวิว (ให้ใช้ archive แทน) |

### 4.3 Request

`CreateCourseRequest` / `UpdateCourseRequest` ใช้ฟิลด์ชุดเดียวกัน

| ฟิลด์ | ชนิด | บังคับ | กติกา |
| --- | --- | :---: | --- |
| `title` | string | ✓ | ไม่ว่าง, ≤ 200 ตัวอักษร |
| `slug` | string | ✓ | 3–100 ตัวอักษร, `^[a-z0-9]+(?:-[a-z0-9]+)*$`, ไม่ซ้ำทั้งระบบ |
| `url` | string | ✓ | ≤ 255, `http(s)://`, host ต้องเป็น `allowed_host` ของ Platform หรือ subdomain |
| `platformId` | number | ✓ | ต้องมีอยู่ ไม่งั้นได้ 400 |
| `description` | string | | ส่ง `""` = `null` |
| `level` | `BEGINNER` / `INTERMEDIATE` / `ADVANCED` | | create ไม่ส่ง = `BEGINNER`; update ไม่ส่ง = ค่าเดิม |
| `language` | `THAI` / `ENGLISH` / `SUB_THAI` | | create ไม่ส่ง = `THAI`; update ไม่ส่ง = ค่าเดิม |
| `effortHours` | number | | ≥ 1 ถ้าส่ง |
| `paymentType` | `FREE` / `ONE_TIME` / `SUBSCRIPTION` | | create ไม่ส่ง = `FREE`; update ไม่ส่ง = คงราคาเดิมทั้งหมด |
| `amount` | number | | ≥ 0; `FREE` บันทึกเป็น `0`; คอร์สเสียเงินที่ไม่ส่ง = `null` (ไม่ทราบราคา ไม่ใช่ฟรี) |
| `currency` | string | | ≤ 10 ตัวอักษร, ค่าเริ่มต้น `THB` |
| `categoryIds` | number[] | | ทุก ID ต้องมีอยู่ ไม่งั้นได้ 400 และหมวดหมู่เดิมไม่ถูกเปลี่ยน; update ไม่ส่ง = ค่าเดิม |

### 4.4 Response

`CourseDetailResponse`: `id`, `providerId`, `providerName`, `providerSlug`, `platformId`, `platformName`, `platformSlug`, `title`, `slug`, `description`, `url`, `level`, `language`, `effortHours`, `status`, `paymentType`, `amount` (อาจเป็น `null`), `currency`, `categories` (`[{id, name, slug}]`), `createdAt`, `updatedAt`

## 5. เทสต์ที่ยืนยันสัญญานี้

| ไฟล์ | สิ่งที่ตรวจ |
| --- | --- |
| `test/backend/unit/.../provider/ProviderControllerTests.java` | status code, Location header, validation, สิทธิ์ และการมองเห็นของ Provider ผ่าน HTTP |
| `test/backend/unit/.../provider/ProviderServiceTests.java` | กฎธุรกิจของ Provider และ audit log |
| `test/backend/unit/.../course/CourseControllerTests.java` | status code, validation, สิทธิ์ และกฎสถานะของ Course ผ่าน HTTP |
| `test/backend/unit/.../course/CourseServiceTests.java` | กฎธุรกิจของ Course, ราคา, หมวดหมู่ และ audit log |
| `test/backend/unit/.../course/CourseServiceImplMockitoTests.java` | กฎส่งตรวจ/ลบของ Course แบบ unit test ด้วย Mockito (ไม่ใช้ Spring และ DB) |
| `test/backend/unit/.../course/CourseUrlPolicyTests.java`, `CourseMapperTests.java` | กฎ URL ตามโดเมน Platform และการแปลง Entity → DTO |
| `test/backend/integration/.../ApiErrorContractIntegrationTests.java` | รูปแบบ error กลาง |
| `test/backend/integration/.../CourseSchemaPostgresIntegrationTests.java` | constraint ของตาราง Provider/Course บน PostgreSQL จริง |
