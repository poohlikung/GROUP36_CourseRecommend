# Task 17 — AuditLog transaction และ Observer metrics

## พฤติกรรมที่รับประกัน

เมื่อคอร์สหรือ Provider เปลี่ยนสถานะ service เขียน AuditLog ใน transaction เดียวกับข้อมูลธุรกิจ AuditLog เก็บ actor, action, entity ID, สถานะก่อน–หลัง และเหตุผลตาม workflow เดิม ถ้า INSERT audit ถูกปฏิเสธ สถานะ, version, timestamp และข้อมูลที่แก้ไขจะ rollback พร้อมกัน หากผู้เรียกภายนอกล้มเหลวหลัง service ทำงานและ flush แล้ว transaction ชั้นนอกก็ rollback ทั้งธุรกิจและ audit

Observer นับการเปลี่ยนสถานะคอร์สที่ commit สำเร็จ โดยแยกหน้าที่จากการเก็บประวัติถาวร การเปลี่ยน Provider และสมาชิกทีมยังเขียน audit ตาม service เดิม

## เส้นทางการทำงาน

1. Service ตรวจสิทธิ์, version, transition และข้อมูลคำขอตามกฎเดิม
2. เปลี่ยนสถานะและบันทึก AuditLog ใน transaction ของ service
3. ส่ง `CourseStatusChangedEvent` ผ่าน `CourseEventPublisher` ก่อน transaction จบ
4. Spring ลงทะเบียน callback ให้ `CourseMetricsListener` ทำงานเมื่อ transaction commit สำเร็จ
5. Listener เพิ่ม Micrometer counter; ถ้า metrics ล้มเหลวจะ log โดยไม่โยน `RuntimeException` กลับ

การส่ง event จึงยังไม่ใช่การยืนยันความสำเร็จ ผู้เรียกภายนอกอาจทำให้ transaction rollback หลัง event ถูกส่งแล้วได้ Listener ใช้ `AFTER_COMMIT` และ `fallbackExecution = false` จึงไม่นับกรณี rollback หรือ event ที่ถูกส่งนอก transaction

แผนภาพ: [Class Diagram](diagrams/course-observer-class.mmd) และ [Sequence Diagram](diagrams/course-observer-sequence.mmd)

## ขอบเขต event และ counter

`CourseStatusChangedEvent` เป็น immutable record มี `courseId`, `actorUserId`, `action`, `oldStatus`, `newStatus` ใช้ ID กับ enum แทน JPA entity เพื่อไม่ให้ listener พึ่ง lazy association หรือสถานะของ entity ที่ถูกแก้ภายหลัง `CourseEventPublisher.publish` ใช้ `Propagation.MANDATORY`: ต้องมี transaction อยู่แล้ว และไม่เริ่ม transaction แยก

| คำสั่ง | ตัวอย่าง transition | Event action |
| --- | --- | --- |
| ส่งตรวจ | DRAFT / REVISION_REQUESTED → PENDING | `COURSE_SUBMITTED` |
| แก้คอร์สที่รอตรวจ/เผยแพร่ | PENDING / PUBLISHED → DRAFT | `COURSE_UPDATED` |
| อนุมัติ | PENDING → PUBLISHED | `COURSE_APPROVE` |
| ขอแก้ไข | PENDING → REVISION_REQUESTED | `COURSE_REQUEST_REVISION` |
| ระงับ | PUBLISHED → SUSPENDED | `COURSE_SUSPEND` |
| คืนสถานะ | SUSPENDED → PUBLISHED | `COURSE_RESTORE` |
| เก็บถาวร | PUBLISHED / SUSPENDED → ARCHIVED | `COURSE_ARCHIVE` |

หนึ่ง transition ส่งหนึ่ง event การสร้าง/ลบคอร์สและการแก้ข้อมูลที่สถานะเดิมไม่ส่ง status-change event ส่วนคำขอที่ไม่ผ่านสิทธิ์, validation หรือ stale version จะไม่ส่ง event

Counter ชื่อ `course.status.transitions` ใช้ tags `action`, `from`, `to` เช่น `action=COURSE_APPROVE, from=PENDING, to=PUBLISHED` เป็นจำนวน transition สำเร็จสะสม จึงรวมคอร์สและผู้กระทำหลายคนไว้ใน counter เดียวกัน ไม่ใช้ course ID, actor ID หรือ reason เป็น tags

