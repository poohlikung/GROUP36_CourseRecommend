# Task 19 — Matcher Strategy backend

Backend รับคำตอบเพื่อแนะนำคอร์สผ่าน `POST /api/v1/course-matches` คืนสูงสุด 3 อันดับพร้อมคะแนนและเหตุผล เป้าหมายใช้หมวดหมู่จากข้อมูลเดิม; หน้าจอ quiz/results เป็น Task 20 และยังไม่ได้ทำในงานนี้

## 1. Request และสิทธิ์

ทุกคนเรียกได้โดยไม่ต้องล็อกอิน ต้องขอ CSRF token จาก `GET /api/v1/auth/csrf` แล้วส่งทั้ง cookie `XSRF-TOKEN` และ header `X-XSRF-TOKEN` กลับมา การเรียกนี้ไม่บันทึกคำตอบหรือผลแนะนำ และไม่มี migration ใหม่

```json
{
  "categorySlug": "programming",
  "level": "BEGINNER",
  "language": "THAI",
  "budgetThb": 1000.00,
  "hoursPerWeek": 4
}
```

| ฟิลด์ | กติกา |
| --- | --- |
| `categorySlug` | บังคับ, ไม่ว่าง, ไม่เกิน 100 ตัวอักษร; trim ช่องว่างรอบค่าแล้วตรวจว่ามีใน `GET /api/v1/catalog/categories` |
| `level` | บังคับ: `BEGINNER`, `INTERMEDIATE`, `ADVANCED`; ต้องตรงกับระดับคอร์ส |
| `language` | บังคับ: `THAI`, `ENGLISH`, `SUB_THAI`; ต้องตรงกับภาษาคอร์ส |
| `budgetThb` | บังคับ: 0–99999999.99 บาท, ทศนิยมไม่เกิน 2 ตำแหน่ง |
| `hoursPerWeek` | บังคับ: JSON จำนวนเต็ม 1–168; ไม่รับทศนิยมหรือ string เพื่อไม่ตัดเศษโดยอัตโนมัติ |

`200` คือผลจับคู่รวมกรณีไม่พบคอร์ส; `400 VALIDATION_ERROR` คือข้อมูลผิด/JSON อ่านไม่ได้; `400 REQUEST_ERROR` คือหมวดหมู่ไม่มีจริง; `403 CSRF_INVALID` คือ token ไม่มีหรือผิด ใช้ error format เดิม `{timestamp,status,code,message,path,fieldErrors}` และ `Cache-Control: no-store` ทั้งผลสำเร็จและข้อผิดพลาด หากส่ง session ของบัญชีที่ถูกระงับมา ตัวกรองบัญชีเดิมยังตอบ `401 SESSION_INVALIDATED`

## 2. Eligibility ก่อน scoring

Repository โหลดเฉพาะคอร์ส `PUBLISHED` ของ Provider `ACTIVE` พร้อม provider/platform/price/categories ใน fetch query เดียว จากนั้น `EligibilityPolicy` ตรวจแต่ละคอร์ส:

- หมวดหมู่ต้องตรง `categorySlug`; คอร์สมีหลายหมวดหมู่ได้และคืนเพียงหนึ่งรายการ
- ระดับและภาษาต้องตรงค่าที่เลือก ไม่รวมระดับที่ต่ำกว่าหรือภาษาซับไตเติลโดยอัตโนมัติ
- `FREE` ถือว่าราคา 0 บาทตามประเภทคอร์ส แม้ amount/currency ไม่ระบุ
- `ONE_TIME` ต้องมีราคาตั้งแต่ 0, currency เป็น THB (ไม่สนตัวพิมพ์ใหญ่/เล็ก), และราคาไม่เกินงบ ราคาพอดีงบผ่าน; งบ 0 รับราคา 0 ได้
- `SUBSCRIPTION` ไม่ผ่าน เพราะข้อมูลเดิมไม่มีรอบบิลสำหรับคำนวณค่าใช้จ่ายรวม; ไม่มีการแปลงสกุลเงินหรือสมมติว่าราคาไม่ทราบเท่ากับฟรี
- เวลาเรียนเป็นเกณฑ์ให้คะแนน คอร์สที่ใช้เวลามากยังแนะนำได้เมื่อผ่าน hard filters

## 3. Strategy และสูตรคะแนน

