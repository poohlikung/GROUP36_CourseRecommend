package com.example.courserecommend.course;

import com.example.courserecommend.course.dto.AdminProviderResponse;
import com.example.courserecommend.course.dto.CourseDetailResponse;
import com.example.courserecommend.course.dto.CourseModerationRequest;
import com.example.courserecommend.course.dto.ProviderVerificationRequest;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.domain.enums.ProviderStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminModerationController {
    private final AdminModerationService moderationService;

    @GetMapping("/courses")
    public List<CourseDetailResponse> listCourses(@RequestParam(defaultValue = "PENDING") CourseStatus status) {
        return moderationService.listCourses(status);
    }

    @PostMapping("/courses/{id}/moderation-decisions")
    public CourseDetailResponse decideCourse(@PathVariable Long id,
            @Valid @RequestBody CourseModerationRequest request) {
        return moderationService.decideCourse(id, request);
    }

    @GetMapping("/providers")
    public List<AdminProviderResponse> listProviders(@RequestParam(defaultValue = "PENDING") ProviderStatus status) {
        return moderationService.listProviders(status);
    }

    @PostMapping("/providers/{id}/verification-decisions")
    public AdminProviderResponse decideProvider(@PathVariable Long id,
            @Valid @RequestBody ProviderVerificationRequest request) {
        return moderationService.decideProvider(id, request);
    }
}
