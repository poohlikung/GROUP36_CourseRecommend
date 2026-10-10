package com.example.courserecommend.controller.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/system")
public class SystemController {

    @GetMapping("/liveness")
    public ResponseEntity<Map<String, String>> checkLiveness() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "message", "CourseHub backend is awake and ready"));
    }
}
