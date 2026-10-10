package com.example.courserecommend.audit;

import com.example.courserecommend.domain.entity.AuditLog;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.entity.UserProfile;
import com.example.courserecommend.repository.AuditLogRepository;
import com.example.courserecommend.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class AuditLogQueryServiceTests {
    @Autowired private AuditLogQueryService service;
    @Autowired private AuditLogRepository logs;
    @Autowired private UserRepository users;
    @Autowired private EntityManager entityManager;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void filtersTogetherOrdersByTimeThenIdAndRetainsDeletedSource() {
        User named = new User(UUID.randomUUID() + "@example.test", "unused");
        named.attachProfile(new UserProfile("ผู้ดูแลระบบ"));
        users.saveAndFlush(named);
        User unnamed = users.saveAndFlush(new User(UUID.randomUUID() + "@example.test", "unused"));
        Long first = logs.saveAndFlush(new AuditLog(named, "COURSE_CREATED", "COURSE", 991L, null, "DRAFT")).getId();
        Long second = logs.saveAndFlush(new AuditLog(named, "COURSE_DELETED", "COURSE", 991L, "DRAFT", null)).getId();
        Long third = logs.saveAndFlush(new AuditLog(unnamed, "PROVIDER_CREATED", "PROVIDER", 992L, null, null)).getId();
        Instant time = Instant.parse("2026-01-02T03:04:05Z");
        for (Long id : new Long[] {first, second, third}) {
            jdbc.update("update audit_logs set created_at = ? where id = ?", Timestamp.from(time), id);
        }
        entityManager.clear();

        var all = service.list(new AuditLogFilter(null, null, null, null, null, null), 0, 2);
        assertThat(all.content()).extracting(AuditLogResponse::id).containsExactly(third, second);
        assertThat(all.totalElements()).isEqualTo(3);
        assertThat(all.totalPages()).isEqualTo(2);
        assertThat(all.first()).isTrue();
        assertThat(all.last()).isFalse();
        assertThat(service.list(new AuditLogFilter(null, null, null, null, null, null), 1, 2)
                .content()).extracting(AuditLogResponse::id).containsExactly(first);
        assertThat(service.list(new AuditLogFilter(null, null, null, null, null, null), 2, 2)
                .content()).isEmpty();

        var filtered = service.list(new AuditLogFilter("COURSE", "COURSE_DELETED", named.getId(), 991L,
                time, time.plusSeconds(1)), 0, 10);
        assertThat(filtered.content()).singleElement().satisfies(row -> {
            assertThat(row.id()).isEqualTo(second);
            assertThat(row.actorDisplayName()).isEqualTo("ผู้ดูแลระบบ");
            assertThat(row.oldStatus()).isEqualTo("DRAFT");
            assertThat(row.newStatus()).isNull();
            assertThat(row.reason()).isNull();
        });
        assertThat(service.list(new AuditLogFilter("COURSE", null, null, null,
                time.plusSeconds(1), null), 0, 10).content()).isEmpty();
        assertThat(service.list(new AuditLogFilter(null, null, null, null,
                null, time), 0, 10).content()).isEmpty();
        assertThat(service.list(new AuditLogFilter(null, "PROVIDER_CREATED", unnamed.getId(), 992L,
                null, null), 0, 10).content()).singleElement().satisfies(row -> {
            assertThat(row.actorDisplayName()).isEqualTo("ผู้ใช้ #" + unnamed.getId());
            assertThat(row.oldStatus()).isNull();
            assertThat(row.newStatus()).isNull();
        });
    }
}
