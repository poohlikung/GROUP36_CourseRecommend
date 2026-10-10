package com.example.courserecommend;

import com.example.courserecommend.domain.entity.Category;
import com.example.courserecommend.domain.entity.Platform;
import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.domain.enums.ProviderStatus;
import com.example.courserecommend.repository.CategoryRepository;
import com.example.courserecommend.repository.CourseRepository;
import com.example.courserecommend.repository.PlatformRepository;
import com.example.courserecommend.repository.ProviderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CatalogMetadataIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private PlatformRepository platformRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private ProviderRepository providerRepository;

    @BeforeEach
    void setUp() {
        categoryRepository.deleteAll();
        platformRepository.deleteAll();

        categoryRepository.save(Category.builder()
                .name("Web Development")
                .slug("web-development")
                .build());
        categoryRepository.save(Category.builder()
                .name("Data Science")
                .slug("data-science")
                .build());

        Platform udemy = platformRepository.save(Platform.builder()
                .name("Udemy")
                .slug("udemy")
                .allowedHost("udemy.com")
                .build());
        Platform coursera = platformRepository.save(Platform.builder()
                .name("Coursera")
                .slug("coursera")
                .allowedHost("coursera.org")
                .build());
        Platform draftOnly = platformRepository.save(Platform.builder()
                .name("Unpublished Site")
                .slug("unpublished-site")
                .allowedHost("unpublished.example")
                .build());
        Provider provider = providerRepository.save(Provider.builder()
                .name("Catalog Metadata Provider")
                .slug("catalog-metadata-provider")
                .status(ProviderStatus.ACTIVE)
                .build());
        courseRepository.save(Course.builder().provider(provider).platform(coursera)
                .title("Coursera course").slug("catalog-metadata-coursera")
                .url("https://coursera.org/course").status(CourseStatus.PUBLISHED).build());
        courseRepository.save(Course.builder().provider(provider).platform(udemy)
                .title("Udemy course").slug("catalog-metadata-udemy")
                .url("https://udemy.com/course").status(CourseStatus.PUBLISHED).build());
        courseRepository.save(Course.builder().provider(provider).platform(draftOnly)
                .title("Unpublished course").slug("catalog-metadata-draft")
                .url("https://unpublished.example/course").status(CourseStatus.DRAFT).build());
    }

    @Test
    void guestCanReadCategoriesSortedByName() throws Exception {
        mockMvc.perform(get("/api/v1/catalog/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Data Science"))
                .andExpect(jsonPath("$[0].slug").value("data-science"))
                .andExpect(jsonPath("$[1].name").value("Web Development"));
    }

    @Test
    void guestCanReadPlatformsSortedByName() throws Exception {
        mockMvc.perform(get("/api/v1/catalog/platforms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Coursera"))
                .andExpect(jsonPath("$[0].slug").value("coursera"))
                .andExpect(jsonPath("$[1].name").value("Udemy"));
    }
}
