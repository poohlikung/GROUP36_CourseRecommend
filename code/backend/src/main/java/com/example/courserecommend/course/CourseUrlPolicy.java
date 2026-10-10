package com.example.courserecommend.course;

import com.example.courserecommend.domain.entity.Platform;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.IDN;
import java.util.Locale;

/**
 * Validate an external course link and match its host to a platform.
 */
@Component
public class CourseUrlPolicy {

    public void requireAllowedUrl(String rawUrl, Platform platform) {
        String normalizedHost = requireValidHost(rawUrl);
        String allowedHost = platform.getAllowedHost();
        if (allowedHost == null || allowedHost.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "แพลตฟอร์มไม่มีโดเมนที่ตรวจสอบได้");
        }
        if (!matchesHost(normalizedHost, allowedHost)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "URL คอร์สต้องตรงกับโดเมนของแพลตฟอร์ม (" + allowedHost + ")");
        }
    }

    public String requireValidHost(String rawUrl) {
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
        if (!"https".equalsIgnoreCase(scheme)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL ต้องขึ้นต้นด้วย https://");
        }
        if (uri.getRawUserInfo() != null || uri.getRawAuthority() == null || uri.getRawAuthority().contains("@")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL ไม่ถูกต้อง");
        }
        String host = uri.getHost();
        if (host == null && !uri.getRawAuthority().contains(":")) {
            host = uri.getRawAuthority();
        }
        if (host == null || host.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL ไม่ถูกต้อง");
        }
        try {
            host = IDN.toASCII(host, IDN.USE_STD3_ASCII_RULES).toLowerCase(Locale.ROOT);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "โดเมนของ URL ไม่ถูกต้อง");
        }
        if (!host.contains(".") || host.endsWith(".") || host.length() > 255
                || host.equals("localhost") || host.endsWith(".localhost")
                || host.endsWith(".local") || host.matches("[0-9.]+")
                || !host.matches("[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?(?:\\.[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?)+")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาใช้โดเมนเว็บไซต์สาธารณะ");
        }
        return host;
    }

    public boolean matchesHost(String host, String allowedHost) {
        String normalizedAllowedHost = allowedHost.toLowerCase(Locale.ROOT);
        return host.equals(normalizedAllowedHost) || host.endsWith("." + normalizedAllowedHost);
    }
}
