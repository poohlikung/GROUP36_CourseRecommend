package com.example.courserecommend.course;

import com.example.courserecommend.course.dto.CourseDetailResponse;
import com.example.courserecommend.course.dto.CreateCourseRequest;
import com.example.courserecommend.course.dto.UpdateCourseRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class CourseController {

    private final CourseQueryService courseQueryService;
    private final CourseCommandService courseCommandService;

    @PostMapping("/providers/{providerId}/courses")
    public ResponseEntity<CourseDetailResponse> createCourse(
            @PathVariable Long providerId,
            @Valid @RequestBody CreateCourseRequest request) {
        CourseDetailResponse response = courseCommandService.createCourse(providerId, request);
        return ResponseEntity
                .created(URI.create("/api/v1/courses/" + response.id()))
                .body(response);
    }

    @GetMapping("/providers/{providerId}/courses")
    public ResponseEntity<List<CourseDetailResponse>> listProviderCourses(
            @PathVariable Long providerId) {
        return ResponseEntity.ok(courseQueryService.listCoursesByProvider(providerId));
    }

    @GetMapping("/courses/{id}")
    public ResponseEntity<CourseDetailResponse> getCourse(
            @PathVariable Long id) {
        return ResponseEntity.ok(courseQueryService.getCourse(id));
    }

    @PutMapping("/courses/{id}")
    public ResponseEntity<CourseDetailResponse> updateCourse(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCourseRequest request) {
        return ResponseEntity.ok(courseCommandService.updateCourse(id, request));
    }

    @PostMapping("/courses/{id}/submissions")
    public ResponseEntity<CourseDetailResponse> submitCourse(
            @PathVariable Long id) {
        return ResponseEntity.ok(courseCommandService.submitCourse(id));
    }

    @DeleteMapping("/courses/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> deleteCourse(
            @PathVariable Long id) {
        courseCommandService.deleteCourse(id);
        return ResponseEntity.noContent().build();
    }
}
