package com.example.courserecommend.bookmark;

import com.example.courserecommend.catalog.CatalogCourseService;
import com.example.courserecommend.catalog.dto.CatalogCourseResponse;
import com.example.courserecommend.catalog.dto.CatalogPageResponse;
import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.domain.enums.ProviderStatus;
import com.example.courserecommend.repository.CourseRepository;
import com.example.courserecommend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BookmarkService {
    private final SavedCourseRepository savedCourseRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final CatalogCourseService catalogCourseService;

    @Transactional
    public void save(String email, Long courseId) {
        Long userId = userId(email);
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบคอร์ส"));
        if (course.getStatus() != CourseStatus.PUBLISHED
                || course.getProvider().getStatus() != ProviderStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบคอร์ส");
        }
        savedCourseRepository.insertIfAbsent(userId, courseId);
    }

    @Transactional
    public void remove(String email, Long courseId) {
        savedCourseRepository.deleteBookmark(userId(email), courseId);
    }

    @Transactional(readOnly = true)
    public List<Long> savedIds(String email, List<Long> courseIds) {
        if (courseIds.isEmpty()) return List.of();
        return savedCourseRepository.findSavedIds(userId(email), courseIds);
    }

    @Transactional(readOnly = true)
    public CatalogPageResponse<CatalogCourseResponse> list(String email, int page, int size) {
        Page<Long> ids = savedCourseRepository.findVisibleCourseIds(userId(email),
                CourseStatus.PUBLISHED, ProviderStatus.ACTIVE,
                PageRequest.of(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id.courseId"))));
        return new CatalogPageResponse<>(catalogCourseService.mapCoursesInPageOrder(ids.getContent()),
                ids.getNumber(), ids.getSize(), ids.getTotalElements(), ids.getTotalPages(),
                ids.isFirst(), ids.isLast());
    }

    private Long userId(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "กรุณาเข้าสู่ระบบ"));
        return user.getId();
    }
}
