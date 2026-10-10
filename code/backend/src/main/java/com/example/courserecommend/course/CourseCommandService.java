package com.example.courserecommend.course;

import com.example.courserecommend.course.dto.CourseDetailResponse;
import com.example.courserecommend.course.dto.CreateCourseRequest;
import com.example.courserecommend.course.dto.UpdateCourseRequest;

/**
 * งานเปลี่ยนข้อมูลคอร์ส: สร้าง/แก้ไข (UC12), ส่งตรวจ (UC13) และลบ (UC14)
 */
public interface CourseCommandService {

    CourseDetailResponse createCourse(Long providerId, CreateCourseRequest request);

    CourseDetailResponse updateCourse(Long id, UpdateCourseRequest request);

    CourseDetailResponse submitCourse(Long id);

    void deleteCourse(Long id);
}
