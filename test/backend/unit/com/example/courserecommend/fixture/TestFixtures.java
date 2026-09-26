
// ไฟล์นี้ทำหน้าที่รวมข้อมูลตัวอย่างที่ถูกต้องไว้จุดเดียว Test ใหม่จะไม่ต้องเขียนอีเมล รหัสผ่าน และชื่อซ้ำกันทุกไฟล์เด้อ

package com.example.courserecommend.fixture;

import com.example.courserecommend.auth.dto.LoginRequest;
import com.example.courserecommend.auth.dto.RegisterRequest;
import com.example.courserecommend.profile.dto.UpdateProfileRequest;

public final class TestFixtures {

    public static final String VALID_EMAIL = "learner@example.com";
    public static final String VALID_PASSWORD = "safe-password";
    public static final String VALID_DISPLAY_NAME = "CourseHub Learner";
    public static final String VALID_BIO = "สนใจเรียนรู้การพัฒนาซอฟต์แวร์";

    private TestFixtures() {
        // Utility class ไม่ควรถูกสร้างเป็น object
    }

    public static RegisterRequest validRegisterRequest() {
        return new RegisterRequest(
                VALID_EMAIL,
                VALID_PASSWORD,
                VALID_DISPLAY_NAME);
    }

    public static LoginRequest validLoginRequest() {
        return new LoginRequest(
                VALID_EMAIL,
                VALID_PASSWORD);
    }

    public static UpdateProfileRequest validUpdateProfileRequest() {
        return new UpdateProfileRequest(
                VALID_DISPLAY_NAME,
                VALID_BIO);
    }
}