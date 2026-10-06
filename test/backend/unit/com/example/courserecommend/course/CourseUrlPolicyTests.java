package com.example.courserecommend.course;

import com.example.courserecommend.domain.entity.Platform;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CourseUrlPolicyTests {

    private final CourseUrlPolicy policy = new CourseUrlPolicy();
    private final Platform coursera = Platform.builder().name("Coursera").slug("coursera").allowedHost("coursera.org").build();

    @Test
    void acceptsExactHostAndSubdomain() {
        assertThatCode(() -> policy.requireAllowedUrl("https://coursera.org/learn/java", coursera)).doesNotThrowAnyException();
        assertThatCode(() -> policy.requireAllowedUrl("https://www.coursera.org/learn/java", coursera)).doesNotThrowAnyException();
        assertThatCode(() -> policy.requireAllowedUrl("HTTP://WWW.COURSERA.ORG/x", coursera)).doesNotThrowAnyException();
    }

    @Test
    void rejectsOtherHostsIncludingLookAlikes() {
        assertBadRequest("https://udemy.com/course/java");
        assertBadRequest("https://evilcoursera.org/learn");
        assertBadRequest("https://coursera.org.evil.com/learn");
        assertBadRequest("https://coursera.org@evil.com/learn");
    }

    @Test
    void rejectsNonHttpSchemesAndMalformedUrls() {
        assertBadRequest("javascript:alert(1)");
        assertBadRequest("ftp://coursera.org/file");
        assertBadRequest("https://coursera.org/has space");
        assertBadRequest("   ");
        assertBadRequest(null);
    }

    @Test
    void allowsAnyHttpHostWhenPlatformHasNoAllowedHost() {
        Platform open = Platform.builder().name("Other").slug("other").allowedHost(" ").build();
        assertThatCode(() -> policy.requireAllowedUrl("https://example.com/course", open)).doesNotThrowAnyException();
    }

    private void assertBadRequest(String url) {
        assertThatThrownBy(() -> policy.requireAllowedUrl(url, coursera))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }
}
