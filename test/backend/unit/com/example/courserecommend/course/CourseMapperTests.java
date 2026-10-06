package com.example.courserecommend.course;

import com.example.courserecommend.course.dto.CourseDetailResponse;
import com.example.courserecommend.domain.entity.Category;
import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.entity.CoursePrice;
import com.example.courserecommend.domain.entity.Platform;
import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.domain.enums.PaymentType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class CourseMapperTests {

    private final CourseMapper mapper = new CourseMapper();

    @Test
    void mapsCourseWithPriceAndCategories() {
        Course course = course();
        course.setPrice(CoursePrice.builder().course(course)
                .paymentType(PaymentType.ONE_TIME).amount(new BigDecimal("1290.00")).currency("THB").build());
        course.setCategories(Set.of(Category.builder().id(3L).name("Web").slug("web").build()));

        CourseDetailResponse response = mapper.toDetailResponse(course);

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.providerSlug()).isEqualTo("acme");
        assertThat(response.platformSlug()).isEqualTo("coursera");
        assertThat(response.status()).isEqualTo(CourseStatus.DRAFT);
        assertThat(response.paymentType()).isEqualTo(PaymentType.ONE_TIME);
        assertThat(response.amount()).isEqualByComparingTo("1290.00");
        assertThat(response.categories()).extracting(CourseDetailResponse.CategorySummary::slug).containsExactly("web");
    }

    @Test
    void keepsUnknownPriceAsNull() {
        Course course = course();
        course.setPrice(CoursePrice.builder().course(course).paymentType(PaymentType.SUBSCRIPTION).amount(null).build());

        assertThat(mapper.toDetailResponse(course).amount()).isNull();
    }

    @Test
    void defaultsToFreeWhenCourseHasNoPrice() {
        CourseDetailResponse response = mapper.toDetailResponse(course());

        assertThat(response.paymentType()).isEqualTo(PaymentType.FREE);
        assertThat(response.amount()).isEqualByComparingTo("0");
        assertThat(response.currency()).isEqualTo("THB");
        assertThat(response.categories()).isEmpty();
    }

    private Course course() {
        return Course.builder()
                .id(10L)
                .provider(Provider.builder().id(1L).name("Acme").slug("acme").build())
                .platform(Platform.builder().id(2L).name("Coursera").slug("coursera").allowedHost("coursera.org").build())
                .title("Java")
                .slug("java")
                .url("https://coursera.org/java")
                .build();
    }
}
