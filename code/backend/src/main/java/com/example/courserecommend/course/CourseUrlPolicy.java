package com.example.courserecommend.course;

import com.example.courserecommend.domain.entity.Platform;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.Locale;

/**
 * กฎ: ลิงก์คอร์สต้องเป็น http(s) และ host ต้องเป็น allowed_host ของ Platform หรือ subdomain ของมัน
 */
@Component
public class CourseUrlPolicy {

    public void requireAllowedUrl(String rawUrl, Platform platform) {
        if (rawUrl == null || rawUrl.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL ต้องไม่ว่างเปล่า");
        }
        URI uri;
        try {
            uri = URI.create(rawUrl.trim());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "รูปแบบ URL ไม่ถูกต้อง");
        }
        String scheme = uri.getScheme();
        if (scheme == null || (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL ต้องขึ้นต้นด้วย http:// หรือ https://");
        }
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL ไม่ถูกต้อง");
        }
        String allowedHost = platform.getAllowedHost();
        if (allowedHost == null || allowedHost.isBlank()) {
            return;
        }
        String normalizedHost = host.toLowerCase(Locale.ROOT);
        String normalizedAllowedHost = allowedHost.toLowerCase(Locale.ROOT);
        if (!normalizedHost.equals(normalizedAllowedHost) && !normalizedHost.endsWith("." + normalizedAllowedHost)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "URL คอร์สต้องตรงกับโดเมนของแพลตฟอร์ม (" + allowedHost + ")");
        }
    }
}
