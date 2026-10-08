package com.example.courserecommend;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.Container.ExecResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.MountableFile;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ซ้อม backup/restore ตามขั้นตอนใน doc/task24-backup-restore-guide.md
 * ฐานต้นทาง migrate ด้วย Flyway และมีข้อมูลเพิ่มจาก seed จากนั้น pg_dump แล้ว pg_restore ลงฐานว่างอีกตัว
 * แล้วตรวจว่าข้อมูล ประวัติ migration และ sequence ใช้งานต่อได้เหมือนต้นทาง
 */
@Testcontainers
class BackupRestoreRehearsalIntegrationTests {

    private static final String DUMP_IN_CONTAINER = "/tmp/coursehub.dump";

    @Container
    static final PostgreSQLContainer<?> SOURCE = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("courserecommend")
            .withUsername("postgres")
            .withPassword("test-password");

    @Container
    static final PostgreSQLContainer<?> RESTORED = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("coursehub_restore")
            .withUsername("postgres")
            .withPassword("test-password");

    @TempDir
    static Path tempDir;

    private static JdbcTemplate source;
    private static JdbcTemplate restored;
    private static long rehearsalCourseId;

    @BeforeAll
    static void backupSourceAndRestoreIntoEmptyDatabase() throws Exception {
        source = jdbc(SOURCE);
        restored = jdbc(RESTORED);

        flyway(SOURCE).migrate();
        rehearsalCourseId = insertRehearsalCourse();

        ExecResult dump = SOURCE.execInContainer("pg_dump",
                "-U", SOURCE.getUsername(), "-d", SOURCE.getDatabaseName(),
                "--format=custom", "--no-owner", "--no-acl", "--file=" + DUMP_IN_CONTAINER);
        assertThat(dump.getExitCode()).as(dump.getStderr()).isZero();

        Path dumpFile = tempDir.resolve("coursehub.dump");
        SOURCE.copyFileFromContainer(DUMP_IN_CONTAINER, dumpFile.toString());
        assertThat(Files.size(dumpFile)).isPositive();
        RESTORED.copyFileToContainer(MountableFile.forHostPath(dumpFile), DUMP_IN_CONTAINER);

        ExecResult restore = RESTORED.execInContainer("pg_restore",
                "-U", RESTORED.getUsername(), "-d", RESTORED.getDatabaseName(),
                "--no-owner", "--no-acl", "--exit-on-error", DUMP_IN_CONTAINER);
        assertThat(restore.getExitCode()).as(restore.getStderr()).isZero();
    }

    @Test
    void restoredDatabaseHasSameRowCountsInEveryTable() {
        List<Map<String, Object>> sourceCounts = rowCounts(source);

        assertThat(sourceCounts).hasSizeGreaterThanOrEqualTo(13); // 12 ตารางของระบบ + flyway_schema_history
        assertThat(rowCounts(restored)).isEqualTo(sourceCounts);
    }

    @Test
    void restoredDatabaseKeepsCourseWithItsPriceAndCategories() {
        String courseSql = """
                SELECT c.slug, c.status, p.slug AS provider_slug, cp.payment_type, cp.amount, cp.currency,
                       (SELECT string_agg(cat.slug, ',' ORDER BY cat.slug)
                        FROM course_categories cc JOIN categories cat ON cat.id = cc.category_id
                        WHERE cc.course_id = c.id) AS categories
                FROM courses c
                JOIN providers p ON p.id = c.provider_id
                JOIN course_prices cp ON cp.course_id = c.id
                WHERE c.id = ?
                """;

        Map<String, Object> original = source.queryForMap(courseSql, rehearsalCourseId);
        assertThat(restored.queryForMap(courseSql, rehearsalCourseId)).isEqualTo(original);
        assertThat(original.get("categories")).isEqualTo("data-science-ai,programming");
    }

    @Test
    void restoredDatabaseIsAlreadyMigratedSoFlywayDoesNothing() {
        String historySql = """
                SELECT version, description, checksum, success
                FROM flyway_schema_history ORDER BY installed_rank
                """;
        assertThat(restored.queryForList(historySql)).isEqualTo(source.queryForList(historySql));

        Flyway restoredFlyway = flyway(RESTORED);
        restoredFlyway.validate();
        MigrateResult result = restoredFlyway.migrate();

        assertThat(result.migrationsExecuted).isZero();
    }

    @Test
    void restoredSequencesContinueAfterExistingIds() {
        Long maxProviderId = restored.queryForObject("SELECT max(id) FROM providers", Long.class);

        Long newProviderId = restored.queryForObject("""
                INSERT INTO providers (name, slug, status)
                VALUES ('After Restore', 'after-restore', 'PENDING')
                RETURNING id
                """, Long.class);
        try {
            assertThat(newProviderId).isGreaterThan(maxProviderId);
        } finally {
            // ลบทิ้งเพื่อไม่ให้กระทบเทสต์ที่เทียบจำนวนแถว
            restored.update("DELETE FROM providers WHERE id = ?", newProviderId);
        }
    }

    private static long insertRehearsalCourse() {
        long providerId = source.queryForObject("""
                INSERT INTO providers (name, slug, status)
                VALUES ('Backup Rehearsal Institute', 'backup-rehearsal-institute', 'ACTIVE')
                RETURNING id
                """, Long.class);
        long platformId = source.queryForObject("SELECT id FROM platforms WHERE slug = 'chula-mooc'", Long.class);
        long courseId = source.queryForObject("""
                INSERT INTO courses (provider_id, platform_id, title, slug, url, status)
                VALUES (?, ?, 'Backup Rehearsal Course', 'backup-rehearsal-course',
                        'https://mooc.chula.ac.th/backup-rehearsal', 'PUBLISHED')
                RETURNING id
                """, Long.class, providerId, platformId);
        source.update("""
                INSERT INTO course_prices (course_id, payment_type, amount, currency)
                VALUES (?, 'ONE_TIME', 1290.00, 'THB')
                """, courseId);
        source.update("""
                INSERT INTO course_categories (course_id, category_id)
                SELECT ?, id FROM categories WHERE slug IN ('programming', 'data-science-ai')
                """, courseId);
        return courseId;
    }

    // นับแถวจริงทุกตารางใน schema public (ใช้ SQL เดียวกับสคริปต์ code/scripts/db)
    private static List<Map<String, Object>> rowCounts(JdbcTemplate jdbc) {
        return jdbc.queryForList("""
                SELECT table_name,
                       (xpath('/row/c/text()', query_to_xml(
                           format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name),
                           false, true, '')))[1]::text::bigint AS row_count
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                ORDER BY table_name
                """);
    }

    private static Flyway flyway(PostgreSQLContainer<?> container) {
        return Flyway.configure()
                .dataSource(container.getJdbcUrl(), container.getUsername(), container.getPassword())
                .locations("classpath:db/migration")
                .load();
    }

    private static JdbcTemplate jdbc(PostgreSQLContainer<?> container) {
        return new JdbcTemplate(new DriverManagerDataSource(
                container.getJdbcUrl(), container.getUsername(), container.getPassword()));
    }
}
