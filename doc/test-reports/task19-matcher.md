# Task 19 — Matcher Strategy backend: test report

- วันที่รัน: 6 ตุลาคม 2026 (Asia/Bangkok)
- Branch: `supawat_6733800622_01`
- ฐานงาน: `f374784` (รวม Task 17; PR #21 ยังเปิดอยู่ตอนเริ่ม Task 19)
- Revision โค้ด/เทสต์ที่ตรวจ: `4f56871`; commit ถัดไปแก้เอกสารเท่านั้น
- เครื่อง: Windows, Temurin Java 25.0.3, Maven 3.9.16; compilation target Java 21 ตาม `pom.xml`
- ฐานข้อมูล: H2 สำหรับ controller/regression tests และ PostgreSQL 16 Alpine ผ่าน Docker/Testcontainers 1.21.4; Flyway V1–V3 และ `ddl-auto=validate` สำหรับ PostgreSQL

## ผลจริง

| ชุดตรวจ | ผล | สิ่งที่ยืนยัน |
| --- | --- | --- |
| `ScoringStrategyContractTests` | 7/7 | Strategy ทุกตัวรับ contract เดียวกัน, คะแนน deterministic/finite 0–100, สูตรขอบเขต, งบ 0, effort ไม่ทราบ และไม่มีรีวิว |
| `CourseMatcherServiceTests` | 13/13 | กรองก่อน scoring, จัดอันดับทุกคอร์สก่อน top 3, tie-break, ไม่ใช้คะแนนปัดในการเรียง, constraint counts ทับซ้อน และฉีด strategy เพิ่มโดยไม่แก้อัลกอริทึม |
| `CourseMatcherControllerTests` | 26/26 | anonymous access, CSRF cookie/header จริง, token ผิด/หาย, required fields, จำนวนเต็ม/ทศนิยม/ขอบเขต, shared errors/no-store, response catalog และ OpenAPI |
| `CourseMatcherPostgresIntegrationTests` | 16/16 | สถานะ Course 6 แบบ/Provider 3 แบบ, งบ 0/พอดีงบ/เกินงบ, ราคาไม่ทราบ/ต่างสกุล/subscription, ไม่มี price row, หลายหมวดหมู่, รีวิวที่ไม่เผยแพร่, URL ที่ไม่ปลอดภัย และ query แบบกลุ่ม |
| Task 19 รวม | **62/62 ผ่าน** | 0 failures, 0 errors, 0 skipped |
| Backend `verify` ทั้งหมด | **298/298 ผ่าน** | รวม regression เดิม 236 กรณี และ Task 19 อีก 62; สร้าง Spring Boot executable JAR สำเร็จ |
| `git diff --check` | ผ่าน | ไม่มี whitespace errors ใน changes ของ Task 19 |

## คำสั่งที่รัน

รันใน `code/backend` โดย Docker engine ทำงาน:

```powershell
mvn -o -B --no-transfer-progress '-Dtest=ScoringStrategyContractTests' test
mvn -o -B --no-transfer-progress '-Dtest=CourseMatcherServiceTests,ScoringStrategyContractTests,CatalogCourseIntegrationTests' test
mvn -o -B --no-transfer-progress '-Dtest=CourseMatcherControllerTests,ApiErrorContractIntegrationTests' test
mvn -o -B --no-transfer-progress '-Dtest=CourseMatcherPostgresIntegrationTests' test
mvn -o -B --no-transfer-progress verify
```

ชุดแรกผ่าน 7 กรณี; ชุด service/catalog ผ่าน 25; ชุด API/shared errors ผ่าน 29; PostgreSQL matcher ผ่าน 16; `verify` ผ่าน 298 และ BUILD SUCCESS ใช้เวลา 1 นาที 7 วินาที โหมด `-o` ใช้ dependency cache ของเครื่อง; เครื่องใหม่ให้เอา `-o` ออก

Logs ของ API/PostgreSQL/full verify อยู่ใน ignored `code/backend/target/task19-api-tests.log`, `task19-postgres-tests.log`, `task19-full-verify.log`; JUnit reports อยู่ใน `target/surefire-reports/`

## หลักฐานที่สำคัญ

- `topThreeIncludesTheBestCourseAfterMoreThanOneCatalogPageAndHasNoDuplicates`: มี 53 คอร์ส ผู้ชนะอยู่ท้ายข้อมูลและมีสองหมวดหมู่ ยังได้อันดับแรกเพียงครั้งเดียว; อีกสองอันดับเรียง ID เมื่อคะแนนเท่ากัน
- `filtersAllHardConstraintsBeforeCallingAnyScoringStrategy`: คอร์สที่ผิดงบ/หมวดหมู่/ภาษา/ระดับไม่ถูกส่งเข้า strategy และไม่ query ratings
- `emptyResultsExplainEveryIndependentConstraintWithoutCountingUnpublishedCourses`: คืนรายการว่างพร้อมจำนวนแต่ละข้อจำกัด และไม่นับคอร์ส draft
- `onlyPublishedReviewsAffectTheScoreAndUnknownEffortIsNeutral`: เฉลี่ยจากรีวิว PUBLISHED 3 และ 5 ได้ 4/5; PENDING และ REJECTED ไม่ถูกนับ; effort ไม่ทราบได้ 50 และคะแนนรวม 76.67
- `matchingLoadsDetailsInOneQueryAndAggregatesRatingsOnceWithoutWrites`: หลัง clear persistence context ใช้ Hibernate statements 2 ครั้ง (category existence และ fetch candidates) กับ JDBC rating aggregation 1 ครั้งสำหรับ 20 คอร์ส; ไม่มี entity insert/update/delete ระหว่าง match
- `anonymousClientCanUseTheActualCsrfCookieAndHeaderFlow`: ขอ token/cookie จาก auth endpoint แล้วส่งกลับใน POST โดยไม่ล็อกอิน
- `newStrategyCanBeInjectedWithoutChangingTheMatcherAlgorithm`: เพิ่ม strategy ตัวที่สี่ผ่าน constructor แล้วคะแนนเฉลี่ยปรับตาม collection

รอบแรกของ controller tests พบ test helper `csrf()` เปลี่ยน repository ของ filter ที่แชร์กัน จึงปรับ fixture ให้คืน cookie-backed production repository ก่อนแต่ละกรณีและรันซ้ำผ่าน; PostgreSQL fixture ใช้สถานะรีวิวจริง `PENDING`/`REJECTED` ตาม schema หลังแก้ fixture แล้ว full verify ผ่านทั้งหมด

## ขอบเขตของผลตรวจ

ตรวจ backend/API ผ่าน MockMvc และสร้าง JAR แล้ว ยังไม่มี frontend quiz/results, browser E2E, load test ของ catalog ขนาดใหญ่ หรือหลักฐาน CI/deployment สำหรับ commits ที่ยังไม่ push ไม่มี schema migration ใหม่ ไม่บันทึก quiz/results ใช้น้ำหนักเท่ากัน สมมติฐานเวลา 4 สัปดาห์ และงบ THB สำหรับ FREE/ONE_TIME เท่านั้น

[คู่มือ API และสูตร](../task19-matcher-guide.md), [Class Diagram](../diagrams/matcher-strategy-class.mmd), [Sequence Diagram](../diagrams/matcher-strategy-sequence.mmd), [Design Patterns](../design-patterns.md)
