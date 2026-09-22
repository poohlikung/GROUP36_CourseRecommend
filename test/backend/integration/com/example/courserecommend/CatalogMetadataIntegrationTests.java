package com.example.courserecommend;

import com.example.courserecommend.domain.entity.Category;
import com.example.courserecommend.domain.entity.Platform;
import com.example.courserecommend.repository.CategoryRepository;
import com.example.courserecommend.repository.PlatformRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CatalogMetadataIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private PlatformRepository platformRepository;

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

        platformRepository.save(Platform.builder()
                .name("Udemy")
                .slug("udemy")
                .allowedHost("udemy.com")
                .build());
        platformRepository.save(Platform.builder()
                .name("Coursera")
                .slug("coursera")
                .allowedHost("coursera.org")
                .build());
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
                .andExpect(jsonPath("$[0].name").value("Coursera"))
                .andExpect(jsonPath("$[0].slug").value("coursera"))
                .andExpect(jsonPath("$[1].name").value("Udemy"));
    }
}
