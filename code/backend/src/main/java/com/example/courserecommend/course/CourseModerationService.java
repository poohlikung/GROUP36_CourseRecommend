package com.example.courserecommend.course;

import com.example.courserecommend.course.dto.CourseDetailResponse;
import com.example.courserecommend.course.dto.CourseModerationRequest;
import com.example.courserecommend.domain.enums.CourseStatus;

import java.util.List;

public interface CourseModerationService {
    List<CourseDetailResponse> listCourses(CourseStatus status);

    CourseDetailResponse decideCourse(Long id, CourseModerationRequest request);
}
