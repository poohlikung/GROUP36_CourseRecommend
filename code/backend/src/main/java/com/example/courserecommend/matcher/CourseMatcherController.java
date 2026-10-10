package com.example.courserecommend.matcher;

import com.example.courserecommend.common.ApiErrorResponse;
import com.example.courserecommend.matcher.dto.CourseMatchRequest;
import com.example.courserecommend.matcher.dto.CourseMatchesResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/course-matches")
@Tag(name = "Course matcher", description = "แนะนำคอร์สด้วย Budget, Effort และ Review Quality Strategy")
public class CourseMatcherController {
    private final CourseMatcherService matcherService;

    public CourseMatcherController(CourseMatcherService matcherService) {
        this.matcherService = matcherService;
    }

    @PostMapping
    @Operation(summary = "จับคู่คอร์สสูงสุด 3 อันดับ",
            description = "ทุกคนเรียกได้ ไม่ต้องล็อกอิน แต่ต้องมี CSRF cookie และ header; กรองหมวดหมู่/ระดับ/ภาษา/งบก่อนคิดคะแนน "
                    + "ใช้คะแนนเฉลี่ยน้ำหนักเท่ากัน 0–100 และตั้งเป้าจบใน 4 สัปดาห์; ไม่พบคอร์สคืน matches ว่างพร้อม constraints โดยไม่ผ่อนเงื่อนไข",
            parameters = @Parameter(name = "X-XSRF-TOKEN", in = ParameterIn.HEADER, required = true,
                    description = "Token จาก GET /api/v1/auth/csrf; ส่ง XSRF-TOKEN cookie จากคำขอเดียวกันด้วย"))
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "ผลจับคู่พร้อมคะแนน/เหตุผล หรือรายการว่างพร้อมข้อจำกัด"),
            @ApiResponse(responseCode = "400", description = "ข้อมูลไม่ถูกต้องหรือหมวดหมู่ไม่มีจริง",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "CSRF token ไม่มีหรือไม่ถูกต้อง",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Session ที่ส่งมาหมดอายุหรือบัญชีถูกระงับ",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<CourseMatchesResponse> match(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true,
                    content = @Content(examples = @ExampleObject(name = "match", value = """
                            {"categorySlug":"programming","level":"BEGINNER","language":"THAI","budgetThb":1000.00,"hoursPerWeek":4}
                            """)))
            @Valid @RequestBody CourseMatchRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(matcherService.match(request.toPreferences()));
    }
}
