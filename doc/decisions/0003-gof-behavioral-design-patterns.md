# 0003: การเลือกใช้ GoF Behavioral Design Patterns 3 รูปแบบ

- **สถานะ:** ยอมรับ (Accepted)
- **วันที่:** 15 กันยายน 2026
- **ผู้ตัดสินใจ:** ทีมพัฒนา กลุ่ม 36

---

## 1. บริบทและปัญหา (Context)
ตามข้อกำหนดวิชา CP353002 ในส่วนของ **GoF Design Patterns (ข้อ 5.2)**:
1. กำหนดให้เลือกใช้งาน Pattern จาก 1 กลุ่ม (Creational, Structural, หรือ Behavioral)
2. ภายในกลุ่มที่เลือก ต้องนำมาใช้งานจริงอย่างน้อย 3 รูปแบบ
3. มีข้อห้ามอย่างเด็ดขาด: "ห้ามยัด Pattern มั่ว ๆ เพื่อให้ครบ หากไม่มีความจำเป็นทางธุรกิจจริงจะถูกหักคะแนน"

ระบบ CourseHub มีความต้องการทางธุรกิจที่มีความซับซ้อนในเชิงพฤติกรรม (Behavioral Interactions) ของคอร์ส การให้คะแนน และการแจ้งเตือน จึงเหมาะกับการเลือกกลุ่ม Behavioral Patterns

---

## 2. การตัดสินใจ (Decision)
ทีมตัดสินใจเลือกกลุ่ม **Behavioral Design Patterns** โดยเลือกใช้งาน 3 รูปแบบที่ตอบโจทย์ความต้องการของระบบ CourseHub อย่างแท้จริง ได้แก่:

### 1. Strategy Pattern — ระบบคำนวณและแนะนำคอร์ส (Course Matcher)
- **ปัญหาจริง:** ผู้เรียนแต่ละคนให้ความสำคัญกับปัจจัยต่างกัน เช่น งบประมาณ (Budget), เวลาในการเรียน (Effort), หรือคะแนนรีวิว (Quality) และในอนาคตต้องการเพิ่มสูตรคำนวณใหม่ได้โดยไม่แก้โค้ดเดิม (Open/Closed Principle)
- **การนำไปใช้:**
  - สร้าง Interface `ScoringStrategy`
  - คลาสกลยุทธ์ย่อย: `BudgetFitStrategy`, `EffortFitStrategy`, `ReviewQualityStrategy`
  - คลาสผู้เรียก: `CourseMatcherService` ใช้การฉีดคอลเลกชันของ Strategy ผ่าน Constructor

### 2. State Pattern — วงจรชีวิตและสถานะของคอร์ส (Course Lifecycle State)
- **ปัญหาจริง:** คอร์สเรียนมีวงจรชีวิตหลายสถานะ (Draft, Pending, Published, Suspended, Archived) ซึ่งในแต่ละสถานะมีข้อจำกัดในการกระทำที่แตกต่างกัน หากใช้ `if-else` หรือ `switch-case` เช็คสถานะ โค้ดจะยาวและซับซ้อนมาก
- **การนำไปใช้:**
  - อินเตอร์เฟส `CourseWorkflowState`
  - คลาสสถานะ: `DraftState`, `PendingState`, `PublishedState`, `SuspendedState`, `ArchivedState`
  - จัดการการเปลี่ยนสถานะ (State Transition) และป้องกันการกระทำที่ไม่อนุญาตในแต่ละสถานะอย่างเป็นสัดส่วน

**สถานะการทำจริง (6 ตุลาคม 2026):** Task 15 มี `CourseWorkflowState` และ State ทั้ง 6 สถานะใน `code/backend/src/main/java/com/example/courserecommend/course/workflow/` พร้อม `CourseWorkflowTests` และ `doc/diagrams/course-state.mmd`; Task 17 เพิ่ม Observer ตามรายละเอียดด้านล่าง ส่วน Strategy ยังเป็นแผนของ Task 19