`ScoringStrategy` ทุกตัวรับ immutable `ScoringInput` เดียวกัน ซึ่งมีราคาที่ทราบและผ่านงบแล้ว พร้อมงบ/เวลา/สรุปรีวิว และคืน `ScoringResult` ที่บังคับคะแนน finite ในช่วง 0–100 กับ `MatchReason(code,message)`

| Strategy / key | สูตร | กรณีไม่มีข้อมูล |
| --- | --- | --- |
| `BudgetFitStrategy` / `budget` | ราคา 0 → 100; ราคา > 0 → `100 × (1 − priceThb/budgetThb)` | ราคาไม่ทราบถูกกรองก่อน; งบ 0 ไม่มีการหารด้วย 0 |
| `EffortFitStrategy` / `effort` | ให้เวลา `hoursPerWeek × 4`; ถ้า effort ไม่เกินเวลาที่ให้ได้ → 100; มิฉะนั้น `100 × availableHours/effortHours` | effort ไม่ทราบ → 50, `UNKNOWN_EFFORT` |
| `ReviewQualityStrategy` / `reviewQuality` | `averageRating/5 × 100` จากรีวิว `PUBLISHED` เท่านั้น | ไม่มีรีวิวที่เผยแพร่ → 50, `NO_PUBLISHED_REVIEWS` |

เป้าหมายจบใน **4 สัปดาห์เป็นสมมติฐาน** เพราะ `effortHours` ในฐานข้อมูลเป็นเวลารวม ไม่ใช่เวลาต่อสัปดาห์ เหตุผลจาก Effort Strategy ระบุเวลาคอร์สและเวลาที่ให้ได้ คะแนนกลางสำหรับข้อมูลไม่ทราบไม่ได้ยืนยันว่าคอร์สมีคุณภาพหรือเรียนทัน

`CourseMatcherService` รับ `List<ScoringStrategy>` ผ่าน constructor และเรียกทุก strategy กับคอร์สที่ผ่าน eligibility ใช้ค่าเฉลี่ยน้ำหนักเท่ากัน ค่าเริ่มต้นมีสามตัว; เพิ่ม Spring bean ของ strategy ที่มี key ไม่ซ้ำเพื่อขยายสูตรได้โดยไม่แก้อัลกอริทึม matcher (การเพิ่มตัวใหม่จะเปลี่ยนตัวหารของค่าเฉลี่ยด้วย) ไม่มี custom weights ใน request

คิดคะแนนคอร์สที่ผ่าน **ทั้งหมดก่อนเลือก 3 อันดับ** เรียงคะแนนจริงมากไปน้อยและ course ID น้อยไปมากเมื่อคะแนนเท่ากัน ปัดคะแนนรวมและคะแนนย่อยเป็น 2 ตำแหน่งแบบ HALF_UP เฉพาะ response; คะแนนที่แสดงเท่ากันอาจเรียงตามคะแนนจริงที่ต่างกันก่อนปัด

## 4. Response

`CourseMatchesResponse` มี `matches` และ `constraints` เป็น array เสมอ แต่ละ match มี:

| ฟิลด์ | ความหมาย |
| --- | --- |
| `course` | `CatalogCourseResponse` เดิม: id/title/slug/description/level/language/effortHours/provider/platform/price/categories/averageRating/reviewCount/externalUrl |
| `score` | คะแนนเฉลี่ย 0–100 ที่ปัดสองตำแหน่ง |
| `scoreBreakdown` | รายการ `{strategy,score}` เรียงตาม strategy key: budget, effort, reviewQuality |
| `reasons` | รายการ `{code,message}` ในลำดับเดียวกับคะแนนย่อย มีหลักฐานราคา/เวลา/ค่าเฉลี่ยและจำนวนรีวิว หรือระบุข้อมูลที่ไม่ทราบ |

ใช้ mapper ของ catalog เดิม จึงไม่ส่ง JPA entity หรือ URL ดิบ; `externalUrl` เป็น null เมื่อไม่ผ่านกฎ HTTPS/allowed host

ตัวอย่างเฉพาะส่วนคะแนน (ละ `course` เพื่อให้อ่านง่าย): คอร์สราคา 250 บาท งบ 1000 บาท effort ไม่ทราบ และคะแนนเฉลี่ย 4/5 จะได้:

```json
{
  "score": 68.33,
  "scoreBreakdown": [
    {"strategy": "budget", "score": 75.00},
    {"strategy": "effort", "score": 50.00},
    {"strategy": "reviewQuality", "score": 80.00}
  ]
}
```