`MetricsConfig` สร้าง `SimpleMeterRegistry` เมื่อไม่มี `MeterRegistry` อื่น สถิติเก็บในหน่วยความจำของแต่ละ process และ reset เมื่อ restart ไม่มี HTTP metrics endpoint ใน Task นี้ ต้องอ่าน registry ภายในแอปหรือผ่าน tests

## Failure และ concurrency

- Audit insert ล้มเหลว: rollback ธุรกิจและ audit; counter ไม่เพิ่ม
- ผู้เรียกทำให้ outer transaction rollback: event อาจถูกส่งแล้ว แต่ counter ไม่เพิ่ม
- Admin สองคนใช้ version เดียวกัน: `@Version` ป้องกันการเขียนทับ ฝั่งสำเร็จ commit หนึ่ง audit และหนึ่ง counter ฝั่งแพ้ตอบ 409
- Metrics ล้มเหลว: ธุรกิจและ audit commit แล้ว API ยังตอบสำเร็จ Listener log course ID, actor ID, action, สถานะก่อน–หลัง และ stack trace

Log ขึ้นต้นด้วย `Failed to record course transition metric` ใช้ตรวจสอบเมื่อสถิติไม่ครบ Metrics เป็น best-effort ไม่มี retry, durable queue, replay หรือการกู้คืนหลัง process crash AuditLog เป็นหลักฐานถาวร ส่วน counter ไม่ใช่จำนวนคอร์สปัจจุบันและไม่ควรใช้ตัดสินธุรกิจ

## วิธีสาธิตและตรวจสอบ

เปิด Docker Desktop แล้วรันใน `code/backend`:

```powershell
mvn -B --no-transfer-progress '-Dtest=AuditTransactionPostgresIntegrationTests,CourseEventPublicationIntegrationTests,CourseMetricsTransactionIntegrationTests,CourseMetricsListenerTests,MetricsConfigTests' test
```

Tests ใช้ PostgreSQL 16 ชั่วคราวผ่าน Testcontainers และ Flyway V1–V3 ไม่ใช้ฐานข้อมูลของแอปจริง Fixture แต่ละกรณีมี ID ของตนเองและล้างเฉพาะข้อมูลที่สร้างไว้

| สิ่งที่สาธิต | Test |
| --- | --- |
| Commit สถานะและ audit พร้อม counter หนึ่งครั้ง | `successfulCommandCommitsStateVersionAndCompleteAudit` |
| Counter ยังไม่เพิ่มก่อน commit ทั้งหก moderation transitions | `moderationMetricsWaitForPostgresCommit` |
| PostgreSQL ปฏิเสธ audit INSERT แล้วธุรกิจ rollback | `rejectedAuditInsertRollsBackAllBusinessChanges` |
| Flush ธุรกิจและ audit แล้ว outer transaction ล้มเหลว | `outerFailureRollsBackAlreadyFlushedBusinessChangesAndAudit` |
| API ยังตอบ 200 เมื่อสร้าง/increment counter ล้มเหลว พร้อม error log | `metricFailureAfterCommitStillReturnsSuccessfulApiResponse` |
| สอง transaction โหลด version 0 ก่อนแข่งกันอนุมัติ ได้ 200/409 | `concurrentApiDecisionsOnSameVersionCommitExactlyOneAuditAndMetric` |
| Event เดิมไม่เปลี่ยนเมื่อแก้ JPA entity ภายหลัง | `laterChangesToManagedCourseDoNotAlterEarlierEvent` |
| Event นอก transaction ไม่ถูกนับ | `eventOutsideTransactionIsIgnoredEvenWhenPublisherIsBypassed` |

ตรวจ backend ทั้งหมดด้วย `mvn -B --no-transfer-progress verify` ดูผลจริงและสภาพแวดล้อมที่รันใน [รายงานทดสอบ](test-reports/task17-audit-observer.md)

## Commit ของ Task 17

| Commit | เนื้อหา |
| --- | --- |
| `3bc990a` | PostgreSQL tests ตรวจ atomicity ของธุรกิจและ audit |
| `b07457a` | Immutable event, publisher และการเชื่อม service |
| `69db7d6` | Micrometer registry, AFTER_COMMIT listener และ tests |
| `fc73ce8` | PostgreSQL metrics/rollback, API failure และ concurrency tests |
| Commit เอกสาร | คู่มือ, ADR, test plan, แผนภาพ และรายงานผลทดสอบ |
