package com.example.courserecommend;

import com.example.courserecommend.domain.entity.Category;
import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.entity.CoursePrice;
import com.example.courserecommend.domain.entity.Platform;
import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.enums.CourseLanguage;
import com.example.courserecommend.domain.enums.CourseLevel;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.domain.enums.PaymentType;
import com.example.courserecommend.domain.enums.ProviderStatus;
import com.example.courserecommend.repository.CategoryRepository;
import com.example.courserecommend.repository.CourseRepository;
import com.example.courserecommend.repository.PlatformRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CatalogCourseIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private PlatformRepository platformRepository;

    private Provider provider;
    private Platform platform;
    private Category category;

    @BeforeEach
    void setUp() {
        provider = Provider.builder()
                .name("CourseHub Academy")
                .slug("coursehub-academy")
                .status(ProviderStatus.ACTIVE)
                .build();
        entityManager.persist(provider);

        platform = platformRepository.save(Platform.builder()
                .name("CourseHub Learning")
                .slug("coursehub-learning")
                .allowedHost("learn.coursehub.test")
                .build());

        category = categoryRepository.save(Category.builder()
                .name("Software Development")
                .slug("software-development")
                .build());
    }

    @Test
    void guestCanReadPublishedCoursesWithCardDetails() throws Exception {
        saveCourse("Spring Boot Fundamentals", "spring-boot-fundamentals", CourseStatus.PUBLISHED);
        saveCourse("Draft Course", "draft-course", CourseStatus.DRAFT);

        mockMvc.perform(get("/api/v1/catalog/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Spring Boot Fundamentals"))
                .andExpect(jsonPath("$[0].slug").value("spring-boot-fundamentals"))
                .andExpect(jsonPath("$[0].provider.name").value("CourseHub Academy"))
                .andExpect(jsonPath("$[0].platform.name").value("CourseHub Learning"))
                .andExpect(jsonPath("$[0].price.paymentType").value("FREE"))
                .andExpect(jsonPath("$[0].categories[0].slug").value("software-development"));
    }

    @Test
    void guestCanFilterCoursesBySearchCategoryAndPlatform() throws Exception {
        saveCourse("Spring Boot Fundamentals", "spring-boot-fundamentals", CourseStatus.PUBLISHED);

        Platform otherPlatform = platformRepository.save(Platform.builder()
                .name("Video Academy")
                .slug("video-academy")
                .allowedHost("video-academy.test")
                .build());
        Category otherCategory = categoryRepository.save(Category.builder()
                .name("Data Analytics")
                .slug("data-analytics")
                .build());
        saveCourse(
                "Data Analytics Essentials",
                "data-analytics-essentials",
                CourseStatus.PUBLISHED,
                otherPlatform,
                otherCategory);

        mockMvc.perform(get("/api/v1/catalog/courses")
                        .queryParam("q", "spring")
                        .queryParam("category", "software-development")
                        .queryParam("platform", "coursehub-learning"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].slug").value("spring-boot-fundamentals"));
    }

    private void saveCourse(String title, String slug, CourseStatus status) {
        saveCourse(title, slug, status, platform, category);
    }

    private void saveCourse(
            String title,
            String slug,
            CourseStatus status,
            Platform coursePlatform,
            Category courseCategory) {
        Course course = Course.builder()
                .provider(provider)
                .platform(coursePlatform)
                .title(title)
                .slug(slug)
                .description("Learn the foundations with practical examples.")
                .url("https://learn.coursehub.test/courses/" + slug)
                .level(CourseLevel.BEGINNER)
                .language(CourseLanguage.THAI)
                .effortHours(12)
                .status(status)
                .build();
        course.getCategories().add(courseCategory);

        CoursePrice price = CoursePrice.builder()
                .course(course)
                .paymentType(PaymentType.FREE)
                .amount(BigDecimal.ZERO)
                .currency("THB")
                .build();
        course.setPrice(price);

        courseRepository.saveAndFlush(course);
    }
}
