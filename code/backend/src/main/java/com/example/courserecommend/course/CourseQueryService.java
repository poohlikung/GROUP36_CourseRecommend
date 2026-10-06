package com.example.courserecommend.course;

import com.example.courserecommend.course.dto.CourseDetailResponse;

import java.util.List;

/**
 * งานอ่านข้อมูลคอร์ส (UC12) แยกจากงานเปลี่ยนข้อมูลตามหลัก Interface Segregation
 */
public interface CourseQueryService {

    CourseDetailResponse getCourse(Long id);

    List<CourseDetailResponse> listCoursesByProvider(Long providerId);
}
