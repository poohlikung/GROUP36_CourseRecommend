# Data Dictionary — CourseHub

แหล่งอ้างอิงคือ `code/backend/src/main/resources/db/migration/V1__init_schema.sql` ถึง `V4__review_moderation.sql` ณ 8 ตุลาคม 2026. `V2` เพิ่มข้อมูลตั้งต้น ไม่เพิ่มตารางหรือคอลัมน์. คำว่า nullable/default ด้านล่างอ้าง SQL migration โดยตรง; การตรวจค่าบางอย่างใน Java อาจเข้มกว่า SQL.

## users

| คอลัมน์ | ชนิด | ข้อกำหนด |
| --- | --- | --- |
| id | BIGSERIAL | PK |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL |
| role | VARCHAR(20) | NOT NULL, DEFAULT `LEARNER`, CHECK `LEARNER/ADMIN` |
| status | VARCHAR(20) | NOT NULL, DEFAULT `ACTIVE`, CHECK `ACTIVE/SUSPENDED` |
| created_at, updated_at | TIMESTAMPTZ | DEFAULT `CURRENT_TIMESTAMP`; SQL อนุญาต NULL |

## user_profiles

| คอลัมน์ | ชนิด | ข้อกำหนด |
| --- | --- | --- |
| user_id | BIGINT | PK, FK → `users.id`, ON DELETE CASCADE; shared PK |
| display_name | VARCHAR(100) | NOT NULL |
| bio | VARCHAR(1000) | nullable |
| avatar_path | VARCHAR(255) | nullable; มีใน schema แต่ยังไม่มี API แก้ avatar |

## providers

| คอลัมน์ | ชนิด | ข้อกำหนด |
| --- | --- | --- |
| id | BIGSERIAL | PK |
| name | VARCHAR(100) | NOT NULL |
| slug | VARCHAR(100) | NOT NULL, UNIQUE |
| description | TEXT | nullable |
| website_url | VARCHAR(255) | nullable |
| status | VARCHAR(20) | NOT NULL, DEFAULT `PENDING`, CHECK `PENDING/ACTIVE/SUSPENDED` |
| version | INTEGER | NOT NULL, DEFAULT 0; optimistic lock ใน entity |
| created_at, updated_at | TIMESTAMPTZ | DEFAULT `CURRENT_TIMESTAMP`; SQL อนุญาต NULL |

## provider_members

| คอลัมน์ | ชนิด | ข้อกำหนด |
| --- | --- | --- |
| id | BIGSERIAL | PK |
| provider_id | BIGINT | NOT NULL, FK → `providers.id`, ON DELETE CASCADE |
| user_id | BIGINT | NOT NULL, FK → `users.id`, ON DELETE CASCADE |
| member_role | VARCHAR(20) | NOT NULL, DEFAULT `EDITOR`, CHECK `OWNER/EDITOR` |

UNIQUE (`provider_id`, `user_id`) ชื่อ `uq_provider_member`.

## platforms

| คอลัมน์ | ชนิด | ข้อกำหนด |
| --- | --- | --- |
| id | BIGSERIAL | PK |
| name | VARCHAR(100) | NOT NULL |
| slug | VARCHAR(100) | NOT NULL, UNIQUE |
| allowed_host | VARCHAR(255) | NOT NULL, UNIQUE ตั้งแต่ V5; ใช้ระบุโดเมนของแพลตฟอร์ม |

## courses

| คอลัมน์ | ชนิด | ข้อกำหนด |
| --- | --- | --- |
| id | BIGSERIAL | PK |
| provider_id | BIGINT | NOT NULL, FK → `providers.id`, ON DELETE RESTRICT |
| platform_id | BIGINT | NOT NULL, FK → `platforms.id`, ON DELETE RESTRICT |
| title | VARCHAR(200) | NOT NULL |
| slug | VARCHAR(100) | NOT NULL, UNIQUE |
| description | TEXT | nullable |
| url | VARCHAR(2048) | NOT NULL; ขยายใน V5 เพื่อรองรับลิงก์คอร์สที่มีพารามิเตอร์ |
| level | VARCHAR(20) | NOT NULL, DEFAULT `BEGINNER`, CHECK `BEGINNER/INTERMEDIATE/ADVANCED` |
| language | VARCHAR(20) | NOT NULL, DEFAULT `THAI`, CHECK `THAI/ENGLISH/SUB_THAI` |
| effort_hours | INTEGER | nullable; CHECK NULL หรือ > 0 |
| status | VARCHAR(30) | NOT NULL, DEFAULT `DRAFT`, CHECK `DRAFT/PENDING/PUBLISHED/REVISION_REQUESTED/SUSPENDED/ARCHIVED` |
| version | INTEGER | NOT NULL, DEFAULT 0; optimistic lock |
| moderation_reason | VARCHAR(1000) | nullable; เพิ่มใน V3 |
| created_at, updated_at | TIMESTAMPTZ | DEFAULT `CURRENT_TIMESTAMP`; SQL อนุญาต NULL |