### 3. Observer Pattern — ระบบตรวจจับและติดตามเหตุการณ์ (Metrics & Event Handling)
- **ปัญหาจริง:** เมื่อคอร์สเรียนมีการเปลี่ยนสถานะสำคัญ (เช่น จากตรวจผ่านไปเป็น Published หรือถูกสั่งระงับ) ระบบจำเป็นต้องบันทึกสถิติ (Metrics) และทำงานเบื้องหลัง โดยไม่ต้องการให้ Service หลักต้องผูกติด (Tight Coupling) กับระบบติดตามเหล่านั้น
- **การนำไปใช้:**
  - ใช้ `CourseStatusChangedEvent` เพื่อส่งสัญญาณเหตุการณ์
  - คลาส Publisher: `CourseEventPublisher`
  - คลาส Listener / Observer: `CourseMetricsListener` (ทำงานแบบ `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`)

**สถานะการทำจริง (Task 17, 6 ตุลาคม 2026):**
- Event เป็น immutable record เก็บ course ID, actor ID, action และสถานะก่อน–หลัง โดยไม่อ้างอิง JPA entity
- `CourseEventPublisher` ห่อ Spring `ApplicationEventPublisher` และใช้ `Propagation.MANDATORY` เพื่อร่วม transaction ของ service
- `CourseServiceImpl` และ `CourseModerationServiceImpl` ส่ง event หลังบันทึก audit เฉพาะการเปลี่ยนสถานะจริง; การสร้าง/ลบคอร์ส การแก้ข้อมูลที่สถานะเดิม และการเปลี่ยน Provider ไม่ส่ง event นี้
- AuditLog เป็นข้อมูลถาวรที่ต้องเขียนใน transaction เดียวกับธุรกิจ การส่ง event ไม่ได้ยืนยันว่าธุรกรรม commit แล้ว
- `CourseMetricsListener` นับ Micrometer counter `course.status.transitions` หลัง commit แบบ synchronous ใช้ tags `action`, `from`, `to`; rollback และ event ที่ไม่มี transaction ไม่ถูกนับ
- Listener จับ `RuntimeException` จากการสร้าง/increment counter แล้ว log event context กับ stack trace เพื่อไม่ให้ผู้ใช้ได้รับข้อผิดพลาดหลังธุรกิจ commit สำเร็จ
- `MetricsConfig` ใช้ `SimpleMeterRegistry` เมื่อไม่มี registry อื่น เป็นสถิติภายใน process ที่ reset เมื่อ restart และไม่มี HTTP endpoint
- หลักฐานอยู่ใน [คู่มือ Task 17](../task17-audit-observer-guide.md), [รายงานทดสอบ](../test-reports/task17-audit-observer.md), [Class Diagram](../diagrams/course-observer-class.mmd) และ [Sequence Diagram](../diagrams/course-observer-sequence.mmd)

---

## 3. ผลลัพธ์และข้อพิจารณา (Consequences)

### ข้อดี:
- State และ Observer มี implementation แล้ว; เมื่อทำ Strategy ครบ จะตรงเกณฑ์ GoF 3 Patterns ในกลุ่มเดียวกัน (Behavioral)
- แก้ปัญหาทางธุรกิจจริง ไม่ใช่การยัดเยียด Pattern เพื่อการสอบ
- เป็นไปตามหลักการ SOLID (โดยเฉพาะ OCP, SRP และ DIP)
- State มี Unit Test และ State Diagram; Observer มี unit/integration tests, Class Diagram และ Sequence Diagram ส่วนหลักฐาน Strategy ต้องตาม Task 19

### ข้อจำกัด / สิ่งที่ต้องระวัง:
- จำนวนคลาสในระบบเพิ่มขึ้น
- ผู้พัฒนาทุกคนในทีมต้องทำความเข้าใจการไหลของการทำงาน (Data Flow) เพื่ออธิบายตอนสอบนำเสนอได้
- Metrics เป็น best-effort ไม่มี retry/replay หรือการกู้คืน event หลัง process crash จึงใช้แทน AuditLog หรือจำนวนคอร์สปัจจุบันในฐานข้อมูลไม่ได้