หากไม่มีคอร์สผ่าน จะคืน `200` และไม่ผ่อนเงื่อนไข เช่น:

```json
{
  "matches": [],
  "constraints": [
    {"code": "BUDGET_EXCEEDED", "message": "ราคาเกินงบที่เลือก ลองเพิ่มงบประมาณ", "excludedCourseCount": 2},
    {"code": "LANGUAGE_MISMATCH", "message": "ภาษาไม่ตรงกับที่เลือก ลองปรับภาษา", "excludedCourseCount": 1}
  ]
}
```

`constraints` เรียงตาม code และแสดงเฉพาะกรณี matches ว่าง นับแต่ละเงื่อนไขอย่างอิสระจากคอร์ส PUBLISHED ของ Provider ACTIVE ทั้งหมด **จำนวนอาจทับซ้อนกัน** และไม่รวมคอร์สที่ยังไม่เผยแพร่ Codes ได้แก่ `CATEGORY_MISMATCH`, `LEVEL_MISMATCH`, `LANGUAGE_MISMATCH`, `UNKNOWN_PRICE`, `UNSUPPORTED_PAYMENT_TYPE`, `UNSUPPORTED_CURRENCY`, `BUDGET_EXCEEDED`; ถ้าไม่มีคอร์สสาธารณะเลยใช้ `NO_AVAILABLE_COURSES` กับ count 0

## 5. ลองเรียกจาก PowerShell

```powershell
$base = 'http://localhost:8080'
$csrf = Invoke-RestMethod "$base/api/v1/auth/csrf" -SessionVariable matcherSession
$request = @{
    categorySlug = 'programming'
    level = 'BEGINNER'
    language = 'THAI'
    budgetThb = 1000
    hoursPerWeek = 4
} | ConvertTo-Json
Invoke-RestMethod "$base/api/v1/course-matches" -Method Post -WebSession $matcherSession `
    -ContentType 'application/json' -Headers @{ 'X-XSRF-TOKEN' = $csrf.token } -Body $request
```

Swagger UI ที่ `/swagger-ui.html` มี request schema/example, response schema, CSRF header และ error codes ให้ทดลองผ่าน `/v3/api-docs` ได้

## 6. หลักฐานและข้อจำกัด

- [Class Diagram](diagrams/matcher-strategy-class.mmd) และ [Sequence Diagram](diagrams/matcher-strategy-sequence.mmd)
- `ScoringStrategyContractTests`: input contract/คะแนนขอบเขต/สูตรและข้อมูลไม่ทราบ
- `CourseMatcherServiceTests`: hard filters ก่อน scoring, counts ทับซ้อน, จัดอันดับก่อนปัด/top 3 และเพิ่ม strategy โดยไม่เปลี่ยน matcher
- `CourseMatcherControllerTests`: anonymous, validation, CSRF cookie/header จริง, no-store, shared errors และ OpenAPI
- `CourseMatcherPostgresIntegrationTests`: Flyway, สถานะทุกแบบ, กติกางบ, PENDING/REJECTED reviews, คอร์สหลายหมวดหมู่ และ top 3 จาก 53 คอร์ส
- [รายงานทดสอบ](test-reports/task19-matcher.md)

การอ่านใช้ read-only transaction และไม่มี query แยกต่อคอร์ส: category existence หนึ่งครั้ง, fetch candidates หนึ่งครั้ง, grouped rating query หนึ่งครั้งเฉพาะคอร์สที่ผ่าน ไม่ query ซ้ำเพื่อ map top 3 อย่างไรก็ตาม v1 โหลดคอร์สสาธารณะทั้งหมดเข้าหน่วยความจำเพื่อจัดอันดับและอธิบายข้อจำกัด เหมาะกับขนาดข้อมูลโครงงาน; ยังไม่มี load test สำหรับ catalog ขนาดใหญ่ และ read-only transaction ไม่รับประกัน snapshot คงที่ข้ามคำสั่งอ่านภายใต้ PostgreSQL READ COMMITTED

งานนี้ทำ 5 commits ในเครื่องบน `supawat_6733800622_01` ตามคำสั่งให้เริ่มทันที ยังไม่ push หรือสร้าง PR หาก PR #21 Task 17 ยังเปิดอยู่ การ push branch เดิมจะเพิ่มงานนี้เข้า PR #21 ด้วย จึงควรจัดการ #21 ก่อนสร้าง PR Task 19 แยกเข้า `develop`