## course_prices

| คอลัมน์ | ชนิด | ข้อกำหนด |
| --- | --- | --- |
| course_id | BIGINT | PK, FK → `courses.id`, ON DELETE CASCADE; shared PK |
| payment_type | VARCHAR(20) | NOT NULL, DEFAULT `FREE`, CHECK `FREE/ONE_TIME/SUBSCRIPTION` |
| amount | DECIMAL(10,2) | nullable; CHECK NULL หรือ ≥ 0 |
| currency | VARCHAR(10) | nullable, DEFAULT `THB` |
| checked_at | TIMESTAMPTZ | nullable, DEFAULT `CURRENT_TIMESTAMP` |

## categories

| คอลัมน์ | ชนิด | ข้อกำหนด |
| --- | --- | --- |
| id | BIGSERIAL | PK |
| name | VARCHAR(100) | NOT NULL |
| slug | VARCHAR(100) | NOT NULL, UNIQUE |

## course_categories

| คอลัมน์ | ชนิด | ข้อกำหนด |
| --- | --- | --- |
| course_id | BIGINT | PK ส่วนที่ 1, NOT NULL, FK → `courses.id`, ON DELETE CASCADE |
| category_id | BIGINT | PK ส่วนที่ 2, NOT NULL, FK → `categories.id`, ON DELETE CASCADE |

## reviews

| คอลัมน์ | ชนิด | ข้อกำหนด |
| --- | --- | --- |
| id | BIGSERIAL | PK |
| course_id | BIGINT | NOT NULL, FK → `courses.id`, ON DELETE CASCADE |
| user_id | BIGINT | NOT NULL, FK → `users.id`, ON DELETE CASCADE |
| overall_score, content_score, teaching_score, difficulty_score | INTEGER | แต่ละคอลัมน์ NOT NULL, CHECK 1–5 |
| body | TEXT | nullable |
| status | VARCHAR(20) | NOT NULL, DEFAULT `PENDING`, CHECK `PENDING/PUBLISHED/REJECTED` |
| version | INTEGER | NOT NULL, DEFAULT 0; เพิ่มใน V4 เพื่อ optimistic lock |
| moderation_reason | VARCHAR(1000) | nullable; เพิ่มใน V4 |
| created_at, updated_at | TIMESTAMPTZ | DEFAULT `CURRENT_TIMESTAMP`; SQL อนุญาต NULL |

UNIQUE (`course_id`, `user_id`) ชื่อ `uq_course_user_review`; ผู้ใช้มีหนึ่งรีวิวต่อคอร์สและแก้รีวิวเดิมได้.

## saved_courses

| คอลัมน์ | ชนิด | ข้อกำหนด |
| --- | --- | --- |
| user_id | BIGINT | PK ส่วนที่ 1, NOT NULL, FK → `users.id`, ON DELETE CASCADE |
| course_id | BIGINT | PK ส่วนที่ 2, NOT NULL, FK → `courses.id`, ON DELETE CASCADE |
| created_at | TIMESTAMPTZ | nullable, DEFAULT `CURRENT_TIMESTAMP` |

## audit_logs

| คอลัมน์ | ชนิด | ข้อกำหนด |
| --- | --- | --- |
| id | BIGSERIAL | PK |
| actor_user_id | BIGINT | NOT NULL, FK → `users.id`, ON DELETE RESTRICT |
| action | VARCHAR(50) | NOT NULL |
| entity_type | VARCHAR(30) | NOT NULL |
| entity_id | BIGINT | NOT NULL; polymorphic reference, ไม่มี FK |
| old_status, new_status | VARCHAR(30) | nullable |
| reason | VARCHAR(1000) | nullable; เพิ่มใน V3 |
| created_at | TIMESTAMPTZ | nullable, DEFAULT `CURRENT_TIMESTAMP` |

## Indexes จาก Flyway

| ชื่อ | ตาราง | คอลัมน์ |
| --- | --- | --- |
| idx_courses_provider_status | courses | provider_id, status |
| idx_courses_catalog | courses | status, created_at, id |
| idx_reviews_course_status | reviews | course_id, status |
| idx_provider_members_user | provider_members | user_id |
| idx_course_categories_cat_course | course_categories | category_id, course_id |
| idx_saved_courses_user_created | saved_courses | user_id, created_at |
| idx_audit_logs_lookup | audit_logs | entity_type, entity_id, created_at |
| idx_reviews_status_created | reviews | status, created_at DESC, id DESC (V4) |

PK/UNIQUE อาจสร้างดัชนีเพิ่มเติมโดย PostgreSQL. ความสัมพันธ์ทั้ง 12 ตารางแสดงใน `doc/diagrams/er-diagram.mmd`.
