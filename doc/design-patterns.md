# Design Patterns — หลักฐาน implementation

เอกสารนี้อ้าง implementation ใน branch `supawat_6733800622_01` หลัง Task 19 วันที่ 6 ตุลาคม 2026; การมีหลักฐานใน branch ไม่หมายความว่า merge เข้า `develop` แล้ว

## GoF: Behavioral 3 รูปแบบ

| Pattern | ปัญหาที่แก้ | ไฟล์/คลาสที่ใช้จริง | Class Diagram และหลักฐาน |
| --- | --- | --- | --- |
| Strategy | แยกสูตรราคา เวลา และคุณภาพออกจากการกรองและจัดอันดับ เพื่อเพิ่มสูตรได้โดยไม่แก้อัลกอริทึม matcher | `matcher/scoring/ScoringStrategy`, `BudgetFitStrategy`, `EffortFitStrategy`, `ReviewQualityStrategy`; `matcher/CourseMatcherService` รับ collection ผ่าน constructor | [Class](diagrams/matcher-strategy-class.mmd), [Sequence](diagrams/matcher-strategy-sequence.mmd), `ScoringStrategyContractTests`, `CourseMatcherServiceTests`, [Task 19](test-reports/task19-matcher.md) |
| State | แต่ละสถานะคอร์สอนุญาตคำสั่งส่งตรวจ/แก้ไข/ตรวจ/ลบต่างกัน | `course/workflow/CourseWorkflowState`, `CourseWorkflow` และ private nested states 6 ตัว; `CourseServiceImpl`, `CourseModerationServiceImpl` เรียกพฤติกรรม state หลังตรวจสิทธิ์ | [Class](diagrams/course-state-class.mmd), [State](diagrams/course-state.mmd), `CourseWorkflowTests`, [Task 15](test-reports/task15-course-moderation.md) |
| Observer | ติดตามการเปลี่ยนสถานะหลัง commit โดยไม่ผูก workflow กับ metrics | `course/event/CourseStatusChangedEvent`, `CourseEventPublisher`, `CourseMetricsListener`; Spring AFTER_COMMIT และ Micrometer | [Class](diagrams/course-observer-class.mmd), [Sequence](diagrams/course-observer-sequence.mmd), `CourseMetricsTransactionIntegrationTests`, `CourseMetricsListenerTests`, [Task 17](test-reports/task17-audit-observer.md) |

Strategy ทุกตัวใช้ input/output contract เดียวกัน มีคะแนน 0–100 พร้อมเหตุผล; eligibility ไม่ใช่ scoring strategy และไม่ผ่อน hard filters งานทดสอบเพิ่ม strategy ตัวที่สี่โดยไม่แก้ matcher เป็นหลักฐาน OCP และ contract tests เป็นหลักฐานการแทน implementation กันได้

State มี registry เพื่อเลือก object ตาม enum ที่ persist แต่คำสั่งอยู่ใน state implementations; ส่วน ownership และ optimistic locking ยังเป็นหน้าที่ service/entity

Observer metrics เป็น best-effort และไม่ใช่ผู้รับประกันข้อมูล AuditLog: audit ถูกเขียนใน transaction เดียวกับข้อมูลธุรกิจ และ rollback ไม่สร้าง metrics สำเร็จ

## Architectural Patterns ที่มีในโค้ด

| Pattern | ปัญหาที่แก้ | ตัวอย่าง implementation | หลักฐาน |
| --- | --- | --- | --- |
| Layered / Service Layer | แยก HTTP ออกจากกฎธุรกิจและการเข้าถึงข้อมูล | Matcher Controller → Matcher Service → repositories; Provider/Course services | [Matcher Class Diagram](diagrams/matcher-strategy-class.mmd), [ADR 0001](decisions/0001-adoption-of-spring-boot-layered-architecture.md) |
| MVC / REST Controller | รับคำขอและส่ง JSON DTO ให้ SPA | `CourseMatcherController`, `CatalogController` | `CourseMatcherControllerTests`; frontend เป็น client แยก ไม่ใช้ server-side view |
| Repository | รวมการอ่าน/เขียนข้อมูลผ่าน interface หรือ query repository | `CourseRepository`, `CategoryRepository`, `CatalogRatingRepository` | PostgreSQL matcher integration tests ยืนยัน fetch/grouped queries |
| DTO + Mapper | ไม่ส่ง entity และข้อมูลภายในออก API | `CourseMatchRequest`, `CourseMatchesResponse`; `CatalogCourseService.toResponse` และ `CourseMapper` | Matcher controller tests ตรวจ schema และไม่ส่ง URL ดิบ |
| Dependency Injection | เปลี่ยน implementation และทดสอบ business logic โดยไม่เปิด HTTP | constructor injection ของ `List<ScoringStrategy>` และ repositories | `CourseMatcherServiceTests` ใช้ Mockito โดยไม่ใช้ Spring/DB |

รายละเอียดการตัดสินใจ GoF อยู่ใน [ADR 0003](decisions/0003-gof-behavioral-design-patterns.md) สูตรและข้อจำกัดอยู่ใน [คู่มือ Matcher](task19-matcher-guide.md)
